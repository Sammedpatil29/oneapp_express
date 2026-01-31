const Dineout = require('../models/dineoutModel');
const { Op } = require('sequelize');

// Helper to format response (reconstruct coords object)
const formatDineout = (dineout) => {
  const data = dineout.toJSON ? dineout.toJSON() : dineout;
  return {
    ...data,
    coords: { lat: data.lat, lng: data.lng },
    isFav: false // Defaulting to false as per input; implement user logic if needed
  };
};

// Helper to format response for list view
const formatDineoutForList = (dineout) => {
  const data = dineout.toJSON ? dineout.toJSON() : dineout;

  return {
    id: data.id,
    name: data.name,
    image: data.image,
    location: data.location,
    distance: data.distance,
    time: '35 mins', // Placeholder as per requirement (data not in DB)
    tags: data.tags ? data.tags.split(',').map(t => t.trim()) : [],
    price_for_two: data.price,
    rating: data.rating,
    ratingCount: data.ratingCount >= 1000 
      ? (data.ratingCount / 1000).toFixed(1).replace('.0', '') + 'K+' 
      : (data.ratingCount || 0).toString(),
    offers: Array.isArray(data.offers) ? data.offers.map(o => ({
      icon: 'pricetag',
      text: o.title || o.description
    })) : [],
    isFav: false,
    isVeg: data.isVeg
  };
};

/**
 * Create a new Dineout Restaurant
 * POST /api/dineout
 */
exports.createDineout = async (req, res) => {
  try {
    const data = req.body;

    // Map coords object to flat lat/lng columns
    if (data.coords) {
      data.lat = data.coords.lat;
      data.lng = data.coords.lng;
    }

    const dineout = await Dineout.create(data);
    res.status(201).json({ success: true, data: formatDineout(dineout) });
  } catch (error) {
    console.error('Error creating dineout:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get All Dineout Restaurants
 * GET /api/dineout
 * Query Params: ?city=Name&search=Term&veg=true
 */
exports.getAllDineouts = async (req, res) => {
  try {
    const { city, search, veg } = req.query;
    const whereClause = { is_active: true };

    if (city) {
      whereClause.city = city;
    }

    if (veg === 'true') {
      whereClause.isVeg = true;
    }

    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { tags: { [Op.iLike]: `%${search}%` } },
        { location: { [Op.iLike]: `%${search}%` } }
      ];
    }

    const dineouts = await Dineout.findAll({
      where: whereClause,
      order: [['rating', 'DESC']]
    });

    const formattedData = dineouts.map(formatDineoutForList);

    res.status(200).json({ success: true, count: formattedData.length, data: formattedData });
  } catch (error) {
    console.error('Error fetching dineouts:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get Dineout Restaurant by ID
 * GET /api/dineout/:id
 */
exports.getDineoutById = async (req, res) => {
  try {
    const dineout = await Dineout.findByPk(req.params.id);
    
    if (!dineout) {
      return res.status(404).json({ success: false, message: 'Restaurant not found' });
    }

    res.status(200).json({ success: true, data: formatDineout(dineout) });
  } catch (error) {
    console.error('Error fetching dineout details:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update Dineout Restaurant
 * PUT /api/dineout/:id
 */
exports.updateDineout = async (req, res) => {
  try {
    const data = req.body;

    // Handle coords update
    if (data.coords) {
      data.lat = data.coords.lat;
      data.lng = data.coords.lng;
    }

    const [updated] = await Dineout.update(data, {
      where: { id: req.params.id }
    });

    if (updated) {
      const updatedDineout = await Dineout.findByPk(req.params.id);
      return res.status(200).json({ success: true, data: formatDineout(updatedDineout) });
    }

    return res.status(404).json({ success: false, message: 'Restaurant not found' });
  } catch (error) {
    console.error('Error updating dineout:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Delete Dineout Restaurant
 * DELETE /api/dineout/:id
 */
exports.deleteDineout = async (req, res) => {
  try {
    const deleted = await Dineout.destroy({
      where: { id: req.params.id }
    });

    if (deleted) {
      return res.status(200).json({ success: true, message: 'Restaurant deleted successfully' });
    }

    return res.status(404).json({ success: false, message: 'Restaurant not found' });
  } catch (error) {
    console.error('Error deleting dineout:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Seed Dineout Data (Bulk Create)
 * POST /api/dineout/seed
 */
exports.seedDineouts = async (req, res) => {
  try {
    const itemsData = req.body;
    if (!Array.isArray(itemsData)) {
      return res.status(400).json({ success: false, message: 'Input must be an array' });
    }

    // Map coords for each item
    const formattedItems = itemsData.map(item => ({
      ...item,
      lat: item.coords ? item.coords.lat : null,
      lng: item.coords ? item.coords.lng : null
    }));

    const createdItems = await Dineout.bulkCreate(formattedItems);
    res.status(201).json({ success: true, count: createdItems.length, data: createdItems });
  } catch (error) {
    console.error('Error seeding dineouts:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};