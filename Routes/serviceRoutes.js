// routes/serviceRoutes.js
const express = require('express');
const router = express.Router();
const { createService, getAllServices, getServiceById, updateService, patchService, deleteService } = require('../controllers/serviceController');

// Create & Read All
router.post('/service', createService);
router.get('/service', getAllServices);

// Read One, Update, Patch, Delete
router.get('/service/:id', getServiceById);
router.put('/service/:id', updateService);
router.patch('/service/:id', patchService);
router.delete('/service/:id', deleteService);

module.exports = router;