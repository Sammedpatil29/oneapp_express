const Metadata = require('../models/metadataModel'); // Ensure the model is in the models folder

/**
 * Get Metadata (Polygon)
 * GET /api/metadata
 */
exports.getPolygon = async (req, res) => {
  try {
    // Fetch the first record (assuming single configuration row)
    let metadata = await Metadata.findOne();

    if (!metadata) {
      // Return empty structure if not found, rather than 404
      return res.status(200).json({ success: true, data: { polygon: [] } });
    }

    res.status(200).json({ success: true, data: metadata });
  } catch (error) {
    console.error('Get Metadata Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update Polygon
 * PATCH /api/metadata
 * Body: { polygon: [{ lat, lng }, ...] }
 */
exports.updatePolygon = async (req, res) => {
  try {
    const { polygon } = req.body;

    if (!polygon || !Array.isArray(polygon)) {
      return res.status(400).json({ success: false, message: 'Polygon must be an array of coordinates' });
    }
    
    if (polygon.length > 0 && (polygon[0].lat === undefined || polygon[0].lng === undefined)) {
      return res.status(400).json({ success: false, message: 'Polygon points must be objects with lat and lng properties' });
    }

    // Find existing record or create new one
    let metadata = await Metadata.findOne();

    if (metadata) {
      metadata.polygon = polygon;
      await metadata.save();
    } else {
      metadata = await Metadata.create({ polygon });
    }

    res.status(200).json({ success: true, message: 'Polygon updated successfully', data: metadata });
  } catch (error) {
    console.error('Update Metadata Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};