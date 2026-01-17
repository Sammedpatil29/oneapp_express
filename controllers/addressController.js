// controllers/addressController.js
const Address = require('../models/Address');

/**
 * 1. Add New Address
 * POST /api/addresses
 */
const createAddress = async (req, res) => {
  try {
    // Ensure user_id is provided (either from body or auth middleware)
    const { user_id, lat, lng, address, landmark, label, house_no } = req.body;

    if (!user_id) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    const newAddress = await Address.create(req.body);
    
    return res.status(201).json({ 
      success: true, 
      message: 'Address added successfully', 
      data: newAddress 
    });
  } catch (error) {
    console.error('Create Address Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 2. Get Addresses by User ID
 * GET /api/addresses/user/:userId
 */
const getAddressesByUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const addresses = await Address.findAll({
      where: { user_id: userId },
      order: [['createdAt', 'DESC']] // Newest first
    });

    return res.json({ 
      success: true, 
      count: addresses.length, 
      data: addresses 
    });
  } catch (error) {
    console.error('Fetch Address Error:', error);
    return res.status(500).json({ success: false, message: 'Server error fetching addresses' });
  }
};

/**
 * 3. Update Address
 * PUT /api/addresses/:id
 */
const updateAddress = async (req, res) => {
  try {
    const { id } = req.params;

    const [updated] = await Address.update(req.body, {
      where: { id: id }
    });

    if (updated) {
      const updatedAddress = await Address.findByPk(id);
      return res.json({ 
        success: true, 
        message: 'Address updated successfully', 
        data: updatedAddress 
      });
    }

    return res.status(404).json({ success: false, message: 'Address not found' });
  } catch (error) {
    console.error('Update Address Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 4. Delete Address
 * DELETE /api/addresses/:id
 */
const deleteAddress = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Address.destroy({
      where: { id: id }
    });

    if (deleted) {
      return res.json({ success: true, message: 'Address deleted successfully' });
    }

    return res.status(404).json({ success: false, message: 'Address not found' });
  } catch (error) {
    console.error('Delete Address Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createAddress,
  getAddressesByUser,
  updateAddress,
  deleteAddress
};