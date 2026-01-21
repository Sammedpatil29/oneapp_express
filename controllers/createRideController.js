const axios = require('axios');
const Ride = require('../models/rideModel');
const Rider = require('../models/ridersModel');
const User = require('../models/customUserModel');
const { Op } = require('sequelize');
const jwt = require('jsonwebtoken');

// In-memory store for active search intervals: { rideId: intervalId }
const activeSearches = {};


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
        hour12: true,
        timeZone: 'Asia/Kolkata'
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
   CREATE RIDE & SEARCH LOGIC
========================= */

// Helper to stop the search loop
const stopRiderSearch = (rideId) => {
  if (activeSearches[rideId]) {
    clearInterval(activeSearches[rideId]);
    delete activeSearches[rideId];
    console.log(`🛑 Stopped search for ride: ${rideId}`);
  }
};

// Helper to start the search loop
const startRiderSearch = (rideId, io) => {
  // Clear existing search if any
  stopRiderSearch(rideId);

  console.log(`🔍 Starting search for ride: ${rideId}`);

  const searchInterval = setInterval(async () => {
    try {
      // 1. Check if ride is still valid for searching
      const ride = await Ride.findByPk(rideId);
      if (!ride || ride.status !== 'searching') {
        stopRiderSearch(rideId);
        return;
      }

      // 2. Find Online Riders (Simple implementation: all online riders)
      // In production, use Geospatial query (PostGIS) to find riders within X km
      const onlineRiders = await Rider.findAll({
        where: {
          status: 'online',
          socket_id: { [Op.ne]: null } // Ensure they have a socket connection
        }
      });

      if (onlineRiders.length > 0) {
        console.log(`📡 Broadcasting ride ${rideId} to ${onlineRiders.length} riders...`);
        
        // 3. Emit to each rider
        onlineRiders.forEach(rider => {
          io.to(rider.socket_id).emit('ride:request', {
            rideId: ride.id,
            trip_details: ride.trip_details,
            service_details: ride.service_details,
            fare: ride.service_details.price // assuming price is here
          });
        });
      }
    } catch (error) {
      console.error('Error in rider search loop:', error);
    }
  }, 5000); // Loop every 5 seconds

  activeSearches[rideId] = searchInterval;
};

async function createRideHandler(req, res) {
  try {
    const { token, trip_details, service_details } = req.body;

    if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' });

    // Decode token to get User ID
    let userId;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_key_123');
      userId = decoded.id;
    } catch (e) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    // Create Ride in DB
    const ride = await Ride.create({
      userId,
      trip_details,
      service_details,
      status: 'searching',
      otp: Math.floor(1000 + Math.random() * 9000).toString() // Generate 4-digit OTP
    });

    // Start Searching for Riders
    const io = req.app.get('io');
    if (io) {
      startRiderSearch(ride.id, io);
    } else {
      console.error('Socket.IO instance not found in request');
    }

    res.status(201).json({ success: true, message: 'Ride request created', ride });

  } catch (error) {
    console.error('Create Ride Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

/* =========================
   EXPORTS
========================= */
module.exports = {
  calculateRideEstimates,
  createRideHandler,
  stopRiderSearch // Exported for use in socketHandler
};
