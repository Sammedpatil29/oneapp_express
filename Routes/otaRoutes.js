const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const otaController = require('../controllers/otaController');

// Configure storage for incoming OTA bundles into public/ota/bundles
const otaBundlesDir = path.join(__dirname, '..', 'public', 'ota', 'bundles');
if (!fs.existsSync(otaBundlesDir)) {
  fs.mkdirSync(otaBundlesDir, { recursive: true });
}

const otaStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, otaBundlesDir);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

const otaUpload = multer({
  storage: otaStorage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100 MB max bundle size
});

// Client endpoints
router.get('/check', otaController.checkUpdate);
router.get('/manifest/:appId/:channel', otaController.getManifest);
router.get('/manifest/:appId', otaController.getManifest);
router.post('/report', otaController.reportStatus);

// Management / CLI / Admin endpoints
router.post('/upload-bundle', otaUpload.single('file'), otaController.uploadBundle);
router.post('/publish', otaController.publishRelease);
router.get('/releases', otaController.getReleases);
router.patch('/releases/:id/toggle', otaController.toggleRelease);
router.delete('/releases/:id', otaController.deleteRelease);

module.exports = router;

