const express = require('express');
const router = express.Router();
const { updateCartItem, getCart, removeFromCart } = require('../controllers/groceryCartController');
const verifyToken = require('./authMiddleware');

// Route: /api/grocery/cart

// Get all items in cart
router.get('/', verifyToken, getCart);

// Add or Update item (Payload: { productId, quantity })
router.post('/update', verifyToken, updateCartItem);

// Remove item by Product ID
router.delete('/:productId', verifyToken, removeFromCart);

module.exports = router;