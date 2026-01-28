const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const GroceryItem = sequelize.define('GroceryItem', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
  },
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  stock: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
  },
  unit: {
    type: DataTypes.STRING, // e.g., 'kg', 'pcs', 'pack'
    defaultValue: 'pcs',
  },
  unit_value: {
    type: DataTypes.DECIMAL(10, 2), // Represents the magnitude (e.g., 1 for 1kg, 3 for 3ltr)
    defaultValue: 1,
    allowNull: false,
  },
  category: {
    type: DataTypes.STRING,
  },
  image_url: {
    type: DataTypes.STRING,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  discount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
  },
  min_quantity: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
  max_quantity: {
    type: DataTypes.INTEGER,
  },
  tags: {
    type: DataTypes.JSONB,
    defaultValue: [],
  },
  sku: {
    type: DataTypes.STRING,
    unique: true,
  },
  brand: {
    type: DataTypes.STRING,
  },
  nutritional_info: {
    type: DataTypes.JSONB, // Store calories, fat, protein, etc.
  },
  is_featured: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
});

module.exports = GroceryItem;