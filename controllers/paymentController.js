const Razorpay = require('razorpay');
const Booking = require('../models/bookingModel');
const Event = require('../models/eventsModel');
const User = require('../models/customUserModel');
const jwt = require('jsonwebtoken');
const { sendFcmNotification } = require('../utils/fcmSender');

// Initialize Razorpay
// ⚠️ Replace with your actual keys or use process.env variables
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_S5RLYqr6y2I6xs',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'q2lFxfOyVyAkD1GQMbitqNre',
});

// Helper to get user ID from token
const getUserIdFromToken = (req) => {
  const token = req.headers.authorization?.split(' ')[1] || req.body.token;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_key_123');
    return decoded.id;
  } catch (e) {
    return null;
  }
};

// 1. Create Order
exports.createOrder = async (req, res) => {
  try {
    const userId = getUserIdFromToken(req);
    if (!userId) return res.status(401).json({ success: false, message: 'Unauthorized' });

    const { eventId, tickets, class: ticketClass } = req.body;

    // Fetch Event to calculate price securely on backend
    const event = await Event.findByPk(eventId);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    // Find selected ticket option
    let ticketOptions = event.ticketoptions;
    if (!Array.isArray(ticketOptions)) ticketOptions = [ticketOptions];
    
    const selectedOption = ticketOptions.find(opt => opt.class === ticketClass);
    if (!selectedOption) return res.status(400).json({ success: false, message: 'Invalid ticket class' });

    // Calculate Amount
    const pricePerTicket = parseFloat(selectedOption.price || 0);
    const basePrice = pricePerTicket * parseInt(tickets);
    const charges = basePrice * 0.07; // 7% charges
    const totalAmount = Math.round(basePrice + charges); // Razorpay expects integer for smallest currency unit (paise) if passed directly, but we store decimal in DB.
    
    // Razorpay expects amount in paise (multiply by 100)
    const amountInPaise = totalAmount * 100;

    const options = {
      amount: amountInPaise,
      currency: "INR",
      receipt: `receipt_order_${Date.now()}`,
      notes: {
        event_id: eventId,
        user_id: userId
      }
    };

    // Create Razorpay Order
    const order = await razorpay.orders.create(options);

    if (!order) return res.status(500).json({ success: false, message: 'Razorpay order creation failed' });

    // Save Booking to DB
    const booking = await Booking.create({
      user_id: userId,
      event_id: eventId,
      ticket_count: tickets,
      ticket_class: ticketClass,
      total_amount: totalAmount,
      razorpay_order_id: order.id,
      status: 'pending'
    });

    // Send FCM Notification (Payment Initiated)
    const user = await User.findByPk(userId);
    if (user && user.fcm_token) {
      sendFcmNotification(
        user.fcm_token,
        'Payment Initiated',
        `Please complete your payment for ${event.title}`
      ).catch(err => console.error('FCM Error:', err));
    }

    res.status(200).json({
      success: true,
      internal_order_id: booking.id,
      razorpay_order_id: order.id,
      amount: totalAmount,
      currency: "INR"
    });

  } catch (error) {
    console.error('Create Order Error:', error);
    // Handle Razorpay specific error structure
    const errorMessage = error.error && error.error.description 
      ? error.error.description 
      : error.message || 'An error occurred during order creation';
    res.status(error.statusCode || 500).json({ success: false, message: errorMessage });
  }
};

// 2. Verify Payment Status (Polling Endpoint)
exports.verifyPaymentStatus = async (req, res) => {
  try {
    const { orderId } = req.body; // This is the internal booking ID

    const booking = await Booking.findByPk(orderId);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    // If already paid, return success
    if (booking.status === 'paid') {
      return res.status(200).json({ success: true, status: 'paid', booking });
    }

    // If pending, check Razorpay API to see if payment was captured
    // This acts as a fallback if webhook hasn't fired yet
    if (booking.status === 'pending' && booking.razorpay_order_id) {
      const payments = await razorpay.orders.fetchPayments(booking.razorpay_order_id);
      
      // Check if any payment is captured
      const paidPayment = payments.items.find(p => p.status === 'captured');

      if (paidPayment) {
        // Update DB
        booking.status = 'paid';
        booking.razorpay_payment_id = paidPayment.id;
        await booking.save();

        let eventDetails = null;
        // Decrease ticket count in Event model
        try {
          const event = await Event.findByPk(booking.event_id);
          eventDetails = event;
          if (event && event.ticketoptions) {
            let ticketOptions = event.ticketoptions;
            // Normalize to array if it's a single object
            if (!Array.isArray(ticketOptions)) ticketOptions = [ticketOptions];

            // Deep clone to ensure Sequelize detects the change
            const updatedOptions = JSON.parse(JSON.stringify(ticketOptions));
            const optionIndex = updatedOptions.findIndex(opt => opt.class === booking.ticket_class);

            if (optionIndex !== -1) {
              const option = updatedOptions[optionIndex];
              // Handle both 'tickets' and 'available' keys based on your schema usage
              if (option.tickets !== undefined) {
                option.tickets = Math.max(0, parseInt(option.tickets) - booking.ticket_count);
              } else if (option.available !== undefined) {
                option.available = Math.max(0, parseInt(option.available) - booking.ticket_count);
              }
              await Event.update({ ticketoptions: updatedOptions }, { where: { id: event.id } });
            }
          }
        } catch (err) {
          console.error('Error updating ticket inventory:', err);
        }

        // Send FCM Notification (Booking Confirmed)
        const user = await User.findByPk(booking.user_id);
        if (user && user.fcm_token) {
          const eventTitle = eventDetails ? eventDetails.title : 'Event';
          sendFcmNotification(
            user.fcm_token,
            'Booking Confirmed! 🎉',
            `Your tickets for ${eventTitle} are confirmed.`
          ).catch(err => console.error('FCM Error:', err));
        }

        return res.status(200).json({ success: true, status: 'paid', booking });
      } else if (payments.items.some(p => p.status === 'failed')) {
        booking.status = 'failed';
        await booking.save();

        // Send FCM Notification (Payment Failed)
        const user = await User.findByPk(booking.user_id);
        const event = await Event.findByPk(booking.event_id);
        if (user && user.fcm_token) {
          const eventTitle = event ? event.title : 'Event';
          sendFcmNotification(user.fcm_token, 'Payment Failed ❌', `Payment for ${eventTitle} failed. Please try again.`).catch(err => console.error('FCM Error:', err));
        }

        return res.status(200).json({ success: true, status: 'failed', booking });
      }
    }

    // Still pending
    res.status(200).json({ success: true, status: booking.status });

  } catch (error) {
    console.error('Verify Payment Error:', error);
    const errorMessage = error.error && error.error.description 
      ? error.error.description 
      : error.message || 'An error occurred during payment verification';
    res.status(error.statusCode || 500).json({ success: false, message: errorMessage });
  }
};