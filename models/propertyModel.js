const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Property = sequelize.define('Property', {
  id: {
    type: DataTypes.STRING(100),
    primaryKey: true,
  },
  category: {
    type: DataTypes.STRING(50),
    allowNull: false, // 'buy_house' | 'rent_house' | 'buy_land' | 'buy_plot'
  },
  propertyType: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  price: {
    type: DataTypes.DECIMAL(14, 2),
    allowNull: false,
  },
  priceDisplay: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  priceUnit: {
    type: DataTypes.STRING(20),
    allowNull: true, // '/mo' for rent
  },
  pricePerSqFt: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  emiEstimate: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  securityDeposit: {
    type: DataTypes.DECIMAL(14, 2),
    allowNull: true,
  },
  maintenancePerMonth: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  locality: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },
  city: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: 'Jamkhandi',
  },
  fullAddress: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  lat: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  lng: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  coordinates: {
    type: DataTypes.JSONB,
    allowNull: true, // { lat, lng }
  },
  images: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: [],
  },
  videoUrl: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  bedrooms: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  bathrooms: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  balconies: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  carpetAreaSqFt: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  superBuiltUpAreaSqFt: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  totalAcres: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  facing: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'East',
  },
  furnishing: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'Unfurnished',
  },
  possessionStatus: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'Ready to Move',
  },
  ageOfProperty: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  floor: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  parking: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  waterSupply: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  tags: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: ['Verified'],
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  amenities: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [],
  },
  nearbyLandmarks: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [], // [{ name, distance, type }]
  },
  seller: {
    type: DataTypes.JSONB,
    allowNull: false, // { name, type, phone, whatsapp, verified, responseRate, avatar }
  },
  legalChecks: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: [], // [{ title, category, status, statusLabel, details }]
  },
  isFavorite: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  is_verified: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
  },
  status: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'pending_verification', // 'approved' | 'pending_verification' | 'verifying' | 'sold' | 'rejected'
    defaultValue: 'pending_verification', // 'approved' | 'pending_verification' | 'sold' | 'closed' | 'rejected'
  },
  user_id: {
    type: DataTypes.BIGINT,
    allowNull: true,
  },
}, {
  tableName: 'properties',
  timestamps: true,
});

module.exports = Property;

