const SidebarItem = require('../models/sidebarItemModel');
const { Op } = require('sequelize');

// Create a new sidebar item
exports.createItem = async (req, res) => {
  try {
    const item = await SidebarItem.create(req.body);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    console.error('Error creating sidebar item:', error);
    res.status(500).json({ success: false, message: 'Failed to create item', error: error.message });
  }
};

// Seed multiple sidebar items (Useful for initial setup)
exports.seedItems = async (req, res) => {
  try {
    const itemsData = req.body;
    if (!Array.isArray(itemsData)) {
      return res.status(400).json({ success: false, message: 'Input must be an array' });
    }
    const items = await SidebarItem.bulkCreate(itemsData);
    res.status(201).json({ success: true, count: items.length, data: items });
  } catch (error) {
    console.error('Error bulk creating sidebar items:', error);
    res.status(500).json({ success: false, message: 'Failed to seed items', error: error.message });
  }
};

// Get all sidebar items
exports.getAllItems = async (req, res) => {
  try {
    const whereClause = {};
    // Optional: Filter active only
    if (req.query.active) {
      whereClause.is_active = req.query.active === 'true';
    }
    // Optional: Filter by role (returns items that require this role, OR items that require no role)
    if (req.query.role) {
      whereClause[Op.or] = [
        { requiredRole: { [Op.contains]: [req.query.role] } }, // Array contains the specific role
        { requiredRole: null },                                // No role specified
        { requiredRole: [] }                                   // Empty array (no role required)
      ];
    }

    const items = await SidebarItem.findAll({ 
      where: whereClause,
      order: [['id', 'ASC']] // Keeps order consistent
    });
    res.status(200).json({ success: true, count: items.length, data: items });
  } catch (error) {
    console.error('Error fetching sidebar items:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch items', error: error.message });
  }
};

// Get sidebar item by ID
exports.getItemById = async (req, res) => {
  try {
    const item = await SidebarItem.findByPk(req.params.id);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Sidebar item not found' });
    }
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    console.error('Error fetching sidebar item:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch item', error: error.message });
  }
};

// Update sidebar item
exports.updateItem = async (req, res) => {
  try {
    const [updated] = await SidebarItem.update(req.body, { where: { id: req.params.id } });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Sidebar item not found or no changes made' });
    }
    const updatedItem = await SidebarItem.findByPk(req.params.id);
    res.status(200).json({ success: true, data: updatedItem });
  } catch (error) {
    console.error('Error updating sidebar item:', error);
    res.status(500).json({ success: false, message: 'Failed to update item', error: error.message });
  }
};

// Delete sidebar item
exports.deleteItem = async (req, res) => {
  try {
    const deleted = await SidebarItem.destroy({ where: { id: req.params.id } });
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Sidebar item not found' });
    }
    res.status(200).json({ success: true, message: 'Sidebar item deleted successfully' });
  } catch (error) {
    console.error('Error deleting sidebar item:', error);
    res.status(500).json({ success: false, message: 'Failed to delete item', error: error.message });
  }
};