const express = require('express');
const router = express.Router();
const serviceAreaController = require('../controllers/serviceAreaController');

// Check location (point-in-polygon & nearest distance)
router.post('/check', serviceAreaController.checkLocation);

// CRUD
router.get('/', serviceAreaController.getAllServiceAreas);
router.post('/', serviceAreaController.createServiceArea);
router.get('/:id', serviceAreaController.getServiceAreaById);
router.put('/:id', serviceAreaController.updateServiceArea);
router.delete('/:id', serviceAreaController.deleteServiceArea);

module.exports = router;

