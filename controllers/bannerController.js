const Banner = require('../models/banners');

/**
 * Create a new Banner
 * POST /api/banners
 */
const createBanner = async (req, res) => {
  try {
    const banner = await Banner.create(req.body);
    res.status(201).json({ success: true, data: banner });
  } catch (error) {
    console.error('Create Banner Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get All Banners
 * GET /api/banners
 */
const getAllBanners = async (req, res) => {
  try {
    const banners = await Banner.findAll();
    res.status(200).json({ success: true, data: banners });
  } catch (error) {
    console.error('Get Banners Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get Banner by ID
 * GET /api/banners/:id
 */
const getBannerById = async (req, res) => {
  try {
    const { id } = req.params;
    const banner = await Banner.findByPk(id);
    if (!banner) {
      return res.status(404).json({ success: false, message: 'Banner not found' });
    }
    res.status(200).json({ success: true, data: banner });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update Banner
 * PUT /api/banners/:id
 */
const updateBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const [updated] = await Banner.update(req.body, { where: { id } });
    if (updated) {
      const updatedBanner = await Banner.findByPk(id);
      return res.status(200).json({ success: true, data: updatedBanner });
    }
    res.status(404).json({ success: false, message: 'Banner not found' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Delete Banner
 * DELETE /api/banners/:id
 */
const deleteBanner = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Banner.destroy({ where: { id } });
    if (deleted) {
      return res.status(200).json({ success: true, message: 'Banner deleted' });
    }
    res.status(404).json({ success: false, message: 'Banner not found' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { createBanner, getAllBanners, getBannerById, updateBanner, deleteBanner };