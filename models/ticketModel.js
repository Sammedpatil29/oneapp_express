const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Ticket = sequelize.define('Ticket', {
  ticket_id: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  orderId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  orderService: {
    type: DataTypes.STRING,
    allowNull: true
  },
  userDetails: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  details: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  assignee: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: null
  },
  status: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  comment: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  closed_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  timestamps: true,
  tableName: 'tickets'
});

module.exports = Ticket;