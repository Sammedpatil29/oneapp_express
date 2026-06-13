const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');

// Define routes for tickets
router.post('/create', ticketController.createTicket);
router.get('/', ticketController.getAllTickets);
router.get('/user', ticketController.getUserTickets);
router.get('/:id', ticketController.getTicketById);
router.put('/:id', ticketController.updateTicket);
router.delete('/:id', ticketController.deleteTicket);

module.exports = router;