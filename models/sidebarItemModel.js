const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const SidebarItem = sequelize.define('SidebarItem', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  title: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  routerLink: {
    type: DataTypes.JSONB, // Using JSONB to support arrays like ['/layout/home']
    allowNull: false
  },
  routerLinkActiveOptions: {
    type: DataTypes.JSONB, // Using JSONB to support objects like { exact: true }
    allowNull: true
  },
  svg: {
    type: DataTypes.TEXT, // TEXT to handle long SVG strings
    allowNull: false
  },
  requiredRole: {
    type: DataTypes.JSONB, // Stores roles as an array, e.g., ['admin', 'manager']
    allowNull: true,
    defaultValue: []
  },
  notification: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'sidebar_items',
  timestamps: true,
});

module.exports = SidebarItem;