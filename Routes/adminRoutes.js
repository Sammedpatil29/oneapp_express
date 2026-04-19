const express = require('express');
const router = express.Router();
const { createAdmin, loginAdmin, getAllAdmins, updateAdmin, deleteAdmin, getAdminProfile, getAdminHomeData } = require('../controllers/adminController');

// Route: /api/admin

router.post('/create', createAdmin);
router.post('/login', loginAdmin);
router.get('/profile', getAdminProfile);
router.get('/list', getAllAdmins);
router.post('/home', getAdminHomeData);
router.put('/:id', updateAdmin);
router.delete('/:id', deleteAdmin);

module.exports = router;