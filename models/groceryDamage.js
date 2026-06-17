const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const GroceryDamage = sequelize.define('GroceryDamage', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  itemId: {
    type: DataTypes.STRING,
    allowNull: false
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  reason: {
    type: DataTypes.STRING,
    allowNull: false
  },
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  acknowledged: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  tableName: 'grocery_damages',
  timestamps: true
});

module.exports = GroceryDamage;