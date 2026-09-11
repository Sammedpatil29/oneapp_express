const { DataTypes } = require('sequelize');
const sequelize = require('../db');
const Rider = require('./ridersModel');

const PayoutRequest = sequelize.define('PayoutRequest', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  payout_id: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
  },
  riderId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'riders',
      key: 'id',
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  },
  rider_name: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'Captain',
  },
  rider_phone: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  amount: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  upi_id: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'APPROVED', 'REJECTED'),
    defaultValue: 'PENDING',
  },
  admin_notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  processed_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  tableName: 'payout_requests',
  timestamps: true,
});

Rider.hasMany(PayoutRequest, { foreignKey: 'riderId', as: 'payoutRequests' });
PayoutRequest.belongsTo(Rider, { foreignKey: 'riderId', as: 'rider' });

module.exports = PayoutRequest;

