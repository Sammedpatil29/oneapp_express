// rideModel.js
const { DataTypes } = require("sequelize");
const sequelize = require("../db");
const User = require("./customUserModel");
const Rider = require("./ridersModel");

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
      allowNull: true,
    },

    // ✅ User Foreign Key (assuming User ID is Integer)
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    },

    // ✅ NEW: Explicit Rider Foreign Key (Must be UUID to match Rider table)
    riderId: {
      type: DataTypes.UUID, 
      allowNull: true, // Allow null initially (e.g. before a rider accepts)
    }
  },
  {
    tableName: "rides",
    timestamps: true,
  }
);

// ✅ Fix: Use the new 'riderId' column for the relationship
// (Do NOT use 'id', that is the primary key of this table)
Rider.hasMany(Ride, { foreignKey: "riderId" });
Ride.belongsTo(Rider, { foreignKey: "riderId" });

// Optional: It is good practice to define the User relationship here too
User.hasMany(Ride, { foreignKey: "userId" });
Ride.belongsTo(User, { foreignKey: "userId" });

module.exports = Ride;