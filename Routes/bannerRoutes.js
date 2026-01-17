const express = require('express');
const router = express.Router();
const {
  createBanner,
  getAllBanners,
  getBannerById,
  updateBanner,
  deleteBanner
} = require('../controllers/bannerController');

// CRUD Routes for Banners
router.post('/', createBanner);
router.get('/', getAllBanners);
router.get('/:id', getBannerById);
router.put('/:id', updateBanner);
router.delete('/:id', deleteBanner);

module.exports = router;