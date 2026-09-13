const { DataTypes } = require('sequelize');
const sequelize = require('../db');
const User = require('./customUserModel');

const UserReferral = sequelize.define('UserReferral', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  referrer_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'user_customuser',
      key: 'id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
  referee_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true, // One referral record per referee user
    references: {
      model: 'user_customuser',
      key: 'id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
  referral_code: {
    type: DataTypes.STRING(30),
    allowNull: false
  },
  reward_amount: {
    type: DataTypes.FLOAT,
    defaultValue: 50.0
  },
  referee_reward: {
    type: DataTypes.FLOAT,
    defaultValue: 50.0
  },
  status: {
    type: DataTypes.ENUM('REGISTERED', 'COMPLETED', 'EXPIRED'),
    defaultValue: 'REGISTERED'
  },
  reward_credited: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  credited_at: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: 'user_referrals',
  timestamps: true
});

User.hasMany(UserReferral, { foreignKey: 'referrer_id', as: 'sentReferrals' });
UserReferral.belongsTo(User, { foreignKey: 'referrer_id', as: 'referrer' });
UserReferral.belongsTo(User, { foreignKey: 'referee_id', as: 'referee' });

module.exports = UserReferral;

