const express = require('express');
const router = express.Router();
const {
  createBrand,
  getAllBrands,
  getBrandById,
  updateBrand,
  deleteBrand,
  seedBrands
} = require('../controllers/groceryBrandController');

// Route: /api/grocery-brands
router.post('/', createBrand);
router.post('/seed', seedBrands); // Endpoint to bulk upload the list
router.get('/', getAllBrands);
router.get('/:id', getBrandById);
router.put('/:id', updateBrand);
router.delete('/:id', deleteBrand);

module.exports = router;