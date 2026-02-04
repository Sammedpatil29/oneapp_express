const { DataTypes } = require('sequelize');
const sequelize = require('../db');
const User = require('./customUserModel');

const GroceryOrder = sequelize.define('GroceryOrder', {
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
  cart_items: {
    type: DataTypes.JSONB,
    allowNull: false,
  },
  bill_details: {
    type: DataTypes.JSONB,
    allowNull: false,
  },
  address: {
    type: DataTypes.JSONB,
    allowNull: false,
  },
  payment_details: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  rider_details: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'PENDING'
  }
}, {
  tableName: 'grocery_orders',
  timestamps: true
});

GroceryOrder.belongsTo(User, { foreignKey: 'user_id' });

module.exports = GroceryOrder;