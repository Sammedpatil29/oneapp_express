const express = require('express');
const router = express.Router();
const multer = require('multer');
const {
  createBanner,
  getAllBanners,
  getAllPlacementTags,
  getActiveBanners,
  getBannerById,
  updateBanner,
  deleteBanner,
  uploadBannerImage
} = require('../controllers/bannerController');

// Multer in-memory storage for banner image processing
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB maximum
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, WebP) are allowed!'), false);
    }
  }
});

// Routes for Banners
router.post('/upload', upload.single('image'), uploadBannerImage);
router.post('/', createBanner);
router.get('/', getAllBanners);
router.get('/tags', getAllPlacementTags); // Dynamic list of all saved placement tags
router.get('/active', getActiveBanners);  // Customer app filtered banners
router.get('/:id', getBannerById);
router.put('/:id', updateBanner);
router.delete('/:id', deleteBanner);

module.exports = router;