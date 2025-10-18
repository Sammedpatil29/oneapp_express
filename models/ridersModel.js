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
    allowNull: false,
  },

  role: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  image_url: {
    type: DataTypes.STRING,
    defaultValue: "",
  },

  contact: {
    type: DataTypes.STRING(10),
    allowNull: false,
    unique: true,
    validate: {
      is: /^[0-9]{10}$/i, // validate Indian phone numbers
    },
  },

  current_lat: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },

  current_lng: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },

  vehicle_number: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  vehicle_type: {
    type: DataTypes.ENUM("bike", "auto", "car", "van"),
    allowNull: false,
  },

  fuel_type: {
    type: DataTypes.ENUM("petrol", "diesel", "ev", "cng"),
    allowNull: false,
  },

  vehicle_model: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  kyc_docs: {
    type: DataTypes.JSONB,
    allowNull: true
  },

  join_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
  },

  status: {
    type: DataTypes.ENUM("online", "offline", "on-ride", "inactive"),
    defaultValue: "offline",
  },

  // 🔹 Additional useful fields
  socket_id: {
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

  is_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },

  last_active: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
}, {
  timestamps: true, // adds createdAt and updatedAt
  tableName: "riders",
});

module.exports = Rider;
