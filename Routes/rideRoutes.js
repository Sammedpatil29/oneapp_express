// rideRoutes.js

const express = require('express');
const Ride = require('../models/rideModel');  // Import the Ride model

const router = express.Router();
const { io } = require('../app');
const { createRideHandler } = require('../controllers/createRideController');
const { getRidesHandler } = require('../controllers/createRideController');
// Create a new ride

router.post('/api/ride/create', createRideHandler);
router.get('/api/ride', getRidesHandler);


module.exports = router;
