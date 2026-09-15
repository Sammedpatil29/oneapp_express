const Banner = require('../models/banners');
const Service = require('../models/Services');

/**
 * Helper to normalize placements array from payload
 */
function normalizePlacements(placements, placement) {
  if (Array.isArray(placements) && placements.length > 0) {
    return Array.from(new Set(placements.map(p => String(p).trim()).filter(Boolean)));
  }
  if (placement && String(placement).trim()) {
    return [String(placement).trim()];
  }
  return ['hometop'];
}

/**
 * Create a new Banner
 * POST /api/banners
 */
const createBanner = async (req, res) => {
  try {
    const {
      title,
      img,
      route,
      service_id,
      service_title,
      cities,
      placement,
      placements,
      priority,
      is_active
    } = req.body;

    let resolvedServiceTitle = service_title || '';
    if (service_id && !resolvedServiceTitle) {
      try {
        const service = await Service.findByPk(service_id);
        if (service) {
          resolvedServiceTitle = service.title;
        }
      } catch (svcErr) {
        console.warn('Service lookup warning:', svcErr.message);
      }
    }

    const resolvedPlacements = normalizePlacements(placements, placement);

    const banner = await Banner.create({
      title: title || '',
      img,
      route: route || '',
      service_id: service_id || null,
      service_title: resolvedServiceTitle,
      cities: Array.isArray(cities) ? cities : [],
      placement: resolvedPlacements[0] || 'hometop',
      placements: resolvedPlacements,
      priority: priority !== undefined ? Number(priority) : 0,
      is_active: is_active !== undefined ? is_active : true
    });

    res.status(201).json({ success: true, data: banner });
  } catch (error) {
    console.error('Create Banner Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get All Banners (Admin)
 * GET /api/banners
 */
const getAllBanners = async (req, res) => {
  try {
    const { placement } = req.query;

    const banners = await Banner.findAll({
      order: [['priority', 'ASC'], ['id', 'DESC']]
    });

    if (placement) {
      const target = String(placement).trim().toLowerCase();
      const filtered = banners.filter(b => {
        const list = Array.isArray(b.placements) && b.placements.length > 0
          ? b.placements.map(p => String(p).trim().toLowerCase())
          : [String(b.placement || '').trim().toLowerCase()];
        return list.includes(target);
      });
      return res.status(200).json({ success: true, data: filtered });
    }

    res.status(200).json({ success: true, data: banners });
  } catch (error) {
    console.error('Get Banners Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get All Unique Placement Tags (Admin dropdown options)
 * GET /api/banners/tags
 */
const getAllPlacementTags = async (req, res) => {
  try {
    const defaults = ['hometop', 'homedown', 'grocery'];
    const tagsSet = new Set(defaults);

    const banners = await Banner.findAll({
      attributes: ['placement', 'placements']
    });

    banners.forEach(b => {
      if (b.placement && String(b.placement).trim()) {
        tagsSet.add(String(b.placement).trim());
      }
      if (Array.isArray(b.placements)) {
        b.placements.forEach(p => {
          if (p && String(p).trim()) {
            tagsSet.add(String(p).trim());
          }
        });
      }
    });

    res.status(200).json({
      success: true,
      data: Array.from(tagsSet)
    });
  } catch (error) {
    console.error('Get Placement Tags Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get Active Filtered Banners (Customer App)
 * GET /api/banners/active?placement=hometop&city=Athani
 */
const getActiveBanners = async (req, res) => {
  try {
    const { placement, city } = req.query;

    // Fetch all active banners
    const banners = await Banner.findAll({
      where: { is_active: true },
      order: [['priority', 'ASC'], ['id', 'DESC']]
    });

    // Fetch all services to check linked service status
    const allServices = await Service.findAll();
    const serviceMap = new Map();
    allServices.forEach(s => {
      serviceMap.set(String(s.id), s);
    });

    const filtered = banners.filter(banner => {
      // 1. Placement tag match (multi-select check)
      if (placement) {
        const reqPlacement = String(placement).trim().toLowerCase();
        const bannerPlacements = Array.isArray(banner.placements) && banner.placements.length > 0
          ? banner.placements.map(p => String(p).trim().toLowerCase())
          : [String(banner.placement || '').trim().toLowerCase()];
        if (!bannerPlacements.includes(reqPlacement)) {
          return false;
        }
      }

      // 2. Linked Service Check
      if (banner.service_id) {
        const linkedService = serviceMap.get(String(banner.service_id));
        if (!linkedService || linkedService.status !== 'active') {
          return false;
        }
      }

      // 3. City Geofence Check
      if (Array.isArray(banner.cities) && banner.cities.length > 0) {
        if (!city) {
          return false;
        }
        const userCityNorm = String(city).trim().toLowerCase();
        const hasCity = banner.cities.some(
          c => String(c).trim().toLowerCase() === userCityNorm
        );
        if (!hasCity) {
          return false;
        }
      }

      return true;
    });

    res.status(200).json({
      success: true,
      count: filtered.length,
      data: filtered
    });
  } catch (error) {
    console.error('Get Active Banners Error:', error);
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
    const {
      title,
      img,
      route,
      service_id,
      service_title,
      cities,
      placement,
      placements,
      priority,
      is_active
    } = req.body;

    const banner = await Banner.findByPk(id);
    if (!banner) {
      return res.status(404).json({ success: false, message: 'Banner not found' });
    }

    let resolvedServiceTitle = service_title;
    if (service_id !== undefined) {
      if (service_id) {
        try {
          const service = await Service.findByPk(service_id);
          resolvedServiceTitle = service ? service.title : '';
        } catch (svcErr) {
          resolvedServiceTitle = '';
        }
      } else {
        resolvedServiceTitle = '';
      }
    }

    let resolvedPlacements = banner.placements;
    if (placements !== undefined || placement !== undefined) {
      resolvedPlacements = normalizePlacements(placements, placement || banner.placement);
    }

    await banner.update({
      title: title !== undefined ? title : banner.title,
      img: img !== undefined ? img : banner.img,
      route: route !== undefined ? route : banner.route,
      service_id: service_id !== undefined ? (service_id || null) : banner.service_id,
      service_title: resolvedServiceTitle !== undefined ? resolvedServiceTitle : banner.service_title,
      cities: Array.isArray(cities) ? cities : (cities !== undefined ? [] : banner.cities),
      placement: resolvedPlacements[0] || banner.placement || 'hometop',
      placements: resolvedPlacements,
      priority: priority !== undefined ? Number(priority) : banner.priority,
      is_active: is_active !== undefined ? is_active : banner.is_active
    });

    const updated = await Banner.findByPk(id);
    return res.status(200).json({ success: true, data: updated });
  } catch (error) {
    console.error('Update Banner Error:', error);
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

module.exports = {
  createBanner,
  getAllBanners,
  getAllPlacementTags,
  getActiveBanners,
  getBannerById,
  updateBanner,
  deleteBanner
};