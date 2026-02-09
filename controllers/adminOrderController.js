const GroceryOrder = require('../models/groceryOrderModel');
const DineoutOrder = require('../models/dineoutOrderModel');
const Booking = require('../models/bookingModel');
const Ride = require('../models/rideModel');
const User = require('../models/customUserModel');

/**
 * Get All Orders based on Service
 * GET /api/admin/orders?service=grocery
 */
exports.getAllOrders = async (req, res) => {
  try {
    const { service, status } = req.query;
    let orders = [];

    if (!service) {
      return res.status(400).json({ success: false, message: 'Service query parameter is required (grocery, dineout, event, ride)' });
    }

    switch (service.toLowerCase()) {
      case 'grocery':
        const groceryWhere = {};
        if (status) groceryWhere.status = status;

        orders = await GroceryOrder.findAll({
          where: groceryWhere,
          include: [{ model: User, attributes: ['id', 'first_name', 'last_name', 'phone'] }],
          order: [['createdAt', 'DESC']]
        });
        break;

      case 'dineout':
        const dineoutWhere = {};
        if (status) dineoutWhere.status = status;
        
        orders = await DineoutOrder.findAll({
          where: dineoutWhere,
          order: [['createdAt', 'DESC']]
        });
        break;

      case 'event':
        const eventWhere = {};
        if (status) eventWhere.status = status;

        orders = await Booking.findAll({
          where: eventWhere,
          order: [['createdAt', 'DESC']]
        });
        break;

      case 'ride':
        const rideWhere = {};
        if (status) rideWhere.status = status;

        orders = await Ride.findAll({
          where: rideWhere,
          include: [{ model: User, attributes: ['id', 'first_name', 'last_name', 'phone'] }],
          order: [['createdAt', 'DESC']]
        });
        break;

      default:
        return res.status(400).json({ success: false, message: 'Invalid service type. Use: grocery, dineout, event, or ride.' });
    }

    res.status(200).json({ success: true, count: orders.length, data: orders });

  } catch (error) {
    console.error('Admin Get Orders Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get Order Details by ID
 * GET /api/admin/orders/:id?service=grocery
 */
exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const { service } = req.query;

    if (!service) {
      return res.status(400).json({ success: false, message: 'Service query parameter is required' });
    }

    let order;

    switch (service.toLowerCase()) {
      case 'grocery':
        order = await GroceryOrder.findByPk(id, {
          include: [{ model: User, attributes: ['id', 'first_name', 'last_name', 'phone', 'email'] }]
        });
        break;

      case 'dineout':
        order = await DineoutOrder.findByPk(id);
        break;

      case 'event':
        order = await Booking.findByPk(id);
        break;

      case 'ride':
        order = await Ride.findByPk(id, {
          include: [{ model: User, attributes: ['id', 'first_name', 'last_name', 'phone', 'email'] }]
        });
        break;

      default:
        return res.status(400).json({ success: false, message: 'Invalid service type' });
    }

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.status(200).json({ success: true, data: order });

  } catch (error) {
    console.error('Admin Get Order Details Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update Order Status
 * PATCH /api/admin/orders
 * Body: { service: 'grocery', orderId: 1, status: 'CONFIRMED' }
 */
exports.updateOrderStatus = async (req, res) => {
  try {
    const { service, orderId, status } = req.body;

    if (!service || !orderId || !status) {
      return res.status(400).json({ success: false, message: 'Service, orderId, and status are required' });
    }

    let order;
    let updated = false;

    switch (service.toLowerCase()) {
      case 'grocery':
        order = await GroceryOrder.findByPk(orderId);
        if (order) {
          order.status = status;
          order.timeline = [...(order.timeline || []), { status: status, time: new Date() }];
          await order.save();
          updated = true;
        }
        break;

      case 'dineout':
        order = await DineoutOrder.findByPk(orderId);
        if (order) {
          order.status = status;
          await order.save();
          updated = true;
        }
        break;

      case 'event':
        order = await Booking.findByPk(orderId);
        if (order) {
          order.status = status;
          await order.save();
          updated = true;
        }
        break;

      case 'ride':
        order = await Ride.findByPk(orderId);
        if (order) {
          order.status = status;
          await order.save();
          updated = true;
        }
        break;

      default:
        return res.status(400).json({ success: false, message: 'Invalid service type' });
    }

    if (!updated || !order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    res.status(200).json({ success: true, message: 'Order status updated', data: order });

  } catch (error) {
    console.error('Admin Update Order Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};