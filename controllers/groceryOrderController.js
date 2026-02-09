const GroceryOrder = require('../models/groceryOrderModel');
const GroceryItem = require('../models/groceryItem');
const GroceryCartItem = require('../models/groceryCartItem');
const jwt = require('jsonwebtoken');
const Razorpay = require('razorpay');
const { verifyUserJwtToken } = require('../utils/jwttoken');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_S5RLYqr6y2I6xs',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'q2lFxfOyVyAkD1GQMbitqNre',
});

/**
 * Create a new Grocery Order
 * POST /api/grocery-order/create
 * Headers: Authorization: Bearer <token>
 * Body: {
 *   cartItems: Object (Required),
 *   billDetails: Object (Required),
 *   address: Object (Required),
 *   paymentDetails: Object (Optional),
 *   riderDetails: Object (Optional),
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
    const { cartItems, billDetails, address, status, paymentDetails, riderDetails } = req.body;

    if (!cartItems || !billDetails || !address) {
      return res.status(400).json({ success: false, message: 'Cart items, bill details, and address are required' });
    }

    // 3. Create Order
    const order = await GroceryOrder.create({
      user_id: userId,
      cart_items: cartItems,
      bill_details: billDetails,
      address: address,
      payment_details: paymentDetails,
      rider_details: riderDetails,
      status: status || 'PENDING',
      timeline: [{ status: status || 'PENDING', time: new Date() }]
    });

    // 4. Handle Online Payment (Create Razorpay Order)
    if (paymentDetails && paymentDetails.mode === 'online') {
      const amount = Math.round(parseFloat(billDetails.toPay) * 100); // Amount in paise
      const options = {
        amount: amount,
        currency: "INR",
        receipt: `grocery_rcpt_${order.id}`,
        notes: { order_id: order.id, user_id: userId, type: 'grocery' }
      };

      const rzpOrder = await razorpay.orders.create(options);
      
      order.razorpay_order_id = rzpOrder.id;
      await order.save();

      return res.status(201).json({
        success: true,
        internal_order_id: order.id, // Direct ID, no prefix needed since logic is local
        razorpay_order_id: rzpOrder.id,
        amount: billDetails.toPay,
        currency: "INR"
      });
    }

    // 4. Handle COD Logic (Reduce Stock & Clear Cart)
    if (paymentDetails && paymentDetails.mode === 'cod') {
      // Reduce Stock
      if (Array.isArray(cartItems)) {
        for (const item of cartItems) {
          if (item.productId && item.quantity) {
            const product = await GroceryItem.findByPk(item.productId);
            if (product) {
              const newStock = product.stock - item.quantity;
              await product.update({ stock: newStock >= 0 ? newStock : 0 });
            }
          }
        }
      }

      // Clear Cart
      await GroceryCartItem.destroy({ where: { user_id: userId } });
    }

    res.status(201).json({ success: true, message: 'Order placed successfully', data: order });
  } catch (error) {
    console.error('Error creating grocery order:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update Order Status
 * POST /api/grocery-order/update-status
 * Body: { orderId: <id>, status: <string> }
 */
exports.updateOrderStatus = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const authData = await verifyUserJwtToken(token);

    if (!authData) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    const { orderId, status } = req.body;

    if (!orderId || !status) {
      return res.status(400).json({ success: false, message: 'Order ID and status are required' });
    }

    const order = await GroceryOrder.findByPk(orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Update status preserving structure
    order.status = status;
    order.timeline = [...(order.timeline || []), { status: status, time: new Date() }];
    await order.save();

    res.status(200).json({ success: true, message: 'Order status updated successfully', data: order });
  } catch (error) {
    console.error('Error updating grocery order status:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Verify Payment Status for Grocery Order
 * POST /api/grocery-order/verify-payment
 * Body: { orderId: <internal_order_id> }
 */
exports.verifyPayment = async (req, res) => {
  try {
    const { orderId } = req.body;

    const order = await GroceryOrder.findByPk(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // If already paid, return success immediately
    if (order.status === 'PAID' || order.status === 'CONFIRMED') {
      return res.status(200).json({ success: true, status: 'paid', order });
    }

    // Check Razorpay Status
    if (order.razorpay_order_id) {
      const payments = await razorpay.orders.fetchPayments(order.razorpay_order_id);
      const paidPayment = payments.items.find(p => p.status === 'captured');

      if (paidPayment) {
        // 1. Update Order
        order.status = 'PAID';
        order.timeline = [...(order.timeline || []), { status: 'PAID', time: new Date() }];
        order.razorpay_payment_id = paidPayment.id;
        await order.save();

        // 2. Reduce Stock
        const cartItems = order.cart_items;
        if (Array.isArray(cartItems)) {
          for (const item of cartItems) {
            if (item.productId && item.quantity) {
              const product = await GroceryItem.findByPk(item.productId);
              if (product) {
                const newStock = product.stock - item.quantity;
                await product.update({ stock: newStock >= 0 ? newStock : 0 });
              }
            }
          }
        }

        // 3. Clear Cart
        await GroceryCartItem.destroy({ where: { user_id: order.user_id } });

        return res.status(200).json({ success: true, status: 'paid', order });
      }
    }

    return res.status(200).json({ success: true, status: 'pending', message: 'Payment not yet captured' });
  } catch (error) {
    console.error('Error verifying grocery payment:', error);
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
 * Cancel Grocery Order
 * POST /api/grocery-order/cancel
 * Body: { orderId: <id> }
 */
exports.cancelOrder = async (req, res) => {
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

    const { orderId } = req.body;
    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Order ID is required' });
    }

    const order = await GroceryOrder.findByPk(orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.user_id !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized access to this order' });
    }

    if (order.status === 'CANCELLED') {
      return res.status(200).json({ success: true, data: order });
    }

    // Restore Stock Logic: If COD or PAID, stock was previously reduced, so we add it back.
    const isCod = order.payment_details && order.payment_details.mode === 'cod';
    const isPaid = order.status === 'PAID';

    if (isCod || isPaid) {
      const cartItems = order.cart_items;
      if (Array.isArray(cartItems)) {
        for (const item of cartItems) {
          if (item.productId && item.quantity) {
            const product = await GroceryItem.findByPk(item.productId);
            if (product) {
              await product.update({ stock: product.stock + item.quantity });
            }
          }
        }
      }
    }

    order.status = 'CANCELLED';
    order.timeline = [...(order.timeline || []), { status: 'CANCELLED', time: new Date() }];
    order.rider_details = null;
    await order.save();

    res.status(200).json({ success: true, data: order });
  } catch (error) {
    console.error('Error cancelling grocery order:', error);
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