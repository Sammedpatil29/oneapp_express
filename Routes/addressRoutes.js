// routes/addressRoutes.js
const express = require('express');
const { 
  createAddress, 
  getAddresses, 
  updateAddress, 
  deleteAddress,
  setPrimaryAddress,
  getPrimaryAddress
} = require('../controllers/addressController');
const verifyToken = require('./authMiddleware');

const router = express.Router();

// Route: /api/addresses

// Get the user's primary address (must be BEFORE /:id to avoid collision)
router.get('/primary', verifyToken, getPrimaryAddress);

// Add new address
router.post('/', verifyToken, createAddress);

// Get all addresses for the logged-in user
router.get('/', verifyToken, getAddresses);

// Set an address as primary
router.put('/:id/set-primary', verifyToken, setPrimaryAddress);

// Update specific address
router.put('/:id', verifyToken, updateAddress);

// Delete specific address
router.delete('/:id', verifyToken, deleteAddress);

module.exports = router;