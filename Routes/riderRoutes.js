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
  getRiderEarnings,
  getRiderWallet,
  withdrawRiderWallet,
  getRiderReferrals,
  getRiderRides,
  getRiderNotifications,
  triggerRiderSos
} = require('../controllers/riderController');

// Route: /api/rider
// Route prefix: /api/rider

router.get('/', getAllRiders);
router.post('/create', createRiderHandler);
router.post('/login', loginRider);
router.post('/verify', verifyRiderDocs);
router.get('/online', getOnlineRiders);

// Captain Profile
router.get('/profile/:id', getRiderProfile);
router.put('/profile/:id', updateRiderProfile);

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