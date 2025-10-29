
const Ride = require('../models/rideModel')
const Rider = require('../models/ridersModel')

const { Op } = require('sequelize');
const { io } = require('../app');

const {verifyUserJwtToken} = require('../utils/jwttoken')

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
  const ride = await Ride.findByPk(rideId);
  if (!ride) return { success: false, message: 'Ride not found' };

  try {
  const MAX_ATTEMPTS = 3; // Number of retry rounds
  const TIMEOUT_PER_RIDER = 10000; // Wait time for each rider response
  const DELAY_BETWEEN_ROUNDS = 2000; // Optional delay between rounds

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    console.log(`🔁 Attempt ${attempt}/${MAX_ATTEMPTS} to assign a rider...`);

    const riders = await Rider.findAll({ where: { status: 'online' } });

    if (!riders.length) {
      console.log('⚠️ No online riders found.');
      await new Promise((res) => setTimeout(res, DELAY_BETWEEN_ROUNDS));
      continue;
    }

    for (const rider of riders) {
      console.log(`📨 Sending ride request to Rider ${rider.id}`);
      io.to(rider.socket_id).emit('ride:request', {
        rideId,
        origin: ride.trip_details.origin,
        destination: ride.trip_details.drop,
      });

      // Wait for rider response
      const accepted = await waitForRiderResponse(rider.id, rideId, TIMEOUT_PER_RIDER);

      if (accepted === 'accepted') {
        console.log(`✅ Rider ${rider.id} accepted the ride!`);

        await rider.update({ status: 'on-ride' });
        await ride.update({
          raider_details: rider,
          status: 'assigned',
          rider_id: rider.id,
        });

        io.to(rider.socket_id).emit('ride:confirmed', ride);
        return { success: true, ride, rider };
      } else {
        console.log(`⏱️ Rider ${rider.id} did not accept (response: ${accepted}).`);
      }
    }

    // No riders accepted this round — wait before retrying
    if (attempt < MAX_ATTEMPTS) {
      console.log(`🕒 No acceptance in round ${attempt}. Retrying in 2s...`);
      await new Promise((res) => setTimeout(res, DELAY_BETWEEN_ROUNDS));
    }
  }

  console.log('❌ No riders accepted after 3 attempts.');
  return { success: false, message: 'No riders accepted the ride after 3 tries.' };

} catch (error) {
  console.error('🚨 Error in rider assignment:', error);
  return { success: false, message: 'Error assigning rider.' };
}

  
}


function waitForRiderResponse(riderId, rideId, timeout = 10000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve('timeout'), timeout);

    const onAccept = (data) => {
      if (data.rideId === rideId && data.riderId === riderId) {
        clearTimeout(timer);
        io.off('rider:accepted', onAccept);
        io.off('rider:rejected', onReject);
        resolve('accepted');
      }
    };

    const onReject = (data) => {
      if (data.rideId === rideId && data.riderId === riderId) {
        clearTimeout(timer);
        io.off('rider:accepted', onAccept);
        io.off('rider:rejected', onReject);
        resolve('rejected');
      }
    };

    io.on('rider:accepted', onAccept);
    io.on('rider:rejected', onReject);
  });
}





module.exports = { createRide, createRideHandler, getRidesHandler,cancelRide, cancelRideHandler, searchAndAssignRider };
