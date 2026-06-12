const SidebarItem = require('../models/sidebarItemModel');
const { Op } = require('sequelize');
const jwt = require('jsonwebtoken');

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
    const items = await SidebarItem.findAll({ 
      order: [['id', 'ASC']] // Keeps order consistent
    });
    res.status(200).json({ success: true, count: items.length, data: items });
  } catch (error) {
    console.error('Error fetching sidebar items:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch items', error: error.message });
  }
};

// Get valid sidebar items for logged-in user based on role
exports.getValidItems = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    let userRole;
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_key_123');
      userRole = decoded.role || 'user';
    } catch (err) {
      try {
        const decodedAdmin = jwt.verify(token, process.env.JWT_SECRET || "django-insecure-0v(fl_v5t97hk)0mx&qq!b80ua)@-a@2e(5v4nac!$3l(m@9#(");
        userRole = decodedAdmin.role || 'admin';
      } catch (adminErr) {
        return res.status(401).json({ success: false, message: 'Invalid or expired token' });
      }
    }

    const items = await SidebarItem.findAll({ 
      where: {
        is_active: true,
        [Op.or]: [
          { requiredRole: { [Op.contains]: [userRole] } }, 
          { requiredRole: null },                                
          { requiredRole: { [Op.eq]: [] } },
          { requiredRole: { [Op.eq]: '[]' } }
        ]
      },
      order: [['id', 'ASC']] 
    });
    res.status(200).json({ success: true, count: items.length, data: items });
  } catch (error) {
    console.error('Error fetching valid sidebar items:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch valid items', error: error.message });
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