// rideRoutes.js

const express = require('express');

const router = express.Router();
const { calculateRideEstimates, createRideHandler, riderCancelRideHandler } = require('../controllers/createRideController');

router.post('/api/ride/estimate', calculateRideEstimates);
router.post('/api/ride/create', createRideHandler);
router.post('/api/ride/rider-cancel', riderCancelRideHandler);


module.exports = router;
