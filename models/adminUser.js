const { DataTypes } = require('sequelize');
const sequelize = require('../db'); // Adjust to your Sequelize instance

const AdminUser = sequelize.define('AdminUser', {
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  first_name: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  last_name: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  profile_image: {
    type: DataTypes.STRING, // URLField in Django = STRING with validation
    allowNull: true,
    validate: {
      isUrl: true,
    },
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    unique: true,
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
  role: {
    type: DataTypes.ENUM(
      'vender',
      'admin',
      'editor',
      'verifier',
      'manager',
      'support',
      'auditor',
      'analyst',
      'moderator',
      'guest'
    ),
    defaultValue: 'admin', // You had 'user' in Django, but not in the ENUM
  },
  password_field: {
    type: DataTypes.STRING(138), // hashed password
    allowNull: false,
  }
}, {
  tableName: 'AdminUser',
  timestamps: false, // or true if you want createdAt/updatedAt
});

module.exports = AdminUser;
