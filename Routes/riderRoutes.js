const express = require('express');
const router = express.Router();
const { createRiderHandler, verifyRiderDocs, loginRider, getOnlineRiders } = require('../controllers/riderController');

// Route: /api/rider

router.post('/create', createRiderHandler);
router.post('/login', loginRider);
router.post('/verify', verifyRiderDocs);
router.get('/online', getOnlineRiders);

module.exports = router;