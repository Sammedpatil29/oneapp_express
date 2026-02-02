const Booking = require('../models/bookingModel');
const Event = require('../models/eventsModel');
const DineoutOrder = require('../models/dineoutOrderModel');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');

// Helper to get user ID from token
const getUserIdFromToken = (req) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_key_123');
    return decoded.id;
  } catch (e) {
    return null;
  }
};

exports.getHistory = async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { type } = req.body;
    let historyData = [];

    // 1. Fetch Events
    if (!type || type === 'event' || type === 'all') {
      const bookings = await Booking.findAll({
        where: { 
          user_id: userId,
          status: { [Op.notIn]: ['pending', 'failed'] }
        },
        include: [{
          model: Event,
          attributes: ['title']
        }],
        order: [['createdAt', 'DESC']]
      });

      const eventHistory = bookings.map(booking => ({
        id: booking.id,
        type: 'event',
        title: booking.Event ? booking.Event.title : 'Unknown Event',
        created_at: booking.createdAt,
        status: booking.status,
        finalCost: booking.total_amount,
        user: booking.user_id
      }));

      historyData = [...historyData, ...eventHistory];
    }

    // 2. Fetch Dineout Orders
    if (!type || type === 'dineout' || type === 'all') {
      const dineoutOrders = await DineoutOrder.findAll({
        where: { user_id: userId },
        order: [['createdAt', 'DESC']]
      });

      const dineoutHistory = dineoutOrders.map(order => {
        const bill = order.bill_details || {};
        // Attempt to find a total amount field in the JSONB bill_details
        const cost = bill.grandTotal || bill.totalAmount || bill.toPay || 0;

        return {
          id: order.id,
          type: 'dineout',
          title: order.restaurant_name,
          created_at: order.createdAt,
          status: order.status,
          finalCost: cost,
          user: order.user_id
        };
      });

      historyData = [...historyData, ...dineoutHistory];
    }

    // Sort combined data by createdAt DESC (Newest first)
    historyData.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return res.status(200).json({ success: true, data: historyData });

  } catch (error) {
    console.error('Get History Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};