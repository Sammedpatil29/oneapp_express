const express = require('express');
const router = express.Router();
const {
  createItem,
  createBulkItems,
  getAllItems,
  getItemById,
  updateItem,
  deleteItem
} = require('../controllers/groceryController');

// Optional: Import auth middleware if you want to protect these routes
// const verifyToken = require('./authMiddleware');

// Route: /api/grocery

router.get('/', getAllItems);
router.get('/:id', getItemById);

// Protected routes (Uncomment verifyToken if needed)
router.post('/', /* verifyToken, */ createItem);
router.post('/bulk', /* verifyToken, */ createBulkItems);
router.put('/:id', /* verifyToken, */ updateItem);
router.delete('/:id', /* verifyToken, */ deleteItem);

module.exports = router;