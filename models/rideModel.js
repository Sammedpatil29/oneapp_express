// rideModel.js

const { DataTypes } = require('sequelize');
const sequelize = require('../db'); // Import the Sequelize instance

const Ride = sequelize.define('Ride', {
  // Define the table schema

  // JSON fields for trip details, service details, and raider details
  trip_details: {
    type: DataTypes.JSONB, // Use JSONB for JSON fields in PostgreSQL
    allowNull: false,
  },
  service_details: {
    type: DataTypes.JSONB,
    allowNull: false,
  },
  raider_details: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING,
    allowNull: true,
  },
}, {
  // Additional table options (optional)
  tableName: 'rides',  // Explicit table name (optional)
  timestamps: true,    // This will add createdAt and updatedAt automatically
});

module.exports = Ride;
