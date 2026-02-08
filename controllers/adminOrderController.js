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
        // GroceryOrder has a JSONB status field: { status: 'PENDING', time: ... }
        orders = await GroceryOrder.findAll({
          include: [{ model: User, attributes: ['id', 'first_name', 'last_name', 'phone'] }],
          order: [['createdAt', 'DESC']]
        });

        // Filter in memory for JSONB status if a status filter is provided
        if (status) {
          orders = orders.filter(o => o.status && o.status.status === status);
        }
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
          // Preserve existing status object structure for Grocery
          order.status = { ...order.status, status: status, time: new Date() };
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