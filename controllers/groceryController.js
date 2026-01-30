const GroceryItem = require('../models/groceryItem');
const { Op } = require('sequelize');
const sequelize = require('../db');

// Create a new grocery item
exports.createItem = async (req, res) => {
  try {
    const item = await GroceryItem.create(req.body);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    console.error('Error creating grocery item:', error);
    res.status(500).json({ success: false, message: 'Failed to create item', error: error.message });
  }
};

// Bulk create grocery items
exports.createBulkItems = async (req, res) => {
  try {
    const itemsData = req.body;
    if (!Array.isArray(itemsData)) {
      return res.status(400).json({ success: false, message: 'Input must be an array' });
    }
    const items = await GroceryItem.bulkCreate(itemsData);
    res.status(201).json({ success: true, count: items.length, data: items });
  } catch (error) {
    console.error('Error bulk creating grocery items:', error);
    res.status(500).json({ success: false, message: 'Failed to create items', error: error.message });
  }
};

// Get all grocery items
exports.getAllItems = async (req, res) => {
  try {
    // Optional: Filter by category or active status via query params
    const whereClause = {};
    if (req.query.category) whereClause.category = req.query.category;
    if (req.query.active) whereClause.is_active = req.query.active === 'true';
    if (req.query.brand) whereClause.brand = req.query.brand;
    if (req.query.featured) whereClause.is_featured = req.query.featured === 'true';

    const items = await GroceryItem.findAll({ where: whereClause });
    res.status(200).json({ success: true, data: items });
  } catch (error) {
    console.error('Error fetching grocery items:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch items', error: error.message });
  }
};

// Get a single item by ID
exports.getItemById = async (req, res) => {
  try {
    const item = await GroceryItem.findByPk(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }

    // Fetch suggestions based on Category and Tags
    const whereClause = {
      is_active: true,
      id: { [Op.ne]: item.id }
    };

    const orConditions = [];
    if (item.category) {
      orConditions.push({ category: item.category });
    }
    // Attempt to match tags if they exist and are an array (Postgres JSONB overlap)
    if (item.tags && Array.isArray(item.tags) && item.tags.length > 0) {
      // Use raw literal for JSONB overlap (?|) as Op.overlap (&&) is for Arrays
      const escapedTags = item.tags.map(tag => `'${tag.replace(/'/g, "''")}'`).join(',');
      orConditions.push(sequelize.literal(`tags ?| ARRAY[${escapedTags}]`));
    }

    if (orConditions.length > 0) {
      whereClause[Op.or] = orConditions;
    }

    const suggestions = await GroceryItem.findAll({
      where: whereClause,
      limit: 10,
      order: sequelize.random()
    });

    const formatProduct = (prod) => ({
      id: prod.id,
      name: prod.name,
      weight: `${parseFloat(prod.unit_value)} ${prod.unit}`,
      price: Math.max(0, parseFloat(prod.price) - (parseFloat(prod.discount) || 0)),
      originalPrice: parseFloat(prod.price),
      discount: parseFloat(prod.price) > 0 ? Math.round(((parseFloat(prod.discount) || 0) / parseFloat(prod.price)) * 100) : 0,
      img: prod.image_url,
      stock: prod.stock
    });

    res.status(200).json({ success: true, data: item, suggestions: suggestions.map(formatProduct) });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching item', error: error.message });
  }
};

// Update an item
exports.updateItem = async (req, res) => {
  try {
    const [updated] = await GroceryItem.update(req.body, { where: { id: req.params.id } });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Item not found or no changes made' });
    }
    const updatedItem = await GroceryItem.findByPk(req.params.id);
    res.status(200).json({ success: true, data: updatedItem });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update item', error: error.message });
  }
};

// Delete an item
exports.deleteItem = async (req, res) => {
  try {
    const deleted = await GroceryItem.destroy({ where: { id: req.params.id } });
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    res.status(200).json({ success: true, message: 'Item deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete item', error: error.message });
  }
};