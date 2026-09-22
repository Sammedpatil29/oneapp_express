// models/vendorRegistrationModel.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const VendorRegistration = sequelize.define('VendorRegistration', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  name: {
    type: DataTypes.STRING(150),
    allowNull: true,
  },
  store_name: {
    type: DataTypes.STRING(150),
    allowNull: true,
  },
  category: {
    type: DataTypes.STRING(50),
    defaultValue: 'grocery',
  },
  city: {
    type: DataTypes.STRING(100),
    defaultValue: 'Hubballi',
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  pincode: {
    type: DataTypes.STRING(10),
    allowNull: true,
  },
  fssai_number: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  gst_number: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  service_type: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'grocery',
  },
  pan_number: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  license_number: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  documents: {
    type: DataTypes.JSONB,
    defaultValue: {},
  },
  bank_details: {
    type: DataTypes.JSONB,
    defaultValue: {},
  },
  draft_data: {
    type: DataTypes.JSONB,
    defaultValue: {},
  },
  step: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
  status: {
    type: DataTypes.STRING(50),
    defaultValue: 'draft', // 'draft', 'submitted', 'approved', 'rejected'
  },
}, {
  tableName: 'vendor_registrations',
  timestamps: true,
});

module.exports = VendorRegistration;

