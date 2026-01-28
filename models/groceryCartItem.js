const { DataTypes } = require('sequelize');
const sequelize = require('../db');
const User = require('./customUserModel');
const GroceryItem = require('./groceryItem');

const GroceryCartItem = sequelize.define('GroceryCartItem', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'user_customuser', // Matches tableName in customUserModel.js
      key: 'id'
    }
  },
  product_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'GroceryItems', // Default Sequelize table name for GroceryItem
      key: 'id'
    }
  },
  quantity: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
    allowNull: false,
    validate: {
      min: 1
    }
  }
}, {
  tableName: 'grocery_cart_items',
  timestamps: true
});

// Associations
GroceryCartItem.belongsTo(GroceryItem, { foreignKey: 'product_id' });
GroceryCartItem.belongsTo(User, { foreignKey: 'user_id' });

module.exports = GroceryCartItem;