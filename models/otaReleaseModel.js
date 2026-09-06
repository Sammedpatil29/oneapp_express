const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const OtaRelease = sequelize.define('OtaRelease', {
  id: {
    type: DataTypes.BIGINT,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  app_id: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'e.g. io.ionic.oneapp or io.oneapp.partner'
  },
  version: {
    type: DataTypes.STRING(50),
    allowNull: false,
    comment: 'e.g. 1.0.1'
  },
  channel: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'production'
  },
  platform: {
    type: DataTypes.STRING(50),
    allowNull: false,
    defaultValue: 'android'
  },
  bundle_url: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'URL to download the web build zip file'
  },
  bundle_path: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  checksum: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'SHA-256 or MD5 hash of the zip bundle'
  },
  min_native_version: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: '1.0.0'
  },
  is_mandatory: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  release_notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'ota_releases',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = OtaRelease;

