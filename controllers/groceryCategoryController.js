const GroceryCategory = require('../models/groceryCategory');

// Create a new category
exports.createCategory = async (req, res) => {
  try {
    const category = await GroceryCategory.create(req.body);
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all categories
exports.getAllCategories = async (req, res) => {
  try {
    const categories = await GroceryCategory.findAll({
      where: { is_active: true },
      order: [['createdAt', 'ASC']]
    });
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get category by ID
exports.getCategoryById = async (req, res) => {
  try {
    const category = await GroceryCategory.findByPk(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    res.status(200).json({ success: true, data: category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update category
exports.updateCategory = async (req, res) => {
  try {
    const [updated] = await GroceryCategory.update(req.body, {
      where: { id: req.params.id }
    });
    if (updated) {
      const updatedCategory = await GroceryCategory.findByPk(req.params.id);
      return res.status(200).json({ success: true, data: updatedCategory });
    }
    return res.status(404).json({ success: false, message: 'Category not found' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete category
exports.deleteCategory = async (req, res) => {
  try {
    const deleted = await GroceryCategory.destroy({
      where: { id: req.params.id }
    });
    if (deleted) {
      return res.status(200).json({ success: true, message: 'Category deleted successfully' });
    }
    return res.status(404).json({ success: false, message: 'Category not found' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Seed Categories (Bulk Create from your list)
exports.seedCategories = async (req, res) => {
  try {
    const categoriesData = req.body; // Pass the array of categories here
    if (!Array.isArray(categoriesData)) {
      return res.status(400).json({ success: false, message: 'Input must be an array' });
    }
    
    const createdCategories = await GroceryCategory.bulkCreate(categoriesData);
    res.status(201).json({ success: true, count: createdCategories.length, data: createdCategories });
  } catch (error) {
    console.error('Error seeding categories:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};