// models/Rider.js
const { DataTypes } = require("sequelize");
const sequelize = require("../db");

const Rider = sequelize.define("Rider", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },

  name: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  role: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: "captain",
  },

  password: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  image_url: {
    type: DataTypes.STRING,
    defaultValue: "",
  },

  contact: {
    type: DataTypes.STRING(10),
    allowNull: true,
    unique: true,
  },

  email: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true,
    validate: {
      isEmail: true,
    },
  },

  current_lat: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 12.9716,
  },

  current_lng: {
    type: DataTypes.FLOAT,
    allowNull: true,
    defaultValue: 77.5946,
  },

  vehicle_number: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: "",
  },

  vehicle_type: {
    type: DataTypes.ENUM("bike", "auto", "car", "van"),
    allowNull: true,
    defaultValue: "bike",
  },

  fuel_type: {
    type: DataTypes.ENUM("petrol", "diesel", "ev", "cng"),
    allowNull: true,
    defaultValue: "petrol",
  },

  vehicle_model: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: "",
  },

  kyc_docs: {
    type: DataTypes.JSONB,
    allowNull: true
  },

  join_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    defaultValue: DataTypes.NOW,
  },

  status: {
    type: DataTypes.ENUM("online", "offline", "on-ride", "onride", "inactive"),
    defaultValue: "offline",
  },

  // 🔹 Additional useful fields
  socket_id: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  fcm_token: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  verification_message: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  rating: {
    type: DataTypes.JSONB
  },

  total_rides: {
    type: DataTypes.JSONB
  },

  earnings: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },

  commission_due: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },

  is_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },

  last_active: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },

  payout_account: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
}, {
  timestamps: true, // adds createdAt and updatedAt
  tableName: "riders",
});

module.exports = Rider;
