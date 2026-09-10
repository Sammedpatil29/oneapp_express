const { DataTypes } = require("sequelize");
const sequelize = require("../db");
const Rider = require("./ridersModel");

const RiderTransaction = sequelize.define(
  "RiderTransaction",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    riderId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: "riders",
        key: "id",
      },
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },
    txnId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    amount: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    type: {
      type: DataTypes.ENUM("CREDIT", "DEBIT"),
      allowNull: false,
    },
    category: {
      type: DataTypes.ENUM("ride_fare", "withdrawal", "incentive", "referral"),
      allowNull: false,
      defaultValue: "ride_fare",
    },
    status: {
      type: DataTypes.ENUM("SUCCESS", "PENDING", "FAILED"),
      allowNull: false,
      defaultValue: "SUCCESS",
    },
    reference_id: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
    },
  },
  {
    tableName: "rider_transactions",
    timestamps: true,
  }
);

Rider.hasMany(RiderTransaction, { foreignKey: "riderId", as: "transactions" });
RiderTransaction.belongsTo(Rider, { foreignKey: "riderId", as: "rider" });

module.exports = RiderTransaction;