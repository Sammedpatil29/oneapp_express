const Metadata = require('../models/metadataModel'); // Ensure the model is in the models folder

/**
 * Query specific metadata fields
 * POST /api/metadata/query
 * Body Example: { "fields": ["categories", "status", "roles", "routes"] }
 */
exports.queryMetadata = async (req, res) => {
  try {
    const { fields } = req.body;
    const metadata = await Metadata.findOne();

    if (!metadata) {
      return res.status(200).json({ success: true, data: {} });
    }

    // If no fields array is provided or it's empty, return all metadata
    if (!fields || !Array.isArray(fields) || fields.length === 0) {
      return res.status(200).json({ success: true, data: metadata });
    }

    // Filter the response to only include the requested fields
    const responseData = {};
    fields.forEach((field) => {
      if (metadata[field] !== undefined) {
        responseData[field] = metadata[field];
      }
    });

    return res.status(200).json({ success: true, data: responseData });
  } catch (error) {
    console.error('Query Metadata Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get All Metadata
 * GET /api/metadata
 */
exports.getMetadata = async (req, res) => {
  try {
    // Fetch the first record (assuming single configuration row)
    let metadata = await Metadata.findOne();

    if (!metadata) {
      // Return empty structure if not found, rather than 404
      return res.status(200).json({ success: true, data: {} });
    }

    res.status(200).json({ success: true, data: metadata });
  } catch (error) {
    console.error('Get Metadata Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update Metadata
 * PATCH /api/metadata
 * Body: { polygon: [...], categories: [...], status: [...], locations: [...], roles: [...], routes: [...] }
 */
exports.updateMetadata = async (req, res) => {
  try {
    const { polygon, locations, status, categories, roles, routes } = req.body;
    const updateData = {};

    const isArray = (val) => Array.isArray(val);

    if (polygon !== undefined) updateData.polygon = polygon;
    
    if (locations !== undefined) {
      if (!isArray(locations)) return res.status(400).json({ success: false, message: 'locations must be an array' });
      updateData.locations = locations;
    }
    if (status !== undefined) {
      if (!isArray(status)) return res.status(400).json({ success: false, message: 'status must be an array' });
      updateData.status = status;
    }
    if (categories !== undefined) {
      if (!isArray(categories)) return res.status(400).json({ success: false, message: 'categories must be an array' });
      updateData.categories = categories;
    }
    if (roles !== undefined) {
      if (!isArray(roles)) return res.status(400).json({ success: false, message: 'roles must be an array' });
      updateData.roles = roles;
    }
    if (routes !== undefined) {
      if (!isArray(routes)) return res.status(400).json({ success: false, message: 'routes must be an array' });
      updateData.routes = routes;
    }

    // Find existing record or create new one
    let metadata = await Metadata.findOne();

    if (metadata) {
      // Update existing record with the incoming fields
      await metadata.update(updateData);
    } else {
      metadata = await Metadata.create(updateData);
    }

    res.status(200).json({ success: true, message: 'Metadata updated successfully', data: metadata });
  } catch (error) {
    console.error('Update Metadata Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};