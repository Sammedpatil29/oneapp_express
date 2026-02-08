const express = require('express');
const router = express.Router();
const { createAdmin, loginAdmin } = require('../controllers/adminController');

// Route: /api/admin

router.post('/create', createAdmin);
router.post('/login', loginAdmin);

module.exports = router;