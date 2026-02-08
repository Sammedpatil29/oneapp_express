const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Metadata = sequelize.define('Metadata', {
  polygon: {
    // Stores the polygon as an array of objects, e.g., [{ lat: 16.73, lng: 75.05 }, ...]
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
  }
}, {
  timestamps: true,
  tableName: 'metadata'
});

module.exports = Metadata;