const express = require('express');
const router = express.Router();
const { getGroceryHomeData } = require('../controllers/groceryHomeController');

// Route: /api/grocery-home
router.get('/', getGroceryHomeData);

module.exports = router;