// models/MetaData.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db'); 

const Service = sequelize.define('Service', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true, 
    allowNull: false
  },
  title: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  subtitle: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  img: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  offers: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  width: {
    type: DataTypes.STRING(10),
    allowNull: false,
    // Example values: '100%', '50%'
  },
  route: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  category: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  // ⚠️ Postgres Specific: Array of Strings
  city: {
    type: DataTypes.ARRAY(DataTypes.STRING),
    allowNull: false,
    defaultValue: [] 
  },
  status: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'active'
  },
  // ⚠️ Stores flexible JSON data for styling
  className: {
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: {} 
  }
}, {
  tableName: 'services', // Adjust table name if needed
  timestamps: false,     // Set to true if you want createdAt/updatedAt
});

module.exports = Service;