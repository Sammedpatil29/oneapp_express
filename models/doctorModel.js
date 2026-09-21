// models/doctorModel.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Doctor = sequelize.define('Doctor', {
  id: {
    type: DataTypes.STRING(100),
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  qualification: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  specialization: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  categoryId: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  experienceYears: {
    type: DataTypes.STRING(50),
    defaultValue: '5+ years',
  },
  hospitalOrClinic: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  consultationFee: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  discountFee: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  discountPercent: {
    type: DataTypes.INTEGER,
    defaultValue: 20,
  },
  rating: {
    type: DataTypes.DECIMAL(3, 1),
    defaultValue: 4.8,
  },
  reviewCount: {
    type: DataTypes.INTEGER,
    defaultValue: 50,
  },
  image: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  about: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  availableToday: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  nextAvailableSlot: {
    type: DataTypes.STRING(100),
    defaultValue: 'Today at 11:30 AM',
  },
  languages: {
    type: DataTypes.JSONB,
    defaultValue: ['English', 'Kannada', 'Hindi'],
  },
  consultationModes: {
    type: DataTypes.JSONB,
    defaultValue: ['In-Clinic', 'Video Call'],
  },
  location: {
    type: DataTypes.STRING(100),
    defaultValue: 'Athani',
  },
  isTopDoctor: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'doctors',
  timestamps: true,
});

module.exports = Doctor;

