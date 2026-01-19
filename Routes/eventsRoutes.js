const express = require('express');
const router = express.Router();
const eventsController = require('../controllers/eventsController');

router.post('/', eventsController.createEvent);
router.post('/booking-details', eventsController.getBookingDetails);
router.post('/check-availability', eventsController.checkAvailability);
router.post('/order-details', eventsController.getOrderDetails);
router.post('/cancel-booking', eventsController.cancelBooking);
router.post('/cancel/:id', eventsController.cancelEvent);
router.get('/', eventsController.getAllEvents);
router.get('/:id', eventsController.getEventById);
router.put('/:id', eventsController.updateEvent);
router.delete('/:id', eventsController.deleteEvent);

module.exports = router;