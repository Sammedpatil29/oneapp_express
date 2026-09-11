const { DataTypes } = require('sequelize');
const sequelize = require('../db');
const Rider = require('./ridersModel');

const RiderReferral = sequelize.define('RiderReferral', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  referrer_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'riders',
      key: 'id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
  referee_id: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true, // One referral record per registered referee
    references: {
      model: 'riders',
      key: 'id'
    },
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE'
  },
  referral_code: {
    type: DataTypes.STRING,
    allowNull: false
  },
  signup_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: false
  },
  completed_rides: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  target_rides: {
    type: DataTypes.INTEGER,
    defaultValue: 10
  },
  reward_amount: {
    type: DataTypes.FLOAT,
    defaultValue: 150
  },
  reward_credited: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  status: {
    type: DataTypes.ENUM('IN_PROGRESS', 'COMPLETED', 'EXPIRED'),
    defaultValue: 'IN_PROGRESS'
  }
}, {
  tableName: 'rider_referrals',
  timestamps: true
});

Rider.hasMany(RiderReferral, { foreignKey: 'referrer_id', as: 'referrals' });
RiderReferral.belongsTo(Rider, { foreignKey: 'referrer_id', as: 'referrer' });
RiderReferral.belongsTo(Rider, { foreignKey: 'referee_id', as: 'referee' });

module.exports = RiderReferral;

