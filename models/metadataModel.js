const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Metadata = sequelize.define('Metadata', {
  polygon: {
    // Stores the polygon as an array of objects, e.g., [{ lat: 16.73, lng: 75.05 }, ...]
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: []
  },
  locations: {
    // Stores service cities as an array of strings, e.g., ['City A', 'City B']
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: []
  },
  status: {
    // Stores status options as an array, e.g., ['active', 'inactive', 'maintenance']
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: ['active']
  },
  categories: {
    // Stores categories as an array, e.g., ['grocery', 'dineout', 'events']
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: []
  },
  roles: {
    // Stores roles as an array, e.g., ['admin', 'manager', 'user']
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: []
  },
  routes: {
    // Stores routes as an array, e.g., ['/home', '/dashboard']
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: []
  }
}, {
  timestamps: true,
  tableName: 'metadata'
});

module.exports = Metadata;