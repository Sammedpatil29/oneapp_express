const DineoutOrder = require('../models/dineoutOrderModel');
const Dineout = require('../models/dineoutModel');
const jwt = require('jsonwebtoken');

exports.createDineoutOrder = async (req, res) => {
  try {
    // 1. Extract and Verify Token
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

    // 2. Extract Data from Body
    const {
      restaurantId,
      restaurantName,
      guestCount,
      date,
      timeSlot,
      offerApplied,
      billDetails
    } = req.body;

    // 3. Create Order
    const order = await DineoutOrder.create({
      user_id: userId,
      restaurant_id: restaurantId,
      restaurant_name: restaurantName,
      guest_count: guestCount,
      booking_date: date,
      time_slot: timeSlot,
      offer_applied: offerApplied,
      bill_details: billDetails,
      status: 'CONFIRMED'
    });

    const restaurant = await Dineout.findByPk(restaurantId);
    const responseData = {
      ...order.toJSON(),
      coords: restaurant ? { lat: restaurant.lat, lng: restaurant.lng } : {},
      contact: restaurant ? restaurant.contact : null
    };

    res.status(201).json({ success: true, message: 'Order placed successfully', data: responseData });
  } catch (error) {
    console.error('Error creating dineout order:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getDineoutOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Order ID is required' });
    }

    const order = await DineoutOrder.findByPk(orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    let info = {}
    if(order.status === 'CANCELLED'){
      info = {
        message: 'Booking Cancelled!',
        sub: 'Your booking has been cancelled!',
        color: 'bg-danger',
        icon: 'close-circle-outline'
      }
    } else if (order.status === 'CONFIRMED') {
      info = {
        message: 'Booking Confirmed!',
        sub: 'Your table is reserved successfully!',
        color: 'bg-success',
        icon: 'checkmark-circle'
      }
    } else if (order.status === 'verifying') {
      info = {
        message: 'Bill Verifying!',
        sub: 'Your bill is being verified!',
        color: 'bg-warning',
        icon: 'close-circle-outline'
      }
     } else {
        info = {
          message: 'Booking Completed!',
          sub: 'Your booking has been completed!',
          color: 'bg-success',
          icon: 'checkmark-circle'
        }
      }

    const restaurant = await Dineout.findByPk(order.restaurant_id);
    const responseData = {
      ...order.toJSON(),
      coords: restaurant ? { lat: restaurant.lat, lng: restaurant.lng } : {},
      contact: restaurant ? restaurant.contact : null,
      info: {
        message: 'Booking Confirmed!',
        sub: 'Your table is reserved successfully!',
        color: 'bg-success',
        icon: 'checkmark-circle'
      }
    };

    res.status(200).json({ success: true, data: responseData });
  } catch (error) {
    console.error('Error fetching dineout order details:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.cancelDineoutOrder = async (req, res) => {
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

    // 2. Find and Update Order
    const { orderId } = req.body;
    const order = await DineoutOrder.findByPk(orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.user_id !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized to cancel this order' });
    }

    order.status = 'CANCELLED';
    await order.save();


    const restaurant = await Dineout.findByPk(order.restaurant_id);
    const responseData = {
      ...order.toJSON(),
      coords: restaurant ? { lat: restaurant.lat, lng: restaurant.lng } : {},
      contact: restaurant ? restaurant.contact : null,
      info: {
        message: 'Booking Cancelled!',
        sub: 'Your booking has been cancelled!',
        color: 'bg-danger',
        icon: 'close-circle-outline'
      }
    };

    res.status(200).json({ success: true, message: 'Order cancelled successfully', data: responseData });
  } catch (error) {
    console.error('Error cancelling dineout order:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};