// models/doctorAppointmentModel.js
const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const DoctorAppointment = sequelize.define('DoctorAppointment', {
  id: {
    type: DataTypes.STRING(100),
    primaryKey: true,
  },
  userId: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  doctorId: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  doctorName: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  specialization: {
    type: DataTypes.STRING(150),
    allowNull: false,
  },
  hospitalOrClinic: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
  patientName: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  patientPhone: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  patientAge: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  patientGender: {
    type: DataTypes.STRING(20),
    allowNull: false,
  },
  consultationType: {
    type: DataTypes.STRING(50),
    defaultValue: 'In-Clinic', // 'In-Clinic' | 'Video Call'
  },
  appointmentDate: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  timeSlot: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  symptomsOrReason: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  consultationFee: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING(50),
    defaultValue: 'confirmed', // 'confirmed' | 'completed' | 'cancelled'
  },
  paymentStatus: {
    type: DataTypes.STRING(50),
    defaultValue: 'paid',
  },
}, {
  tableName: 'doctor_appointments',
  timestamps: true,
});

module.exports = DoctorAppointment;

