const express = require('express');
const router = express.Router();
const { createRiderHandler, verifyRiderDocs, loginRider } = require('../controllers/riderController');

// Route: /api/rider

router.post('/create', createRiderHandler);
router.post('/login', loginRider);
router.post('/verify', verifyRiderDocs);

module.exports = router;