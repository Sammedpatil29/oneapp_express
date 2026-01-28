const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const GroceryCategory = sequelize.define('GroceryCategory', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  img: {
    type: DataTypes.STRING, // URL for the icon
    allowNull: false,
  },
  bg: {
    type: DataTypes.STRING, // Hex color code (e.g., #e3f2fd)
    defaultValue: '#ffffff',
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  tableName: 'grocery_categories',
});

module.exports = GroceryCategory;