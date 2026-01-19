const { DataTypes } = require('sequelize');
const sequelize = require('../db');
const Event = require('./eventsModel');

const Booking = sequelize.define('Event Booking', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  user_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
  event_id: {
    type: DataTypes.BIGINT,
    allowNull: false,
  },
  ticket_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  ticket_class: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  total_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  razorpay_order_id: {
    type: DataTypes.STRING,
  },
  razorpay_payment_id: {
    type: DataTypes.STRING,
  },
  status: {
    type: DataTypes.ENUM('pending', 'paid', 'failed', 'cancelled', 'completed'),
    defaultValue: 'pending',
  },
  currency: {
    type: DataTypes.STRING,
    defaultValue: 'INR'
  },
  refund_id: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  refund_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  deduction_amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  }
}, {
  tableName: 'Eevent_bookings',
  timestamps: true,
});

// Establish relationship to fetch Event details (like title)
Booking.belongsTo(Event, { foreignKey: 'event_id' });

module.exports = Booking;