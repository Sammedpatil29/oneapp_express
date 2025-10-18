
const Ride = require('../models/rideModel')
const Rider = require('../models/ridersModel')
const verifyUserJwtToken = require('../utils/jwttoken')
const { Op } = require('sequelize');
const io = require('../app');

// Core logic — no req/res
async function createRide(data) {
  const { token, trip_details, service_details, raider_details } = data;
  
  
  if (!trip_details || !service_details || !token) {
    throw new Error('Missing required fields');
  }

  const verified = await verifyUserJwtToken(token)

  if(!verified){
    throw new Error('Failed to verify token');
  }

  const { user, role } = verified;
 

  const status = 'searching';
  const passcode = Math.floor(1000 + Math.random() * 9000);
  const newRide = await Ride.create({
    userId: user.id,
    trip_details,
    service_details,
    raider_details,
    status,
    otp: passcode
  });

  return newRide;
}

// Express handler wrapper for API route
async function createRideHandler(req, res) {
  try {
    const ride = await createRide(req.body);
    res.status(201).json({
      message: 'Ride created successfully',
      ride,
    });
  } catch (err) {
    console.error('Error creating ride:', err);
    res.status(500).json({ message: err.message });
  }
}

async function getRidesHandler (req, res) {
  try {
    const rides = await Ride.findOne({
    id: 2 
}); // Retrieve all rides from the database
    res.status(200).json(rides);  // Send the rides as the response
  } catch (error) {
    console.error(error);  // Log the error
    res.status(500).json({ message: 'Error retrieving rides', error });
  }
}

async function cancelRide(data) {
  const  {token, id}  = data;

  if (!id || !token) {
    throw new Error('some parameters missing in body');
  }

  // ✅ Correct way to find by id
  const verified = await verifyUserJwtToken(token)

  if(!verified){
    throw new Error('Token verification failed')
  }

const {user, role} = verified
if(role == 'user'){
    const ride = await Ride.findOne({ where: { id: id, userId: user.id } });
    if (!ride) {
    throw new Error(`Ride with ID ${id} and ${user.id} not found`);
  }
  const updatedRide = await ride.update({ status: 'cancelled' });

  return updatedRide;
}

if(role == 'admin' || role == 'manager'){
    const ride = await Ride.findOne({ where: { id: id } });
    if (!ride) {
    throw new Error(`Ride with ID ${id} and ${user.id} not found`);
  }
  const updatedRide = await ride.update({ status: 'cancelled' });

  return updatedRide;
}
  
}

async function cancelRideHandler(req, res) {
    try {
        const ride = await cancelRide(req.body)
        res.status(200).json({
            message: 'Ride Cancelled',
            ride
        })
    } catch(err) {
        res.status(500).json({message: err.message})
    }
}

async function searchAndAssignRider(rideId) {
  if (!rideId) {
    throw new Error('Ride ID is missing');
  }

  const ride = await Ride.findOne({ where: { id: rideId } });
  if (!ride) {
    throw new Error(`Ride with ID ${rideId} not found`);
  }

  // Wait 5 seconds before assigning rider
  await new Promise((resolve) => setTimeout(resolve, 5000));

  const riderList = await Rider.findAll({
    where : {
      status: 'online',
    }
  })

  console.log(riderList)

  for (const rider of riderList) {
    const riderId = rider.id;
    console.log(`Sending ride request to rider ${riderId}`);

    io.to(`rider-${riderId}`).emit('ride:request', {
      rideId,
      origin: ride.origin,
      destination: ride.drop,
    });

    // Wait for 10 seconds or until rider accepts
    const accepted = await waitForRiderAcceptance(riderId, rideId, 10000);

    if (accepted) {
      console.log(`✅ Rider ${riderId} accepted the ride`);

      const updatedRide = await ride.update({
    raider_details: rider,
    status: 'assigned',
    rider_id: rider.id
  });

  await rider.update({ status: 'on-ride' });
   return updatedRide;
  }else {
      console.log(`❌ Rider ${riderId} did not accept in time. Trying next...`);
    }
  }

  throw new Error('No rider accepted the ride request');

}

function waitForRiderAcceptance(riderId, rideId, timeoutMs) {
  return new Promise((resolve) => {
    let accepted = false;

    const timeout = setTimeout(() => {
      if (!accepted) resolve(false);
    }, timeoutMs);

    const handler = (data) => {
      if (data.riderId === riderId && data.rideId === rideId) {
        accepted = true;
        clearTimeout(timeout);
        resolve(true);
        // 🧼 Clean up the listener
        io.off('rider:accept_ride', handler);
      }
    };

    io.on('rider:accept_ride', handler);
  });
}




module.exports = { createRide, createRideHandler, getRidesHandler,cancelRide, cancelRideHandler, searchAndAssignRider };
