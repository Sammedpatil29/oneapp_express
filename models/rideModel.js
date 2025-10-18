// rideModel.js
const { DataTypes } = require("sequelize");
const sequelize = require("../db");
const User = require("./customUserModel");
const Rider = require("./ridersModel")
const Ride = sequelize.define(
  "Ride",
  {
    trip_details: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    service_details: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    raider_details: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    otp: {
      type: DataTypes.STRING,
      allowNull: true
    },

    // ✅ Foreign key column
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'user_custonuser', // points to the users table
        key: "id",
      },
      onDelete: "CASCADE", // optional — delete rides if user is deleted
      onUpdate: "CASCADE",
    },
  },
  {
    tableName: "rides",
    timestamps: true,
  }
);

Rider.hasMany(Ride, { foreignKey: "id" });
Ride.belongsTo(Rider, { foreignKey: "id" });

module.exports = Ride;
