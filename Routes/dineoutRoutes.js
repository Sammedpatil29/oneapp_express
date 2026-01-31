const express = require('express');
const router = express.Router();
const dineoutController = require('../controllers/dineoutController');

// Create
router.post('/', dineoutController.createDineout);

// Seed (Bulk Create)
router.post('/seed', dineoutController.seedDineouts);

// Read
router.get('/', dineoutController.getAllDineouts);
router.get('/:id', dineoutController.getDineoutById);

// Update
router.put('/:id', dineoutController.updateDineout);

// Delete
router.delete('/:id', dineoutController.deleteDineout);

module.exports = router;