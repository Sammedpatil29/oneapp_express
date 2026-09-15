const Banner = require('../models/banners');
const Address = require('../models/Address');
const Service = require('../models/Services');
const { verify } = require('jsonwebtoken');
const { Op } = require('sequelize');

// Use the same secret as authController
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key_123';

/**
 * Get Home Screen Data
 * GET /api/home
 * Fetches:
 * 1. Banners (Active, Service-validated, City-geofenced)
 * 2. Addresses (For the logged-in user)
 * 3. Services (Status='active')
 */
const getHomeData = async (req, res) => {
  try {
    // 1. Extract & Verify Token
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    let userId;

    try {
      const decoded = verify(token, JWT_SECRET);
      userId = decoded.id;
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    const userCity = req.query.city ? String(req.query.city).trim().toLowerCase() : null;

    // 2. Fetch Data in Parallel
    const [allActiveBanners, addresses, services] = await Promise.all([
      Banner.findAll({
        where: { is_active: true },
        order: [['priority', 'ASC'], ['id', 'DESC']]
      }),
      Address.findAll({
        where: { user_id: userId },
        order: [['createdAt', 'DESC']]
      }),
      Service.findAll({
        where: { status: 'active' }
      })
    ]);

    // Service Map for quick lookup
    const activeServiceIds = new Set(services.map(s => String(s.id)));

    // Filter banners based on linked service and city
    const filteredBanners = allActiveBanners.filter(banner => {
      // Linked Service check
      if (banner.service_id && !activeServiceIds.has(String(banner.service_id))) {
        return false;
      }

      // City check
      if (Array.isArray(banner.cities) && banner.cities.length > 0) {
        if (!userCity) return false;
        const hasCity = banner.cities.some(
          c => String(c).trim().toLowerCase() === userCity
        );
        if (!hasCity) return false;
      }

      return true;
    });

    // 3. Return Aggregated Response
    return res.status(200).json({
      success: true,
      data: {
        banners: filteredBanners,
        addresses,
        services
      }
    });
  } catch (error) {
    console.error('Home Data Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = { getHomeData };