const express = require('express');
const router = express.Router();
const otaController = require('../controllers/otaController');

// Client endpoints
router.get('/check', otaController.checkUpdate);
router.get('/manifest/:appId/:channel?', otaController.getManifest);
router.post('/report', otaController.reportStatus);

// Management / Admin endpoints
router.post('/publish', otaController.publishRelease);
router.get('/releases', otaController.getReleases);
router.patch('/releases/:id/toggle', otaController.toggleRelease);
router.delete('/releases/:id', otaController.deleteRelease);

module.exports = router;

