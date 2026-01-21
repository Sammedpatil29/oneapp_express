// rideRoutes.js

const express = require('express');

const router = express.Router();
const { calculateRideEstimates, createRideHandler } = require('../controllers/createRideController');

router.post('/api/ride/estimate', calculateRideEstimates);
router.post('/api/ride/create', createRideHandler);


module.exports = router;
