const express = require('express');
const router = express.Router();
const { getGroceryHomeData, getCategoryPageData, getProductsByCategory, getDynamicSectionData, searchGroceryItems } = require('../controllers/groceryHomeController');

// Route: /api/grocery-home
router.get('/', getGroceryHomeData);
router.post('/category', getCategoryPageData);
router.post('/productbycategory', getProductsByCategory);
router.post('/section', getDynamicSectionData);
router.post('/search', searchGroceryItems);

module.exports = router;