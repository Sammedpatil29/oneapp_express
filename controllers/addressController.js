// controllers/addressController.js
const Address = require('../models/Address');
const sequelize = require('../db');

/**
 * 1. Add New Address
 * Helper: Mark a specific address as primary for a user.
 * Unsets all other addresses for that user, then sets the target.
 */
const markAsPrimary = async (userId, addressId) => {
  const t = await sequelize.transaction();
  try {
    await Address.update(
      { is_primary: false },
      { where: { user_id: userId }, transaction: t }
    );
    await Address.update(
      { is_primary: true },
      { where: { id: addressId, user_id: userId }, transaction: t }
    );
    await t.commit();
  } catch (err) {
    await t.rollback();
    throw err;
  }
};

/**
 * 1. Add New Address (auto-marks as primary)
 * POST /api/addresses
 */
const createAddress = async (req, res) => {
  try {
    const user_id = req.user.id;

    const newAddress = await Address.create({ ...req.body, user_id });
    

    // Auto-mark newly saved address as primary
    await markAsPrimary(user_id, newAddress.id);
    await newAddress.reload();

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
 * 2. Get Addresses for Logged-in User
 * GET /api/addresses
 */
const getAddresses = async (req, res) => {
  try {
    const userId = req.user.id;

    const addresses = await Address.findAll({
      where: { user_id: userId },
      order: [['is_primary', 'DESC'], ['createdAt', 'DESC']]
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
    const userId = req.user.id;

    const [updated] = await Address.update(req.body, {
      where: { id: id, user_id: userId }
    });

    if (updated) {
      if (req.body.is_primary === true || req.body.is_primary === 'true') {
        await markAsPrimary(userId, id);
      }
      const updatedAddress = await Address.findOne({ where: { id, user_id: userId } });
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
    const userId = req.user.id;

    const deleted = await Address.destroy({
      where: { id: id, user_id: userId }
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

/**
 * 5. Set an existing address as primary
 * PUT /api/addresses/:id/set-primary
 */
const setPrimaryAddress = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const address = await Address.findOne({ where: { id, user_id: userId } });
    if (!address) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }

    await markAsPrimary(userId, id);
    await address.reload();

    return res.json({
      success: true,
      message: 'Address set as primary',
      data: address
    });
  } catch (error) {
    console.error('Set Primary Address Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * 6. Get the user's primary address
 * GET /api/addresses/primary
 */
const getPrimaryAddress = async (req, res) => {
  try {
    const userId = req.user.id;

    const primary = await Address.findOne({
      where: { user_id: userId, is_primary: true }
    });

    return res.json({
      success: true,
      data: primary || null
    });
  } catch (error) {
    console.error('Get Primary Address Error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  createAddress,
  getAddresses,
  updateAddress,
  deleteAddress,
  setPrimaryAddress,
  getPrimaryAddress
};
