const express = require('express');
const router = express.Router();
const { createAdmin, loginAdmin, getAllAdmins, updateAdmin, deleteAdmin } = require('../controllers/adminController');

// Route: /api/admin

router.post('/create', createAdmin);
router.post('/login', loginAdmin);
router.get('/list', getAllAdmins);
router.put('/:id', updateAdmin);
router.delete('/:id', deleteAdmin);

module.exports = router;