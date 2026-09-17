// models/medicineModel.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Medicine = sequelize.define('Medicine', {
  id: {
    type: DataTypes.STRING(100),
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  brand: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  dosageForm: {
    type: DataTypes.STRING(80),
    allowNull: false, // 'Tablet' | 'Capsule' | 'Syrup' | 'Gel' | 'Spray' | 'Powder' | 'Drops'
  },
  packSize: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  mrp: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  discountPercent: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
  },
  image: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  prescriptionRequired: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  inStock: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  composition: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  manufacturer: {
    type: DataTypes.STRING(200),
    allowNull: true,
  },
  seller: {
    type: DataTypes.JSONB,
    defaultValue: { type: 'Pharmacy Partner', name: 'MedPlus Pharmacy' },
  },
  uses: {
    type: DataTypes.JSONB,
    defaultValue: [],
  },
  benefits: {
    type: DataTypes.JSONB,
    defaultValue: [],
  },
  sideEffects: {
    type: DataTypes.JSONB,
    defaultValue: [],
  },
  directionsForUse: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  safetyAdvice: {
    type: DataTypes.JSONB,
    defaultValue: [],
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'medicines',
  timestamps: true,
  indexes: [
    { fields: ['category'] },
    { fields: ['inStock'] },
    { fields: ['name'] },
  ]
});

module.exports = Medicine;

