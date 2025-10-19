// rideRoutes.js

const express = require('express');
const Ride = require('../models/rideModel');  // Import the Ride model

const router = express.Router();
const { io } = require('../app');
const { createRideHandler } = require('../controllers/createRideController');
const { createRiderHandler } = require('../controllers/riderController');
const { getRidesHandler } = require('../controllers/createRideController');
const { verifyRiderDocs } = require('../controllers/riderController');
const { loginRider } = require('../controllers/riderController');
// Create a new ride

router.post('/api/ride/create', createRideHandler);
router.get('/api/ride', getRidesHandler);
router.post('/api/rider/create', createRiderHandler)
router.post('/api/rider/verify', verifyRiderDocs)
router.post('/api/rider/login', loginRider)


module.exports = router;
