const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Dineout = sequelize.define('Dineout', {
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  image: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  galleryCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  distance: {
    type: DataTypes.STRING, // Storing as string per input (e.g., "8.5 km")
    allowNull: true
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true
  },
  tags: {
    type: DataTypes.STRING, // Comma separated tags
    allowNull: true
  },
  price: {
    type: DataTypes.STRING,
    allowNull: true
  },
  rating: {
    type: DataTypes.FLOAT,
    defaultValue: 0.0
  },
  city: {
    type: DataTypes.STRING,
    allowNull: true
  },
  ratingCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  isOpen: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  openTime: {
    type: DataTypes.STRING,
    allowNull: true
  },
  contact: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // Storing coords as separate lat/lng columns
  lat: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  lng: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  isVeg: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  openingHours: {
    type: DataTypes.JSONB, // Array of objects: [{ day, slots }]
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  mapEmbedUrl: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  offers: {
    type: DataTypes.JSONB, // Array of offer objects
    allowNull: true
  },
  menuItems: {
    type: DataTypes.JSONB, // Array of menu objects
    allowNull: true
  },
  restaurantPhotos: {
    type: DataTypes.JSONB, // Array of image URLs
    allowNull: true
  },
  amenities: {
    type: DataTypes.JSONB, // Array of amenity objects
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  timestamps: true,
  tableName: 'dineouts'
});

module.exports = Dineout;