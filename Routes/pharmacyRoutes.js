// Routes/pharmacyRoutes.js
const express = require('express');
const {
  getAllMedicines,
  getMedicineById,
  getAllLabTests,
  getLabTestById,
  getCategories,
  createOrder,
  getUserOrders,
  getOrderById,
} = require('../controllers/pharmacyController');

const router = express.Router();

// Categories
router.get('/categories', getCategories);

// Medicines
router.get('/medicines', getAllMedicines);
router.get('/medicines/:id', getMedicineById);

// Lab Tests
router.get('/lab-tests', getAllLabTests);
router.get('/lab-tests/:id', getLabTestById);

// Orders & Bookings
router.post('/orders', createOrder);
router.get('/orders', getUserOrders);
router.get('/orders/:id', getOrderById);

module.exports = router;

