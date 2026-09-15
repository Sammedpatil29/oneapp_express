const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Banner = sequelize.define('Banner', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  title: {
    type: DataTypes.STRING(150),
    allowNull: true,
    defaultValue: ''
  },
  img: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      notEmpty: true
    }
  },
  route: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  service_id: {
    type: DataTypes.BIGINT,
    allowNull: true
  },
  service_title: {
    type: DataTypes.STRING(100),
    allowNull: true,
    defaultValue: ''
  },
  cities: {
    // Array of string city names e.g. ["Athani", "Jamkhandi"]
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: []
  },
  placement: {
    // Legacy single string e.g. 'hometop'
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'hometop'
  },
  placements: {
    // Array of placement tags e.g. ['hometop', 'homedown']
    type: DataTypes.JSONB,
    allowNull: false,
    defaultValue: ['hometop']
  },
  priority: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  type: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  term: {
    type: DataTypes.STRING(100),
    allowNull: true
  }
}, {
  tableName: 'banners',
  timestamps: false
});

module.exports = Banner;