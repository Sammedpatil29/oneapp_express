const express = require('express');
const router = express.Router();
const groceryOrderController = require('../controllers/groceryOrderController');

router.post('/create', groceryOrderController.createOrder);
router.get('/list', groceryOrderController.getOrders);
router.get('/:id', groceryOrderController.getOrderById);
router.post('/verify-status', groceryOrderController.verifyPayment);
router.post('/cancel', groceryOrderController.cancelOrder);

module.exports = router;