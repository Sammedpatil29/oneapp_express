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
    if (activeSearches[rideId].timeout) {
      clearTimeout(activeSearches[rideId].timeout);
    }
    delete activeSearches[rideId];
    console.log(`🛑 Stopped search for ride: ${rideId}`);
  }
};

// Helper to process riders one by one
const processNextRider = async (rideId, io) => {
  const state = activeSearches[rideId];
  if (!state) return; // Search stopped

  // 1. Check Total Timeout (1.5 mins = 90000ms)
  if (Date.now() - state.startTime > 90000) {
    console.log(`⏰ Search timed out for ride ${rideId}`);
    try {
      const ride = await Ride.findByPk(rideId);
      if (ride && ride.status === 'searching') {
        ride.status = 'cancelled';
        await ride.save();
        io.emit('rideUpdate', { id: ride.id, status: 'cancelled', message: 'No drivers accepted' });
      }
    } catch (err) {
      console.error('Error cancelling timed out ride:', err);
    }
    stopRiderSearch(rideId);
    return;
  }

  try {
    const ride = await Ride.findByPk(rideId);
    if (!ride || ride.status !== 'searching') {
      stopRiderSearch(rideId);
      return;
    }

    // 2. Select Rider (Round Robin)
    const rider = state.riders[state.index % state.riders.length];
    console.log(`📡 Offering ride ${rideId} to rider ${rider.id} (Index: ${state.index})`);

    // 3. Emit Request
    io.to(rider.socket_id).emit('ride:request', {
      rideId: ride.id,
      trip_details: ride.trip_details,
      service_details: ride.service_details,
      fare: ride.service_details.price
    });

    // 4. Schedule Next Iteration
    state.index++;
    state.timeout = setTimeout(() => {
      processNextRider(rideId, io);
    }, 10000); // Wait 10 seconds for acceptance before trying next

  } catch (error) {
    console.error('Error in processNextRider:', error);
    stopRiderSearch(rideId);
  }
};

// Helper to start the search loop
const startRiderSearch = async (rideId, io) => {
  // Clear existing search if any
  stopRiderSearch(rideId);

  console.log(`🔍 Starting search for ride: ${rideId}`);

  try {
    const ride = await Ride.findByPk(rideId);
    if (!ride || ride.status !== 'searching') return;

    // 1. Filter Riders by Type
    const vehicleType = ride.service_details?.type;
    const whereClause = {
      status: 'online',
      socket_id: { [Op.ne]: null }
    };
    if (vehicleType) {
      whereClause.vehicle_type = vehicleType;
    }

    const riders = await Rider.findAll({ where: whereClause });

    if (riders.length === 0) {
      console.log(`No matching riders found for ride ${rideId}`);
      ride.status = 'cancelled';
      await ride.save();
      io.emit('rideUpdate', { id: ride.id, status: 'cancelled', message: 'No drivers available' });
      return;
    }

    // 2. Initialize Search State
    activeSearches[rideId] = {
      startTime: Date.now(),
      riders: riders,
      index: 0,
      timeout: null
    };

    // 3. Start Loop
    processNextRider(rideId, io);

  } catch (error) {
    console.error('Error starting rider search:', error);
  }
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
   RIDER CANCEL HANDLER
========================= */
async function riderCancelRideHandler(req, res) {
  try {
    const { rideId, riderId } = req.body;

    if (!rideId || !riderId) {
      return res.status(400).json({ success: false, message: 'Ride ID and Rider ID are required' });
    }

    const ride = await Ride.findByPk(rideId);

    if (!ride) {
      return res.status(404).json({ success: false, message: 'Ride not found' });
    }

    // Verify this rider is the one assigned
    if (ride.riderId && ride.riderId !== riderId) {
       return res.status(403).json({ success: false, message: 'Not authorized to cancel this ride' });
    }

    // Reset Ride Status
    ride.riderId = null;
    ride.raider_details = null;
    ride.status = 'searching';
    await ride.save();

    // Notify User & Restart Search
    const io = req.app.get('io');
    if (io) {
      io.emit('rideUpdate', ride); // Notify user that status is back to searching
      startRiderSearch(ride.id, io); // Restart the search loop
    }

    res.status(200).json({ success: true, message: 'Ride unassigned and search restarted', ride });
  } catch (error) {
    console.error('Rider Cancel Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
}

/* =========================
   EXPORTS
========================= */
module.exports = {
  calculateRideEstimates,
  createRideHandler,
  stopRiderSearch, // Exported for use in socketHandler
  riderCancelRideHandler
};
