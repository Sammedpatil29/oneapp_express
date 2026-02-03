const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const DineoutOrder = sequelize.define('DineoutOrder', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  restaurant_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  restaurant_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  guest_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  booking_date: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  time_slot: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  offer_applied: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  bill_details: {
    type: DataTypes.JSONB,
    allowNull: false,
  },
  bill_image_url: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  razorpay_order_id: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  razorpay_payment_id: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'PENDING',
  }
}, {
  tableName: 'dineout_orders',
  timestamps: true
});

module.exports = DineoutOrder;