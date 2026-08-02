const express = require('express');
const router = express.Router();
const { askQuestion } = require('../controllers/askPintuController');
const verifyAdminToken = require('./adminAuthMiddleware');

// Route: /api/ask-pintu
router.post('/query', askQuestion);

module.exports = router;