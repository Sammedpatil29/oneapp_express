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

// Vendor Authentication
router.post('/send-otp', sendVendorOtp);
router.post('/verify-otp', verifyVendorOtp);

// Vendor Profile & Store Management
router.get('/profile', getVendorProfile);
router.put('/status', updateStoreStatus);
router.get('/list', getAllVendors);

module.exports = router;

