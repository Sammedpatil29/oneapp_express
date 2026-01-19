const Event = require('../models/eventsModel');
const User = require('../models/customUserModel');
const Booking = require('../models/bookingModel');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');

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
      status: booking.status === 'paid' ? 'Confirmed' : booking.status,
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