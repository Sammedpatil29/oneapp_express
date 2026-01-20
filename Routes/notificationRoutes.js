const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

// POST /api/notifications/send-all
router.post('/send-all', notificationController.sendToAllUsers);

module.exports = router;