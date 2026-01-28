const express = require('express');
const router = express.Router();
const {
  createCategory,
  getAllCategories,
  getCategoryById,
  updateCategory,
  deleteCategory,
  seedCategories
} = require('../controllers/groceryCategoryController');

// Route: /api/grocery-categories

router.post('/', createCategory);
router.post('/seed', seedCategories); // Endpoint to bulk upload the list
router.get('/', getAllCategories);
router.get('/:id', getCategoryById);
router.put('/:id', updateCategory);
router.delete('/:id', deleteCategory);

module.exports = router;