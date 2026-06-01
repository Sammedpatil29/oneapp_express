const { DataTypes } = require('sequelize');
const sequelize = require('../db'); // Ensure this points to your actual database configuration

const Coupon = sequelize.define('Coupon', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  discount: {
    type: DataTypes.STRING,
    allowNull: false
  },
  max_discount: {
    type: DataTypes.STRING,
    allowNull: true
  },
  min_order: {
    type: DataTypes.STRING,
    allowNull: false
  },
  expiry_date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  condition: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  tableName: 'grocery coupons',
  timestamps: true
});

module.exports = Coupon;