// routes/serviceRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { 
  createService, 
  getAllServices, 
  getServiceById, 
  updateService, 
  patchService, 
  deleteService,
  uploadServiceImage
} = require('../controllers/serviceController');

// Multer in-memory storage for service image upload and WebP processing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB maximum
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, WebP, SVG) are allowed!'), false);
    }
  }
});

// Upload service image to Firebase Storage (services/ folder) with WebP conversion
router.post('/service/upload', upload.single('image'), uploadServiceImage);
router.post('/api/services/upload', upload.single('image'), uploadServiceImage);

// Create & Read All
router.post('/service', createService);
router.get('/service', getAllServices);

// Read One, Update, Patch, Delete
router.get('/service/:id', getServiceById);
router.put('/service/:id', updateService);
router.patch('/service/:id', patchService);
router.delete('/service/:id', deleteService);

module.exports = router;