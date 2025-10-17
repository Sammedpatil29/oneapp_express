
const Ride = require('../models/rideModel')

// Core logic — no req/res
async function createRide(data) {
  const { trip_details, service_details, raider_details } = data;
  if (!trip_details || !service_details) {
    throw new Error('Missing required fields');
  }

  const status = 'searching';
  const newRide = await Ride.create({
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
  const  rideId  = data.id;

  if (!rideId) {
    throw new Error('rideId is missing');
  }

  // ✅ Correct way to find by id
  const ride = await Ride.findOne({ where: { id: rideId } });

  if (!ride) {
    throw new Error(`Ride with ID ${rideId} not found`);
  }

  // ✅ Update the ride status
  const updatedRide = await ride.update({ status: 'cancelled' });

  return updatedRide;
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
      current_location: 'Bangalore',
      vehicle_number: 'KA03KZ9922',
    },
    status: 'assigned',
  });

  return updatedRide;
}


module.exports = { createRide, createRideHandler, getRidesHandler,cancelRide, cancelRideHandler, searchAndAssignRider };
