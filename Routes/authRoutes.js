// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { verifyToken, login, register, getUser, updateUser, updateFcmToken } = require('../controllers/authController.js');

// 1. Verify Token (Call this on app startup)
router.get('/verify-token', verifyToken);

// 2. Login / Check Phone (Call this after OTP verification)
router.post('/login', login);

// 3. Register / Create User (Call this if /login returned isNewUser: true)
router.post('/register', register);

// 4. Get User Data (Fetch user profile using token)
router.get('/user', getUser);

// 5. Update User Data (Edit profile)
router.patch('/user', updateUser);

// 6. Update FCM Token
router.patch('/fcm-token', updateFcmToken);

module.exports = router;