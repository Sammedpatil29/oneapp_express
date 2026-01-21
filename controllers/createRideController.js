const Ride = require('../models/rideModel');
const Rider = require('../models/ridersModel');
const { Op } = require('sequelize');
const { io, socketMap } = require('../app'); // 🔴 socketMap added
const { verifyUserJwtToken } = require('../utils/jwttoken');
const axios = require('axios');

/* =========================
   CREATE RIDE
========================= */
async function createRide(data) {
  const { token, trip_details, service_details } = data;

  if (!token || !trip_details || !service_details) {
    throw new Error('Missing required fields');
  }

  const verified = await verifyUserJwtToken(token);
  if (!verified) throw new Error('Token verification failed');

  const { user } = verified;

  const ride = await Ride.create({
    userId: user.id,
    trip_details,
    service_details,
    status: 'searching',
    otp: Math.floor(1000 + Math.random() * 9000)
  });

  return ride;
}

async function createRideHandler(req, res) {
  try {
    const ride = await createRide(req.body);
    res.status(201).json({ message: 'Ride created', ride });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

/* =========================
   GET RIDES
========================= */
async function getRidesHandler(req, res) {
  try {
    const rides = await Ride.findAll();
    res.status(200).json(rides);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching rides' });
  }
}

/* =========================
   CANCEL RIDE
========================= */
async function cancelRide(data) {
  const { token, id } = data;
  if (!token || !id) throw new Error('Missing parameters');

  const verified = await verifyUserJwtToken(token);
  if (!verified) throw new Error('Token invalid');

  const { user, role } = verified;

  const where =
    role === 'user'
      ? { id, userId: user.id }
      : { id };

  const ride = await Ride.findOne({ where });
  if (!ride) throw new Error('Ride not found');

  await ride.update({ status: 'cancelled' });
  return ride;
}

async function cancelRideHandler(req, res) {
  try {
    const ride = await cancelRide(req.body);
    res.json({ message: 'Ride cancelled', ride });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
}

/* =========================
   SEARCH & ASSIGN RIDER
========================= */
async function searchAndAssignRider(rideId) {
  const ride = await Ride.findByPk(rideId);
  if (!ride) return { success: false, message: 'Ride not found' };

  const MAX_ATTEMPTS = 3;
  const TIMEOUT = 10000;
  const DELAY = 2000;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {

    await ride.reload();
    if (ride.status === 'cancelled') {
      return { success: false, message: 'Ride cancelled by user' };
    }

    const riders = await Rider.findAll({
      where: { status: 'online' }
    });

    for (const rider of riders) {
      if (!rider.socket_id) continue;

      const socket = socketMap.get(rider.socket_id);
      if (!socket) continue;

      // 🔵 Send ride request
      io.to(rider.socket_id).emit('ride:request', {
        rideId,
        origin: ride.trip_details.origin,
        destination: ride.trip_details.drop
      });

      const result = await waitForRiderResponse(
        socket,
        rideId,
        TIMEOUT
      );

      if (result === 'accepted') {

        await rider.update({ status: 'on-ride' });

        await ride.update({
          status: 'assigned',
          rider_id: rider.id,
          raider_details: {
            id: rider.id,
            name: rider.name,
            phone: rider.phone,
            vehicle: rider.vehicle
          }
        });

        io.to(rider.socket_id).emit('ride:confirmed', ride);

        return { success: true, ride, rider };
      }
    }

    if (attempt < MAX_ATTEMPTS) {
      await new Promise(r => setTimeout(r, DELAY));
    }
  }

  return { success: false, message: 'No rider accepted' };
}

/* =========================
   WAIT FOR RIDER RESPONSE (FIXED)
========================= */
function waitForRiderResponse(socket, rideId, timeout = 10000) {
  return new Promise((resolve) => {

    const timer = setTimeout(() => {
      cleanup();
      resolve('timeout');
    }, timeout);

    function onAccept(data) {
      if (data.rideId === rideId) {
        cleanup();
        resolve('accepted');
      }
    }

    function onReject(data) {
      if (data.rideId === rideId) {
        cleanup();
        resolve('rejected');
      }
    }

    function cleanup() {
      clearTimeout(timer);
      socket.off('rider:accepted', onAccept);
      socket.off('rider:rejected', onReject);
    }

    socket.once('rider:accepted', onAccept);
    socket.once('rider:rejected', onReject);
  });
}

/* =========================
   CALCULATE RIDE ESTIMATES
========================= */
async function calculateRideEstimates(req, res) {
  try {
    const { origin, drop } = req.body;

    if (!origin || !drop || !origin.coords || !drop.coords) {
      return res.status(400).json({ message: 'Invalid origin or drop location' });
    }

    // Google Maps Distance Matrix API
    const originCoords = `${origin.coords.lat},${origin.coords.lng}`;
    const destCoords = `${drop.coords.lat},${drop.coords.lng}`;
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!apiKey) {
      throw new Error('Google Maps API key is not configured.');
    }

    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originCoords}&destinations=${destCoords}&key=${apiKey}`;
    
    const response = await axios.get(url);
    
    if (response.data.status !== 'OK') {
      throw new Error(`Google API Error: ${response.data.status}`);
    }

    const element = response.data.rows[0].elements[0];
    
    if (element.status !== 'OK') {
       throw new Error(`Route not found: ${element.status}`);
    }

    // Google returns distance in meters and duration in seconds
    const distanceKm = element.distance.value / 1000;
    const durationMins = Math.ceil(element.duration.value / 60);

    // Configuration for vehicle types
    const options = [
      { type: 'bike', image_url: 'assets/icon/ChatGPT Image Oct 14, 2025, 07_41_18 PM.png', max_person: 'max 1 person', base: 20, rate: 10 },
      { type: 'cab', image_url: 'assets/icon/ChatGPT Image Oct 14, 2025, 07_41_18 PM.png', max_person: 'max 4 persons', base: 50, rate: 25 },
      { type: 'auto', image_url: 'assets/icon/ChatGPT Image Oct 14, 2025, 07_41_18 PM.png', max_person: 'max 3 persons', base: 30, rate: 15 },
      { type: 'parcel', image_url: '/assets/icon/ChatGPT Image Oct 14, 2025, 07_41_18 PM.png', max_person: '20 kgs', base: 40, rate: 12 }
    ];

    const tripOptions = options.map(opt => {
      // Calculate Price
      const price = Math.ceil(opt.base + (distanceKm * opt.rate));
      
      // Calculate Arrival Time
      const arrivalDate = new Date(Date.now() + durationMins * 60000);
      const estimated_reach_time = arrivalDate.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      }).toLowerCase();

      return {
        type: opt.type,
        image_url: opt.image_url,
        max_person: opt.max_person,
        estimated_time: `${durationMins} mins`,
        estimated_reach_time: estimated_reach_time,
        price: price
      };
    });

    res.status(200).json(tripOptions);

  } catch (error) {
    console.error('Estimate Error:', error);
    res.status(500).json({ message: error.message });
  }
}

/* =========================
   EXPORTS
========================= */
module.exports = {
  createRide,
  createRideHandler,
  getRidesHandler,
  cancelRide,
  cancelRideHandler,
  searchAndAssignRider,
  calculateRideEstimates
};
