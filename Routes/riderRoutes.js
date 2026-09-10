const express = require('express');
const router = express.Router();
const {
  createRiderHandler,
  verifyRiderDocs,
  loginRider,
  getOnlineRiders,
  getAllRiders,
  getRiderProfile,
  updateRiderProfile,
  updateRiderStatus,
  getRiderEarnings,
  getRiderWallet,
  withdrawRiderWallet,
  getRiderReferrals,
  getRiderRides,
  getRiderNotifications,
  triggerRiderSos,
  sendRiderEmailOtp,
  verifyRiderEmailOtp,
  getRiderAuthStatus
} = require('../controllers/riderController');

// Route: /api/rider
// Route prefix: /api/rider

router.get('/', getAllRiders);
router.post('/create', createRiderHandler);
router.post('/login', loginRider);
router.post('/verify', verifyRiderDocs);
router.get('/online', getOnlineRiders);

// Email Verification & OTP Authentication (Passwordless)
router.post('/send-otp', sendRiderEmailOtp);
router.post('/verify-otp', verifyRiderEmailOtp);
router.get('/auth/status', getRiderAuthStatus);

// Captain Profile & Status
router.get('/profile/:id', getRiderProfile);
router.put('/profile/:id', updateRiderProfile);
router.put('/status/:id', updateRiderStatus);
router.post('/status', updateRiderStatus);

// Earnings & Targets
router.get('/earnings/:id', getRiderEarnings);

// Wallet & Payouts
router.get('/wallet/:id', getRiderWallet);
router.post('/wallet/withdraw', withdrawRiderWallet);

// Referrals & Rewards
router.get('/referrals/:id', getRiderReferrals);

// Ride / Order History
router.get('/rides/:id', getRiderRides);

// Notifications Feed
router.get('/notifications/:id', getRiderNotifications);

// Safety SOS Alert
router.post('/sos', triggerRiderSos);

module.exports = router;