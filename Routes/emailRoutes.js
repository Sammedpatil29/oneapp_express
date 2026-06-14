const express = require('express');
const router = express.Router();
const { sendEmailHandler } = require('../controllers/emailController');

// Route: /api/email
router.post('/send', sendEmailHandler);

module.exports = router;