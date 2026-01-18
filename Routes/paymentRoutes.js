const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

router.post('/create-order', paymentController.createOrder);
router.post('/verify-status', paymentController.verifyPaymentStatus);
// router.post('/webhook', paymentController.handleWebhook); // Add later for production

module.exports = router;