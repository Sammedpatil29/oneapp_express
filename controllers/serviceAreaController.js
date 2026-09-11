const ServiceArea = require('../models/serviceAreaModel');
const Metadata = require('../models/metadataModel');

// Ray-Casting algorithm to check if point (lat, lng) is inside polygon
function isPointInPolygon(point, vs) {
  if (!vs || !Array.isArray(vs) || vs.length < 3) return false;
  const x = Number(point.lat);
  const y = Number(point.lng);
  let inside = false;

  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    const xi = Number(vs[i].lat);
    const yi = Number(vs[i].lng);
    const xj = Number(vs[j].lat);
    const yj = Number(vs[j].lng);

    const intersect = ((yi > y) !== (yj > y)) &&
      (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Haversine formula to compute great-circle distance between two GPS coordinates in kilometers
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Calculates minimum distance from a coordinate point to a polygon boundary
function minDistanceToPolygon(point, polygon, center) {
  if (!polygon || polygon.length === 0) {
    if (center && center.lat && center.lng) {
      return haversineDistance(point.lat, point.lng, center.lat, center.lng);
    }
    return 0;
  }

  let minDist = Infinity;
  for (const vertex of polygon) {
    const dist = haversineDistance(point.lat, point.lng, Number(vertex.lat), Number(vertex.lng));
    if (dist < minDist) {
      minDist = dist;
    }
  }

  // Also factor in center distance if vertices are sparse
  if (center && center.lat && center.lng) {
    const centerDist = haversineDistance(point.lat, point.lng, Number(center.lat), Number(center.lng));
    if (centerDist < minDist) {
      minDist = centerDist;
    }
  }

  return Math.round(minDist * 10) / 10;
}

// Compute centroid & radius for a polygon
function computePolygonMetrics(polygon) {
  if (!polygon || !Array.isArray(polygon) || polygon.length === 0) {
    return { center: null, radiusKm: 5.0 };
  }
  const lats = polygon.map(p => Number(p.lat));
  const lngs = polygon.map(p => Number(p.lng));
  const center = {
    lat: lats.reduce((a, b) => a + b, 0) / lats.length,
    lng: lngs.reduce((a, b) => a + b, 0) / lngs.length
  };
  let maxRadius = 0;
  for (const p of polygon) {
    const d = haversineDistance(center.lat, center.lng, Number(p.lat), Number(p.lng));
    if (d > maxRadius) maxRadius = d;
  }
  return {
    center,
    radiusKm: Math.max(1.0, Math.round(maxRadius * 10) / 10)
  };
}

/**
 * 1. GET ALL SERVICE AREAS
 * GET /api/service-areas
 */
exports.getAllServiceAreas = async (req, res) => {
  try {
    const { active } = req.query;
    const where = {};
    if (active === 'true') {
      where.isActive = true;
    }

    let areas = await ServiceArea.findAll({
      where,
      order: [['cityName', 'ASC']]
    });

    // Fallback: If table is empty, check legacy Metadata.polygon
    if (areas.length === 0) {
      const meta = await Metadata.findOne();
      if (meta && meta.polygon && Array.isArray(meta.polygon) && meta.polygon.length >= 3) {
        const metrics = computePolygonMetrics(meta.polygon);
        const defaultArea = await ServiceArea.create({
          cityName: 'Jamkhandi',
          polygon: meta.polygon,
          center: metrics.center,
          radiusKm: metrics.radiusKm,
          strokeColor: '#a000e2',
          areaColor: '#a000e2',
          isActive: true,
          description: 'Primary Service Area (Jamkhandi)'
        });
        areas = [defaultArea];
      }
    }

    return res.status(200).json({
      success: true,
      count: areas.length,
      data: areas
    });
  } catch (err) {
    console.error('Error fetching service areas:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 2. GET SERVICE AREA BY ID
 * GET /api/service-areas/:id
 */
exports.getServiceAreaById = async (req, res) => {
  try {
    const { id } = req.params;
    const area = await ServiceArea.findByPk(id);
    if (!area) {
      return res.status(404).json({ success: false, message: 'Service area not found' });
    }
    return res.status(200).json({ success: true, data: area });
  } catch (err) {
    console.error('Error fetching service area:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 3. CREATE NEW SERVICE AREA
 * POST /api/service-areas
 */
exports.createServiceArea = async (req, res) => {
  try {
    const { cityName, polygon, strokeColor, areaColor, isActive, description } = req.body;

    if (!cityName || !String(cityName).trim()) {
      return res.status(400).json({ success: false, message: 'City name is required as unique identity.' });
    }

    const trimmedCity = String(cityName).trim();

    // Verify unique city name
    const existing = await ServiceArea.findOne({
      where: ServiceArea.sequelize.where(
        ServiceArea.sequelize.fn('LOWER', ServiceArea.sequelize.col('cityName')),
        trimmedCity.toLowerCase()
      )
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Service area for city "${trimmedCity}" already exists.`
      });
    }

    if (!polygon || !Array.isArray(polygon) || polygon.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Polygon must contain at least 3 coordinates to form a closed boundary.'
      });
    }

    const metrics = computePolygonMetrics(polygon);

    const newArea = await ServiceArea.create({
      cityName: trimmedCity,
      polygon,
      center: metrics.center,
      radiusKm: metrics.radiusKm,
      strokeColor: strokeColor || '#a000e2',
      areaColor: areaColor || '#a000e2',
      isActive: isActive !== undefined ? !!isActive : true,
      description: description || `Service territory for ${trimmedCity}`
    });

    // Also update legacy metadata.polygon if it's the first or primary active area
    try {
      let meta = await Metadata.findOne();
      if (!meta) {
        meta = await Metadata.create({ polygon });
      } else if (!meta.polygon || meta.polygon.length === 0) {
        meta.polygon = polygon;
        await meta.save();
      }
    } catch (mErr) {
      console.warn('Metadata polygon sync warning:', mErr.message);
    }

    return res.status(201).json({
      success: true,
      message: `Service area for "${trimmedCity}" created successfully.`,
      data: newArea
    });
  } catch (err) {
    console.error('Error creating service area:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 4. UPDATE SERVICE AREA
 * PUT /api/service-areas/:id
 */
exports.updateServiceArea = async (req, res) => {
  try {
    const { id } = req.params;
    const { cityName, polygon, strokeColor, areaColor, isActive, description } = req.body;

    const area = await ServiceArea.findByPk(id);
    if (!area) {
      return res.status(404).json({ success: false, message: 'Service area not found.' });
    }

    if (cityName !== undefined) {
      const trimmedCity = String(cityName).trim();
      if (!trimmedCity) {
        return res.status(400).json({ success: false, message: 'City name cannot be empty.' });
      }

      // Check if city name is taken by another area
      const existing = await ServiceArea.findOne({
        where: ServiceArea.sequelize.where(
          ServiceArea.sequelize.fn('LOWER', ServiceArea.sequelize.col('cityName')),
          trimmedCity.toLowerCase()
        )
      });
      if (existing && existing.id !== area.id) {
        return res.status(400).json({
          success: false,
          message: `City name "${trimmedCity}" is already used by another service area.`
        });
      }
      area.cityName = trimmedCity;
    }

    if (polygon !== undefined) {
      if (!Array.isArray(polygon) || polygon.length < 3) {
        return res.status(400).json({
          success: false,
          message: 'Polygon must contain at least 3 coordinates.'
        });
      }
      area.polygon = polygon;
      const metrics = computePolygonMetrics(polygon);
      area.center = metrics.center;
      area.radiusKm = metrics.radiusKm;
    }

    if (strokeColor !== undefined) area.strokeColor = strokeColor;
    if (areaColor !== undefined) area.areaColor = areaColor;
    if (isActive !== undefined) area.isActive = !!isActive;
    if (description !== undefined) area.description = description;

    await area.save();

    return res.status(200).json({
      success: true,
      message: `Service area "${area.cityName}" updated successfully.`,
      data: area
    });
  } catch (err) {
    console.error('Error updating service area:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 5. DELETE SERVICE AREA
 * DELETE /api/service-areas/:id
 */
exports.deleteServiceArea = async (req, res) => {
  try {
    const { id } = req.params;
    const area = await ServiceArea.findByPk(id);
    if (!area) {
      return res.status(404).json({ success: false, message: 'Service area not found.' });
    }

    const cityName = area.cityName;
    await area.destroy();

    return res.status(200).json({
      success: true,
      message: `Service area "${cityName}" deleted successfully.`
    });
  } catch (err) {
    console.error('Error deleting service area:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * 6. CHECK LOCATION IN SERVICE AREAS & RETURN NEAREST DISTANCE
 * POST /api/service-areas/check
 * Body: { lat: number, lng: number }
 */
exports.checkLocation = async (req, res) => {
  try {
    const { lat, lng } = req.body;
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ success: false, message: 'Coordinates "lat" and "lng" are required.' });
    }

    const point = { lat: parseFloat(lat), lng: parseFloat(lng) };

    const activeAreas = await ServiceArea.findAll({
      where: { isActive: true }
    });

    if (activeAreas.length === 0) {
      // If no configured active areas, fallback to allowed
      return res.status(200).json({
        success: true,
        inServiceArea: true,
        message: 'No service area constraints currently active.'
      });
    }

    // 1. Check if inside any active area
    for (const area of activeAreas) {
      if (isPointInPolygon(point, area.polygon)) {
        return res.status(200).json({
          success: true,
          inServiceArea: true,
          area: {
            id: area.id,
            cityName: area.cityName,
            description: area.description
          }
        });
      }
    }

    // 2. If not inside, calculate nearest area and distance in km
    let nearestArea = null;
    let minDistance = Infinity;

    for (const area of activeAreas) {
      const dist = minDistanceToPolygon(point, area.polygon, area.center);
      if (dist < minDistance) {
        minDistance = dist;
        nearestArea = {
          id: area.id,
          cityName: area.cityName,
          distanceKm: dist,
          center: area.center
        };
      }
    }

    return res.status(200).json({
      success: true,
      inServiceArea: false,
      nearestArea,
      message: nearestArea
        ? `Outside service area. Nearest serviceable city is ${nearestArea.cityName} (${nearestArea.distanceKm} km away).`
        : 'Outside all service areas.'
    });
  } catch (err) {
    console.error('Error checking service area location:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

