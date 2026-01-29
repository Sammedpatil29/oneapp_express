const express = require('express');
const router = express.Router();
const { getGroceryHomeData, getCategoryPageData, getProductsByCategory, getDynamicSectionData } = require('../controllers/groceryHomeController');

// Route: /api/grocery-home
router.get('/', getGroceryHomeData);
router.post('/category', getCategoryPageData);
router.post('/productbycategory', getProductsByCategory);
router.post('/section', getDynamicSectionData);

module.exports = router;