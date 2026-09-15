const express = require('express');
const router = express.Router();
const {
  createBanner,
  getAllBanners,
  getAllPlacementTags,
  getActiveBanners,
  getBannerById,
  updateBanner,
  deleteBanner
} = require('../controllers/bannerController');

// Routes for Banners
router.post('/', createBanner);
router.get('/', getAllBanners);
router.get('/tags', getAllPlacementTags); // Dynamic list of all saved placement tags
router.get('/active', getActiveBanners);  // Customer app filtered banners
router.get('/:id', getBannerById);
router.put('/:id', updateBanner);
router.delete('/:id', deleteBanner);

module.exports = router;