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
  payRiderCommission,
  withdrawRiderWallet,
  getRiderReferrals,
  getRiderRides,
  getRiderNotifications,
  triggerRiderSos,
  sendRiderEmailOtp,
  verifyRiderEmailOtp,
  getRiderAuthStatus,
  checkRiderPhone,
  uploadKycZip,
  updateRiderChecklist,
  unzipRiderKycDocs,
  updateRiderFcmToken,
  getRideDetail,
  getRiderActiveRide
} = require('../controllers/riderController');

const path = require('path');
const fs = require('fs');
const multer = require('multer');

const kycStorageDir = path.join(__dirname, '..', 'public', 'uploads', 'kyc_zips');
if (!fs.existsSync(kycStorageDir)) {
  fs.mkdirSync(kycStorageDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, kycStorageDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname) || '.zip';
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e6);
    cb(null, `kyc-${uniqueSuffix}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// Route: /api/rider
// Route prefix: /api/rider

router.get('/', getAllRiders);
router.get('/all', getAllRiders);
router.post('/create', createRiderHandler);
router.post('/login', loginRider);
router.post('/verify', verifyRiderDocs);
router.get('/online', getOnlineRiders);

// Email Verification & OTP Authentication (Passwordless)
router.post('/send-otp', sendRiderEmailOtp);
router.post('/verify-otp', verifyRiderEmailOtp);
router.get('/auth/status', getRiderAuthStatus);
router.get('/check-phone', checkRiderPhone);
router.post('/upload-kyc-zip', upload.single('kycZip'), uploadKycZip);
router.put('/checklist/:id', updateRiderChecklist);
router.post('/checklist/:id', updateRiderChecklist);
router.get('/unzip-kyc/:id', unzipRiderKycDocs);
router.post('/unzip-kyc/:id', unzipRiderKycDocs);

// FCM Push Notification Device Token
router.patch('/fcm-token', updateRiderFcmToken);
router.post('/fcm-token', updateRiderFcmToken);

// Captain Profile & Status
router.get('/profile/:id', getRiderProfile);
router.put('/profile/:id', updateRiderProfile);
router.put('/status/:id', updateRiderStatus);
router.post('/status', updateRiderStatus);

// Earnings & Targets
router.get('/earnings/:id', getRiderEarnings);

// Wallet & Platform Commission Payment
router.get('/wallet/:id', getRiderWallet);
router.post('/wallet/pay-commission', payRiderCommission);
router.post('/wallet/pay', payRiderCommission);
router.post('/wallet/withdraw', withdrawRiderWallet);

// Referrals & Rewards
router.get('/referrals/:id', getRiderReferrals);

// Active Ongoing Ride (for refresh and launch recovery)
router.get('/active-ride/:id', getRiderActiveRide);
router.get('/active-ride', getRiderActiveRide);

// Ride / Order History
router.get('/rides/detail/:rideId', getRideDetail);
router.get('/ride/:rideId', getRideDetail);
router.get('/rides/:id', getRiderRides);

// Notifications Feed
router.get('/notifications/:id', getRiderNotifications);

// Safety SOS Alert
router.post('/sos', triggerRiderSos);

module.exports = router;