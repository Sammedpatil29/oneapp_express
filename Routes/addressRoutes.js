// routes/addressRoutes.js
const express = require('express');
const { 
  createAddress, 
  getAddresses, 
  updateAddress, 
  deleteAddress 
} = require('../controllers/addressController');
const verifyToken = require('./authMiddleware');

const router = express.Router();

// Route: /api/addresses

// Add new address
router.post('/', verifyToken, createAddress);

// Get all addresses for the logged-in user
router.get('/', verifyToken, getAddresses);

// Update specific address
router.put('/:id', verifyToken, updateAddress);

// Delete specific address
router.delete('/:id', verifyToken, deleteAddress);

module.exports = router;