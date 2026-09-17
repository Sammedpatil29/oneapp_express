// models/labTestModel.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const LabTestPackage = sequelize.define('LabTestPackage', {
  id: {
    type: DataTypes.STRING(100),
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: false, // 'Full Body' | 'Fever' | 'Diabetes' | 'Thyroid' | 'Heart' | 'Women Health'
  },
  testCount: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
  fastingRequirement: {
    type: DataTypes.STRING(150),
    defaultValue: 'No fasting required',
  },
  sampleType: {
    type: DataTypes.STRING(100),
    defaultValue: 'Blood',
  },
  reportTimeHours: {
    type: DataTypes.INTEGER,
    defaultValue: 24,
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
  tags: {
    type: DataTypes.JSONB,
    defaultValue: [],
  },
  parameters: {
    type: DataTypes.JSONB,
    defaultValue: [],
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  recommendedFor: {
    type: DataTypes.STRING(200),
    allowNull: true,
  },
  labPartner: {
    type: DataTypes.JSONB,
    defaultValue: { type: 'Lab Partner', name: 'Dr. Lal PathLabs' },
  },
  overview: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  preparation: {
    type: DataTypes.JSONB,
    defaultValue: [],
  },
  parameterGroups: {
    type: DataTypes.JSONB,
    defaultValue: [],
  },
  popular: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  homeSamplePickup: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'lab_tests',
  timestamps: true,
  indexes: [
    { fields: ['category'] },
    { fields: ['popular'] },
    { fields: ['name'] },
  ]
});

module.exports = LabTestPackage;

