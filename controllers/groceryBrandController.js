const GroceryBrand = require('../models/groceryBrand');

exports.createBrand = async (req, res) => {
  try {
    const brand = await GroceryBrand.create(req.body);
    res.status(201).json({ success: true, data: brand });
  } catch (error) {
    console.error('Error creating grocery brand:', error);
    res.status(500).json({ success: false, message: 'Failed to create brand', error: error.message });
  }
};

exports.seedBrands = async (req, res) => {
  try {
    const brandsData = req.body;
    if (!Array.isArray(brandsData)) {
      return res.status(400).json({ success: false, message: 'Input must be an array' });
    }
    const brands = await GroceryBrand.bulkCreate(brandsData);
    res.status(201).json({ success: true, count: brands.length, data: brands });
  } catch (error) {
    console.error('Error bulk creating grocery brands:', error);
    res.status(500).json({ success: false, message: 'Failed to seed brands', error: error.message });
  }
};

exports.getAllBrands = async (req, res) => {
  try {
    const whereClause = {};
    if (req.query.active) {
      whereClause.is_active = req.query.active === 'true';
    }
    const brands = await GroceryBrand.findAll({ where: whereClause, order: [['createdAt', 'ASC']] });
    res.status(200).json({ success: true, data: brands });
  } catch (error) {
    console.error('Error fetching grocery brands:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch brands', error: error.message });
  }
};

exports.getBrandById = async (req, res) => {
  try {
    const brand = await GroceryBrand.findByPk(req.params.id);
    if (!brand) {
      return res.status(404).json({ success: false, message: 'Brand not found' });
    }
    res.status(200).json({ success: true, data: brand });
  } catch (error) {
    console.error('Error fetching brand by ID:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch brand', error: error.message });
  }
};

exports.updateBrand = async (req, res) => {
  try {
    const [updated] = await GroceryBrand.update(req.body, { where: { id: req.params.id } });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Brand not found or no changes made' });
    }
    const updatedBrand = await GroceryBrand.findByPk(req.params.id);
    res.status(200).json({ success: true, data: updatedBrand });
  } catch (error) {
    console.error('Error updating brand:', error);
    res.status(500).json({ success: false, message: 'Failed to update brand', error: error.message });
  }
};

exports.deleteBrand = async (req, res) => {
  try {
    const deleted = await GroceryBrand.destroy({ where: { id: req.params.id } });
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Brand not found' });
    }
    res.status(200).json({ success: true, message: 'Brand deleted successfully' });
  } catch (error) {
    console.error('Error deleting brand:', error);
    res.status(500).json({ success: false, message: 'Failed to delete brand', error: error.message });
  }
};