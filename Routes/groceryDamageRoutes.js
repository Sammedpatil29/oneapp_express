const express = require('express');
const router = express.Router();
const {
  createDamage,
  getAllDamages,
  getDamageById,
  updateDamage,
  deleteDamage
} = require('../controllers/groceryDamageController');

// Route: /api/grocery-damage
router.post('/', createDamage);
router.get('/', getAllDamages);
router.get('/:id', getDamageById);
router.put('/:id', updateDamage);
router.delete('/:id', deleteDamage);

module.exports = router;