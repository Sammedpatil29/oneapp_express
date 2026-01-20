const Booking = require('../models/bookingModel');
const Event = require('../models/eventsModel');
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

    if (type === 'event') {
      const bookings = await Booking.findAll({
        where: { 
          user_id: userId,
          status: { [Op.ne]: 'pending' },
          status: { [Op.ne]: 'failed' }
        },
        include: [{
          model: Event,
          attributes: ['title']
        }],
        order: [['createdAt', 'ASC']]
      });

      const history = bookings.map(booking => ({
        id: booking.id,
        type: 'event',
        title: booking.Event ? booking.Event.title : 'Unknown Event',
        created_at: booking.createdAt,
        status: booking.status, // e.g., 'paid', 'pending'
        finalCost: booking.total_amount,
        user: booking.user_id
      }));

      return res.status(200).json({ success: true, data: history });
    }

    // Default empty for other types for now
    return res.status(200).json({ success: true, data: [] });

  } catch (error) {
    console.error('Get History Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};