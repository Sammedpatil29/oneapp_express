
const Ride = require('../models/rideModel')
const verifyUserJwtToken = require('../utils/jwttoken')

// Core logic — no req/res
async function createRide(data) {
  const { token, trip_details, service_details, raider_details } = data;
  console.log('reached')
  
  if (!trip_details || !service_details || !token) {
    throw new Error('Missing required fields');
  }

  const verified = await verifyUserJwtToken(token)

  if(!verified){
    throw new Error('Failed to verify token');
  }

  const { user, role } = verified;
  console.log('searchinggggggggggg')

  const status = 'searching';
  const newRide = await Ride.create({
    userId: user.id,
    trip_details,
    service_details,
    raider_details,
    status,
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

  const updatedRide = await ride.update({
    raider_details: {
      name: 'sammed',
      image_url: '',
      contact: '9591420068',
      current_location: {
        lat: 12.8558012,
        lng: 77.6776055
      },
      vehicle_number: 'KA03KZ9922',
      vehicle_type: 'bike',
      fuel_type: 'ev',
      join_date: '29/04/2025',
      vehicle_model: 'Ola s1 X 4kw'

    },
    status: 'assigned',
  });

  return updatedRide;
}


module.exports = { createRide, createRideHandler, getRidesHandler,cancelRide, cancelRideHandler, searchAndAssignRider };
