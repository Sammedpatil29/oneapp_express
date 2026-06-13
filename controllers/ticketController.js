const Ticket = require('../models/ticketModel');
const User = require('../models/customUserModel');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');

exports.createTicket = async (req, res) => {
  try {
    // Payload: { token, title, details, orderId, orderService }
    const { token, title, details, orderId, orderService } = req.body;
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_key_123');
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    // Get user details
    const user = await User.findByPk(decoded.id || decoded.user_id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Auto-generate a unique ticket ID (e.g., TCK-1234-5678)
    const ticket_id = `TCK-${Math.floor(1000 + Math.random() * 9000)}-${Date.now().toString().slice(-4)}`;

    const newTicket = await Ticket.create({
      ticket_id,
      orderId,
      orderService,
      title,
      details,
      userDetails: {
        userId: user.id,
        userName: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username,
        email: user.email || '',
        contact: user.phone || ''
      },
      status: [{
        status: "Open",
        time: new Date()
      }],
      comment: [],
      assignee: null
    });

    res.status(201).json({ 
      success: true, 
      message: 'Ticket created successfully', 
      data: newTicket 
    });

  } catch (error) {
    console.error('Create Ticket Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Optional: Fetch all tickets
exports.getAllTickets = async (req, res) => {
  try {
    const tickets = await Ticket.findAll({ order: [['createdAt', 'DESC']] });
    res.status(200).json({ success: true, data: tickets });
  } catch (error) {
    console.error('Get Tickets Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
    
// Get ticket by ID
exports.getTicketById = async (req, res) => {
  try {
    const ticket = await Ticket.findByPk(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }
    res.status(200).json({ success: true, data: ticket });
  } catch (error) {
    console.error('Get Ticket By ID Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update a ticket
exports.updateTicket = async (req, res) => {
  try {
    const [updated] = await Ticket.update(req.body, { where: { id: req.params.id } });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Ticket not found or no changes made' });
    }
    const updatedTicket = await Ticket.findByPk(req.params.id);
    res.status(200).json({ success: true, message: 'Ticket updated successfully', data: updatedTicket });
  } catch (error) {
    console.error('Update Ticket Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get tickets for a specific user based on token
exports.getUserTickets = async (req, res) => {
  try {
    const token = (req.headers.authorization && req.headers.authorization.split(' ')[1]) || req.body.token || req.query.token;
    
    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_key_123');
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    const userId = decoded.id || decoded.user_id;

    const tickets = await Ticket.findAll({ 
      where: {
        userDetails: { [Op.contains]: { userId: userId } }
      },
      order: [['createdAt', 'DESC']] 
    });
    res.status(200).json({ success: true, data: tickets });
  } catch (error) {
    console.error('Get User Tickets Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete a ticket
exports.deleteTicket = async (req, res) => {
  try {
    const deleted = await Ticket.destroy({ where: { id: req.params.id } });
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }
    res.status(200).json({ success: true, message: 'Ticket deleted successfully' });
  } catch (error) {
    console.error('Delete Ticket Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};