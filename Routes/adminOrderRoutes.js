const express = require('express');
const router = express.Router();
const { getAllOrders, updateOrderStatus } = require('../controllers/adminOrderController');

// Route: /api/admin/orders

router.get('/', getAllOrders);
router.patch('/', updateOrderStatus);

module.exports = router;