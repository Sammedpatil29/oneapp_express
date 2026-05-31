const Coupon = require('../models/couponModel');

/**
 * Create a new Coupon
 * POST /api/coupons
 */
exports.createCoupon = async (req, res) => {
  try {
    const { code, discount, min_order, expiry_date, is_active, condition } = req.body;
    
    if (!code || !discount || !min_order || !expiry_date) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const newCoupon = await Coupon.create({
      code, discount, min_order, expiry_date, is_active, condition
    });

    res.status(201).json({ success: true, message: 'Coupon created successfully', data: newCoupon });
  } catch (error) {
    console.error('Create Coupon Error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, message: 'Coupon code already exists' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get All Coupons
 * GET /api/coupons
 */
exports.getAllCoupons = async (req, res) => {
  try {
    const coupons = await Coupon.findAll();
    res.status(200).json({ success: true, count: coupons.length, data: coupons });
  } catch (error) {
    console.error('Get All Coupons Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get Coupon by ID
 * GET /api/coupons/:id
 */
exports.getCouponById = async (req, res) => {
  try {
    const { id } = req.params;
    const coupon = await Coupon.findByPk(id);
    
    if (!coupon) {
      return res.status(404).json({ success: false, message: 'Coupon not found' });
    }

    res.status(200).json({ success: true, data: coupon });
  } catch (error) {
    console.error('Get Coupon Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update a Coupon
 * PUT /api/coupons/:id
 */
exports.updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const [updatedRowsCount] = await Coupon.update(req.body, { where: { id } });

    if (updatedRowsCount === 0) {
      return res.status(404).json({ success: false, message: 'Coupon not found or no changes made' });
    }

    const updatedCoupon = await Coupon.findByPk(id);
    res.status(200).json({ success: true, message: 'Coupon updated successfully', data: updatedCoupon });
  } catch (error) {
    console.error('Update Coupon Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Delete a Coupon
 * DELETE /api/coupons/:id
 */
exports.deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Coupon.destroy({ where: { id } });

    if (deleted) {
      return res.status(200).json({ success: true, message: 'Coupon deleted successfully' });
    }

    return res.status(404).json({ success: false, message: 'Coupon not found' });
  } catch (error) {
    console.error('Delete Coupon Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};