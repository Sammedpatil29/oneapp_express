const express = require('express');
const router = express.Router();
const { createAdmin, loginAdmin, getAllAdmins, updateAdmin, deleteAdmin, getAdminProfile, getAdminHomeData, adminForgotPassword, adminVerifyResetOtp, adminResetPassword, adminChangePassword } = require('../controllers/adminController');

// Route: /api/admin

router.post('/create', createAdmin);
router.post('/login', loginAdmin);
router.get('/profile', getAdminProfile);
router.get('/list', getAllAdmins);
router.post('/home', getAdminHomeData);

// Password reset & change routes
router.post('/forgot-password', adminForgotPassword);
router.post('/verify-reset-otp', adminVerifyResetOtp);
router.post('/reset-password', adminResetPassword);
router.post('/change-password', adminChangePassword);

router.put('/:id', updateAdmin);
router.delete('/:id', deleteAdmin);

module.exports = router;