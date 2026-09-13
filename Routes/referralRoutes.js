const express = require('express');
const router = express.Router();
const verifyToken = require('./authMiddleware');
const referralController = require('../controllers/referralController');

// Public route: Validate referral code at registration
router.post('/validate', referralController.validateReferralCode);

// Authenticated route: Get current user's referral code and tracking stats
router.get('/details', verifyToken, referralController.getReferralDetails);

module.exports = router;

