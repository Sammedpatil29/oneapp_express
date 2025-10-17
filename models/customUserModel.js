// models/User.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db'); // adjust path to your sequelize instance

const User = sequelize.define('User', {
  username: {
    type: DataTypes.STRING(150),
    allowNull: false,
    unique: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
  },
  first_name: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  last_name: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  fcm_token: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  profile_image: {
    type: DataTypes.STRING, // URLField → string
    allowNull: true,
    validate: {
      isUrl: true,
    },
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  is_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  date_joined: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  last_login: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  role: {
    type: DataTypes.ENUM('user', 'provider', 'admin'),
    defaultValue: 'user',
  },
}, {
  timestamps: false, // or true if you want Sequelize to manage createdAt/updatedAt
  tableName: 'user_customuser', // optional, to match Django table naming
});

module.exports = User;
