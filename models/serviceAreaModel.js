const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const ServiceArea = sequelize.define('ServiceArea', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  cityName: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  polygon: {
    // Array of { lat: number, lng: number } coordinates defining the boundary
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
  },
  center: {
    // Centroid { lat: number, lng: number } for map centering and distance heuristics
    type: DataTypes.JSONB,
    allowNull: true
  },
  radiusKm: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 5.0
  },
  strokeColor: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '#a000e2'
  },
  areaColor: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: '#a000e2'
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  timestamps: true,
  tableName: 'service_areas'
});

module.exports = ServiceArea;

