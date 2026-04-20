const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

// POST /api/notifications/send-all
router.post('/send-all', notificationController.sendToAllUsers);

// CRUD Routes for notifications
router.post('/', notificationController.createNotification);
router.post('/seed', notificationController.seedNotifications); // Endpoint to bulk upload the list
router.get('/', notificationController.getAllNotifications);
router.get('/:id', notificationController.getNotificationById);
router.put('/:id', notificationController.updateNotification);
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;