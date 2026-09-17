// models/pharmacyOrderModel.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const PharmacyOrder = sequelize.define('PharmacyOrder', {
  id: {
    type: DataTypes.STRING(100),
    primaryKey: true,
  },
  orderType: {
    type: DataTypes.STRING(50),
    allowNull: false, // 'medicine' | 'lab_test'
  },
  userId: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  items: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
  },
  billSummary: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {},
  },
  deliveryAddress: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  patientDetails: {
    type: DataTypes.JSONB,
    allowNull: true, // { patientName, age, gender, date, timeSlot }
  },
  prescriptionUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'placed', // 'placed', 'confirmed', 'sample_collected', 'out_for_delivery', 'delivered', 'cancelled'
  },
  paymentMethod: {
    type: DataTypes.STRING(50),
    defaultValue: 'cash_on_delivery',
  },
  paymentStatus: {
    type: DataTypes.STRING(50),
    defaultValue: 'pending',
  },
  deliveryTimeMinutes: {
    type: DataTypes.INTEGER,
    defaultValue: 15,
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'pharmacy_orders',
  timestamps: true,
  indexes: [
    { fields: ['orderType'] },
    { fields: ['status'] },
    { fields: ['userId'] },
  ]
});

module.exports = PharmacyOrder;

