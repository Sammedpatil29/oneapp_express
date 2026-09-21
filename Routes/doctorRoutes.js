// Routes/doctorRoutes.js
const express = require('express');
const {
  getCategories,
  getAllDoctors,
  getDoctorById,
  createAppointment,
  getUserAppointments,
} = require('../controllers/doctorController');

const router = express.Router();

// Doctor Categories
router.get('/categories', getCategories);

// Doctors List & Details
router.get('/doctors', getAllDoctors);
router.get('/doctors/:id', getDoctorById);

// Appointments
router.post('/appointments', createAppointment);
router.get('/appointments', getUserAppointments);

module.exports = router;

