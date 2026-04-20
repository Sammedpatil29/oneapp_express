const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const GroceryBrand = sequelize.define('GroceryBrand', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  img: {
    type: DataTypes.STRING,
    allowNull: true
  },
  bg: {
    type: DataTypes.STRING,
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'grocery_brands',
  timestamps: true
});

module.exports = GroceryBrand;