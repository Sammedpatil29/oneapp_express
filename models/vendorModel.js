// models/vendorModel.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Vendor = sequelize.define('Vendor', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(150),
    allowNull: true,
    defaultValue: 'Vendor Merchant',
  },
  store_name: {
    type: DataTypes.STRING(150),
    allowNull: false,
    defaultValue: 'Pintu Partner Store',
  },
  phone: {
    type: DataTypes.STRING(15),
    allowNull: false,
    unique: true,
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
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
  is_open: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  status: {
    type: DataTypes.STRING(50),
    defaultValue: 'active',
  },
  rating: {
    type: DataTypes.FLOAT,
    defaultValue: 4.8,
  },
  image_url: {
    type: DataTypes.STRING(500),
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
  fcm_token: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  role: {
    type: DataTypes.STRING(50),
    defaultValue: 'vendor',
  },
  last_login: {
    type: DataTypes.DATE,
    allowNull: true,
  }
}, {
  tableName: 'vendors',
  timestamps: true,
});

module.exports = Vendor;

