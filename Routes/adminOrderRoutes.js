const express = require('express');
const router = express.Router();
const { getAllOrders, updateOrderStatus, getOrderById } = require('../controllers/adminOrderController');

// Route: /api/admin/orders

router.get('/', getAllOrders);
router.get('/:id', getOrderById);
router.patch('/', updateOrderStatus);

module.exports = router;