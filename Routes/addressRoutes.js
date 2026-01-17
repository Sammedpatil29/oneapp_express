// routes/addressRoutes.js
const express = require('express');
const { 
  createAddress, 
  getAddressesByUser, 
  updateAddress, 
  deleteAddress 
} = require('../controllers/addressController');

const router = express.Router();

// Route: /api/addresses

// Add new address
router.post('/', createAddress);

// Get all addresses for a specific user
router.get('/user/:userId', getAddressesByUser);

// Update specific address
router.put('/:id', updateAddress);

// Delete specific address
router.delete('/:id', deleteAddress);

module.exports = router;