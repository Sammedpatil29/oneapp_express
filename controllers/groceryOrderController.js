const GroceryOrder = require('../models/groceryOrderModel');
const jwt = require('jsonwebtoken');

/**
 * Create a new Grocery Order
 * POST /api/grocery-order/create
 * Headers: Authorization: Bearer <token>
 * Body: {
 *   cartItems: Object (Required),
 *   billDetails: Object (Required),
 *   address: Object (Required),
 *   status: String (Optional, default: 'PENDING')
 * }
 */
exports.createOrder = async (req, res) => {
  try {
    // 1. Verify Token
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    let userId;

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_key_123');
      userId = decoded.id;
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    // 2. Extract Data
    const { cartItems, billDetails, address, status } = req.body;

    if (!cartItems || !billDetails || !address) {
      return res.status(400).json({ success: false, message: 'Cart items, bill details, and address are required' });
    }

    // 3. Create Order
    const order = await GroceryOrder.create({
      user_id: userId,
      cart_items: cartItems,
      bill_details: billDetails,
      address: address,
      status: status || 'PENDING'
    });

    res.status(201).json({ success: true, message: 'Order placed successfully', data: order });
  } catch (error) {
    console.error('Error creating grocery order:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get all Grocery Orders for the logged-in user
 * GET /api/grocery-order/list
 * Headers: Authorization: Bearer <token>
 */
exports.getOrders = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_key_123');
    const userId = decoded.id;

    const orders = await GroceryOrder.findAll({
      where: { user_id: userId },
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({ success: true, data: orders });
  } catch (error) {
    console.error('Error fetching grocery orders:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get a specific Grocery Order by ID
 * GET /api/grocery-order/:id
 * Headers: Authorization: Bearer <token>
 */
exports.getOrderById = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    let userId;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_key_123');
      userId = decoded.id;
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    const order = await GroceryOrder.findByPk(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.user_id !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to this order' });
    }

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    console.error('Error fetching grocery order details:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};