// routes/propertyRoutes.js
const express = require('express');
const {
  getAllProperties,
  getPropertyById,
  createProperty,
  updateProperty,
  deleteProperty,
} = require('../controllers/propertyController');

const router = express.Router();

// GET all properties with optional query parameters (category, city, search, etc.)
router.get('/', getAllProperties);

// GET single property by ID
router.get('/:id', getPropertyById);

// POST create new property listing
router.post('/', createProperty);

// PUT update property listing
router.put('/:id', updateProperty);

// DELETE remove property listing (soft delete)
router.delete('/:id', deleteProperty);

module.exports = router;

