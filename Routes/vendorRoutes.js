// Routes/vendorRoutes.js
const express = require('express');
const router = express.Router();
const {
  sendVendorOtp,
  verifyVendorOtp,
  getVendorProfile,
  updateStoreStatus,
  getAllVendors,
} = require('../controllers/vendorController');

const {
  sendRegistrationOtp,
  verifyRegistrationOtp,
  checkPhoneAvailability,
  getRegistrationMetadata,
  saveRegistrationDraft,
  deleteRegistrationDraft,
  submitRegistration,
} = require('../controllers/vendorRegistrationController');

// Vendor Authentication (Existing)
router.post('/send-otp', sendVendorOtp);
router.post('/verify-otp', verifyVendorOtp);

// Vendor Registration & Draft Management
router.get('/register/metadata', getRegistrationMetadata);
router.get('/register/check-phone', checkPhoneAvailability);
router.post('/register/send-otp', sendRegistrationOtp);
router.post('/register/verify-otp', verifyRegistrationOtp);
router.post('/register/save-draft', saveRegistrationDraft);
router.delete('/register/draft/:email', deleteRegistrationDraft);
router.delete('/register/draft', deleteRegistrationDraft);
router.post('/register/submit', submitRegistration);

// Vendor Profile & Store Management
router.get('/profile', getVendorProfile);
router.put('/status', updateStoreStatus);
router.get('/list', getAllVendors);

module.exports = router;

