const Event = require('../models/eventsModel');
const User = require('../models/customUserModel');
const Booking = require('../models/bookingModel');
const Razorpay = require('razorpay');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');

// Initialize Razorpay (Ensure keys match your .env or paymentController)
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_S5RLYqr6y2I6xs',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'q2lFxfOyVyAkD1GQMbitqNre',
});

// Create a new event
exports.createEvent = async (req, res) => {
  try {
    const event = await Event.create(req.body);
    res.status(201).json({ success: true, data: event });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Cancel Booking & Refund
exports.cancelBooking = async (req, res) => {
  try {
    const { orderId } = req.body;
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' });
    
    let userId;
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_key_123');
      userId = decoded.id;
    } catch (e) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
    
    const booking = await Booking.findByPk(orderId);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
console.log('Cancelling booking for user ID:', booking.user_id, 'Order ID:', userId);
    if (booking.user_id != userId) {
      return res.status(403).json({ success: false, message: 'You are not authorized to cancel this booking' });
    }

    if (booking.status !== 'paid') {
      return res.status(400).json({ success: false, message: `Cannot cancel booking with status: ${booking.status}` });
    }

    const event = await Event.findByPk(booking.event_id);
    if (!event) return res.status(404).json({ success: false, message: 'Event not found' });

    // --- Cancellation Policy Logic ---
    const totalAmount = parseFloat(booking.total_amount);
    
    // Calculate time difference
    const eventDateTime = new Date(`${event.date}T${event.time}`);
    const now = new Date();
    const diffInMs = eventDateTime - now;
    const diffInHours = diffInMs / (1000 * 60 * 60);

    let deductionPercentage = 0;

    if (diffInMs < 0) {
      return res.status(400).json({ success: false, message: 'Cannot cancel booking: Event has already started or ended.' });
    } else if (diffInHours < 24) {
      deductionPercentage = 0.50; // 50% deduction if < 24 hours
    } else if (diffInHours < 72) {
      deductionPercentage = 0.30; // 30% deduction if < 3 days
    } else {
      deductionPercentage = 0.10; // 10% deduction otherwise
    }

    const deductionAmount = totalAmount * deductionPercentage;
    const refundAmount = totalAmount - deductionAmount;
    const refundAmountInPaise = Math.round(refundAmount * 100);

    // 1. Initiate Refund via Razorpay
    let refundData = null;
    if (booking.razorpay_payment_id && refundAmountInPaise > 0) {
      try {
        refundData = await razorpay.payments.refund(booking.razorpay_payment_id, {
          amount: refundAmountInPaise,
          speed: 'normal',
          notes: {
            reason: 'User requested cancellation',
            booking_id: booking.id
          }
        });
      } catch (rzpError) {
        console.error('Razorpay Refund Error:', rzpError);
        return res.status(500).json({ success: false, message: 'Refund initiation failed', error: rzpError });
      }
    }

    // 2. Update Booking Status
    booking.status = 'cancelled';
    booking.refund_id = refundData ? refundData.id : null;
    booking.refund_amount = refundAmount;
    booking.deduction_amount = deductionAmount;
    await booking.save();

    // 3. Restore Ticket Inventory
    if (event.ticketoptions) {
      let ticketOptions = event.ticketoptions;
      if (!Array.isArray(ticketOptions)) ticketOptions = [ticketOptions];

      const updatedOptions = JSON.parse(JSON.stringify(ticketOptions));
      const optionIndex = updatedOptions.findIndex(opt => opt.class === booking.ticket_class);

      if (optionIndex !== -1) {
        const option = updatedOptions[optionIndex];
        if (option.tickets !== undefined) {
          option.tickets = parseInt(option.tickets) + booking.ticket_count;
        } else if (option.available !== undefined) {
          option.available = parseInt(option.available) + booking.ticket_count;
        }
        await Event.update({ ticketoptions: updatedOptions }, { where: { id: event.id } });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Booking cancelled successfully',
      refundAmount: refundAmount.toFixed(2),
      deductionAmount: deductionAmount.toFixed(2),
      refundId: refundData ? refundData.id : 'mock_refund_id'
    });

  } catch (error) {
    console.error('Cancel Booking Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Order Details by Order ID
exports.getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ success: false, message: 'Order ID is required' });
    }

    const booking = await Booking.findByPk(orderId);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const event = await Event.findByPk(booking.event_id);
    const user = await User.findByPk(booking.user_id);

    if (!event) {
      return res.status(404).json({ success: false, message: 'Event details not found' });
    }

    // Calculate financials (Reverse calculate from total_amount assuming 7% charges)
    const finalCost = parseFloat(booking.total_amount);
    const basePrice = finalCost / 1.07;
    const charges = finalCost - basePrice;

    // Parse location
    const loc = event.location && typeof event.location === 'object' ? event.location : {};

    // Format category
    const category = Array.isArray(event.category) ? event.category.join(', ') : event.category;

    const responseData = {
      orderId: booking.id,
      status: booking.status,
      customerName: user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'Guest',
      ticketCount: booking.ticket_count,
      totalPrice: Math.round(basePrice),
      finalCost: Math.round(finalCost),
      charges: Math.round(charges),
      event: {
        title: event.title,
        category: category,
        date: event.date,
        time: event.time,
        duration: event.duration,
        location: loc.location || '',
        lat: loc.lat,
        lng: loc.lng,
        imageUrl: event.imageUrl
      }
    };

    if (booking.status === 'cancelled') {
      responseData.refundDetails = {
        refundId: booking.refund_id,
        refundAmount: booking.refund_amount,
        deductionAmount: booking.deduction_amount
      };
    }

    res.status(200).json({ success: true, ...responseData });

  } catch (error) {
    console.error('Error fetching order details:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get all events
exports.getAllEvents = async (req, res) => {
  try {
    const events = await Event.findAll({
      where: { is_active: true }
    });

    let bookedEvents = [];
    const token = req.headers.authorization?.split(' ')[1];

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_key_123');
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const bookings = await Booking.findAll({
          where: { 
            user_id: decoded.id,
            status: 'paid'
          },
          include: [{
            model: Event,
            where: {
              date: { [Op.gte]: today }
            },
            required: true
          }]
        });

        bookedEvents = bookings.map(b => b.Event);
      } catch (e) {
        // Ignore token errors (e.g. not logged in or expired), just return empty bookedEvents
      }
    }

    res.status(200).json({ success: true, data: events, bookedEvents });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single event by ID
exports.getEventById = async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    res.status(200).json({ success: true, data: event });
  } catch (error) {
    console.error('Error fetching event:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update event
exports.updateEvent = async (req, res) => {
  try {
    const [updated] = await Event.update(req.body, {
      where: { id: req.params.id }
    });
    if (updated) {
      const updatedEvent = await Event.findByPk(req.params.id);
      return res.status(200).json({ success: true, data: updatedEvent });
    }
    return res.status(404).json({ success: false, message: 'Event not found' });
  } catch (error) {
    console.error('Error updating event:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete event
exports.deleteEvent = async (req, res) => {
  try {
    const deleted = await Event.destroy({
      where: { id: req.params.id }
    });
    if (deleted) {
      return res.status(200).json({ success: true, message: 'Event deleted successfully' });
    }
    return res.status(404).json({ success: false, message: 'Event not found' });
  } catch (error) {
    console.error('Error deleting event:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get booking details with price calculation
exports.getBookingDetails = async (req, res) => {
  try {
    // 1. Extract User Details from Token (Header)
    const token = req.headers.authorization?.split(' ')[1];
    let userDetails = { userName: '', phone: '', email: '' };

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_key_123');
        const user = await User.findByPk(decoded.id);
        
        if (user) {
          userDetails = {
            name: `${user.first_name} ${user.last_name}`,
            phone: user.phone || '',
            email: user.email || ''
          };
        }
      } catch (e) {
        console.error('Error fetching user details:', e);
      }
    }

    // 2. Get Payload Data
    const { eventId, class: ticketClass, tickets } = req.body;

    if (!eventId) {
      return res.status(400).json({ success: false, message: 'Event ID is required' });
    }

    // 3. Fetch Event
    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // 4. Handle Ticket Options & Defaults
    let ticketOptions = event.ticketoptions;
    if (!Array.isArray(ticketOptions)) {
      ticketOptions = ticketOptions ? [ticketOptions] : [];
    }

    let selectedOption = null;
    // If class is provided, find it
    if (ticketClass) {
      selectedOption = ticketOptions.find(opt => opt.class === ticketClass);
    }
    // Default to first option if not found or not provided
    if (!selectedOption && ticketOptions.length > 0) {
      selectedOption = ticketOptions[0];
    }

    if (!selectedOption) {
      return res.status(400).json({ success: false, message: 'No valid ticket options available for this event' });
    }

    // 5. Calculate Price
    const selectedTickets = tickets ? parseInt(tickets) : 1;
    const pricePerTicket = parseFloat(selectedOption.price || 0);
    const basePrice = pricePerTicket * selectedTickets;
    const charges = basePrice * 0.07; // 7% charges
    const totalPrice = basePrice + charges;

    // 6. Send Response
    res.status(200).json({
      success: true,
      user: userDetails,
      event: {
        eventName: event.title,
        eventDate: event.date,
        ticketOptions: ticketOptions,
        maxSelection: event.ticketcount
      },
      booking: {
        selectedClass: selectedOption.class,
        ticketsCount: selectedTickets,
        basePrice: basePrice.toFixed(2),
        charges: charges.toFixed(2),
        totalPrice: totalPrice.toFixed(2)
      }
    });

  } catch (error) {
    console.error('Error fetching booking details:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Check ticket availability
exports.checkAvailability = async (req, res) => {
  try {
    const { eventId, class: ticketClass, tickets } = req.body;
    const requestedTickets = tickets ? parseInt(tickets) : 1;

    if (!eventId) {
      return res.status(400).json({ success: false, message: 'Event ID is required' });
    }

    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    if (!event.is_active) {
      return res.status(400).json({ success: false, message: 'Event is not active' });
    }

    // Handle Ticket Options
    let ticketOptions = event.ticketoptions;
    if (!Array.isArray(ticketOptions)) {
      ticketOptions = ticketOptions ? [ticketOptions] : [];
    }

    let selectedOption = null;
    if (ticketClass) {
      selectedOption = ticketOptions.find(opt => opt.class === ticketClass);
    } else if (ticketOptions.length > 0) {
      // Default to first option if class not specified
      selectedOption = ticketOptions[0];
    }

    if (!selectedOption) {
      return res.status(400).json({ success: false, message: 'Ticket class not found' });
    }
console.log(selectedOption)
    // Check availability (handling "available tickets" key as per prompt description)
    const available = selectedOption['tickets'] !== undefined ? selectedOption['tickets'] :
                      selectedOption.available !== undefined ? selectedOption.available : 0;

    if (parseInt(available) >= requestedTickets) {
      res.status(200).json({
        success: true,
        message: 'Tickets available',
        data: {
          eventId: event.id,
          class: selectedOption.class,
          available: parseInt(available),
          requested: requestedTickets,
          price: selectedOption.price
        }
      });
    } else {
      res.status(200).json({
        success: false,
        message: `Only ${available} tickets available for ${selectedOption.class || 'this class'}`
      });
    }

  } catch (error) {
    console.error('Error checking ticket availability:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Cancel Event & Refund All Bookings (Admin/Organizer)
exports.cancelEvent = async (req, res) => {
  try {
    const eventId = req.params.id;
    
    const event = await Event.findByPk(eventId);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Find all paid bookings for this event
    const bookings = await Booking.findAll({
      where: {
        event_id: eventId,
        status: 'paid'
      }
    });

    let successCount = 0;
    let failCount = 0;
    const errors = [];

    // Process refunds for each booking
    for (const booking of bookings) {
      try {
        if (booking.razorpay_payment_id) {
          const totalAmount = parseFloat(booking.total_amount);
          const refundAmountInPaise = Math.round(totalAmount * 100);

          // Initiate Full Refund
          const refund = await razorpay.payments.refund(booking.razorpay_payment_id, {
            amount: refundAmountInPaise,
            speed: 'normal',
            notes: {
              reason: 'Event Cancelled by Organizer',
              event_id: eventId,
              booking_id: booking.id
            }
          });

          booking.status = 'cancelled';
          booking.refund_id = refund.id;
          booking.refund_amount = totalAmount;
          booking.deduction_amount = 0; // 0 deduction for event cancellation
          await booking.save();

          successCount++;
        } else {
          failCount++;
          errors.push(`Booking ${booking.id}: No payment ID found`);
        }
      } catch (err) {
        console.error(`Refund error for booking ${booking.id}:`, err);
        failCount++;
        const msg = err.error && err.error.description ? err.error.description : err.message;
        errors.push(`Booking ${booking.id}: ${msg}`);
      }
    }

    // Mark event as inactive
    event.is_active = false;
    await event.save();

    res.status(200).json({
      success: true,
      message: 'Event cancelled and refunds processed',
      summary: {
        totalBookings: bookings.length,
        refunded: successCount,
        failed: failCount,
        errors: errors
      }
    });

  } catch (error) {
    console.error('Error cancelling event:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};