const express = require('express');
const router = express.Router();
const { getGroceryHomeData, getCategoryPageData, getProductsByCategory } = require('../controllers/groceryHomeController');

// Route: /api/grocery-home
router.get('/', getGroceryHomeData);
router.post('/category', getCategoryPageData);
router.post('/productbycategory', getProductsByCategory);

module.exports = router;