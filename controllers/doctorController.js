// controllers/doctorController.js
const { Op } = require('sequelize');
const Doctor = require('../models/doctorModel');
const DoctorAppointment = require('../models/doctorAppointmentModel');

// Seed Categories
const DOCTOR_CATEGORIES = [
  {
    id: 'gynecologist',
    name: 'Gynecologist',
    title: 'Gynecologist & Obstetrician',
    icon: 'female-outline',
    color: '#ec4899',
    bgColor: '#fdf2f8',
    borderColor: '#fbcfe8',
    description: "Women's Health, Pregnancy & Period Care",
    badge: 'Popular',
    consultCount: '1,200+ consults',
  },
  {
    id: 'general_physician',
    name: 'General Physician',
    title: 'General Physician & Diabetologist',
    icon: 'medkit-outline',
    color: '#3b82f6',
    bgColor: '#eff6ff',
    borderColor: '#bfdbfe',
    description: 'Fever, Cough, Cold, BP & Routine Checkups',
    badge: 'Essential',
    consultCount: '3,400+ consults',
  },
  {
    id: 'pediatrician',
    name: 'Pediatrician',
    title: 'Pediatrician & Child Health',
    icon: 'happy-outline',
    color: '#f59e0b',
    bgColor: '#fffbeb',
    borderColor: '#fde68a',
    description: 'Infant, Child Care, Growth & Vaccinations',
    badge: 'Top Rated',
    consultCount: '1,800+ consults',
  },
  {
    id: 'dermatologist',
    name: 'Dermatologist',
    title: 'Dermatologist & Hair Specialist',
    icon: 'sparkles-outline',
    color: '#8b5cf6',
    bgColor: '#f5f3ff',
    borderColor: '#ddd6fe',
    description: 'Acne, Skin Glow, Hair Fall & Rashes',
    badge: 'Trending',
    consultCount: '1,500+ consults',
  },
  {
    id: 'cardiologist',
    name: 'Cardiologist',
    title: 'Cardiologist & Heart Specialist',
    icon: 'heart-outline',
    color: '#ef4444',
    bgColor: '#fef2f2',
    borderColor: '#fecaca',
    description: 'Heart Health, Chest Pain & Blood Pressure',
    badge: 'Specialist',
    consultCount: '950+ consults',
  },
  {
    id: 'orthopedic',
    name: 'Orthopedic',
    title: 'Orthopedic & Joint Surgeon',
    icon: 'body-outline',
    color: '#10b981',
    bgColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    description: 'Back, Knee Pain, Fractures & Arthritis',
    badge: 'Verified',
    consultCount: '1,100+ consults',
  },
  {
    id: 'ent',
    name: 'ENT Specialist',
    title: 'ENT Specialist (Ear, Nose, Throat)',
    icon: 'ear-outline',
    color: '#06b6d4',
    bgColor: '#ecfeff',
    borderColor: '#a5f3fc',
    description: 'Sinus, Ear Pain, Sore Throat & Hearing',
    badge: 'Verified',
    consultCount: '850+ consults',
  },
  {
    id: 'dentist',
    name: 'Dentist',
    title: 'Dental Surgeon & Smile Care',
    icon: 'shield-outline',
    color: '#14b8a6',
    bgColor: '#f0fdfa',
    borderColor: '#99f6e4',
    description: 'Teeth Cleaning, Toothache & Root Canal',
    badge: 'Popular',
    consultCount: '1,300+ consults',
  },
  {
    id: 'psychiatrist',
    name: 'Psychiatrist',
    title: 'Psychiatrist & Mental Wellness',
    icon: 'heart-half-outline',
    color: '#6366f1',
    bgColor: '#eef2ff',
    borderColor: '#c7d2fe',
    description: 'Anxiety, Stress, Depression & Sleep Care',
    badge: 'Confidential',
    consultCount: '700+ consults',
  },
  {
    id: 'ophthalmologist',
    name: 'Eye Specialist',
    title: 'Eye Specialist / Ophthalmologist',
    icon: 'eye-outline',
    color: '#0284c7',
    bgColor: '#f0f9ff',
    borderColor: '#bae6fd',
    description: 'Vision Test, Eye Strain & Cataract Care',
    badge: 'Specialist',
    consultCount: '620+ consults',
  },
];

// Initial Seed Data: Doctors
const INITIAL_DOCTORS = [
  {
    id: 'doc-01',
    name: 'Dr. Sneha Patil',
    qualification: 'MBBS, MS - Obstetrics & Gynaecology, DGO',
    specialization: 'Gynecologist & Obstetrician',
    categoryId: 'gynecologist',
    experienceYears: '14+ years',
    hospitalOrClinic: 'Matruchhaya Maternity & Women Care Hospital',
    consultationFee: 400,
    discountFee: 320,
    discountPercent: 20,
    rating: 4.9,
    reviewCount: 230,
    image: 'https://images.unsplash.com/photo-1594824813575-56041c304d94?w=500&auto=format&fit=crop&q=60',
    about: 'Experienced gynecologist dedicated to compassionate pregnancy care, high-risk deliveries, PCOD management, and adolescent healthcare with 14+ years of clinical excellence.',
    availableToday: true,
    nextAvailableSlot: 'Today at 11:00 AM',
    languages: ['Kannada', 'English', 'Marathi', 'Hindi'],
    consultationModes: ['In-Clinic', 'Video Call'],
    location: 'Athani',
    isTopDoctor: true,
    isActive: true,
  },
  {
    id: 'doc-02',
    name: 'Dr. Ananya Kulkarni',
    qualification: 'MBBS, DNB - Obstetrics & Gynaecology, Fellowship in Laparoscopy',
    specialization: 'Gynecologist & Infertility Specialist',
    categoryId: 'gynecologist',
    experienceYears: '11+ years',
    hospitalOrClinic: 'Sanjeevani Multispeciality Hospital',
    consultationFee: 500,
    discountFee: 400,
    discountPercent: 20,
    rating: 4.8,
    reviewCount: 175,
    image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=500&auto=format&fit=crop&q=60',
    about: 'Specialist in fertility evaluation, laparoscopic gynecology surgeries, and comprehensive reproductive wellness for women.',
    availableToday: true,
    nextAvailableSlot: 'Today at 04:30 PM',
    languages: ['Kannada', 'English', 'Hindi'],
    consultationModes: ['In-Clinic', 'Video Call'],
    location: 'Athani',
    isTopDoctor: true,
    isActive: true,
  },
  {
    id: 'doc-03',
    name: 'Dr. Rajeshwar Hiremath',
    qualification: 'MBBS, MD - General Medicine',
    specialization: 'Senior General Physician & Diabetologist',
    categoryId: 'general_physician',
    experienceYears: '18+ years',
    hospitalOrClinic: 'Athani City Care Clinic, Main Market',
    consultationFee: 350,
    discountFee: 280,
    discountPercent: 20,
    rating: 4.9,
    reviewCount: 310,
    image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=500&auto=format&fit=crop&q=60',
    about: 'Trusted family physician specializing in seasonal fevers, hypertension, chronic diabetes management, and geriatric care.',
    availableToday: true,
    nextAvailableSlot: 'Today at 10:15 AM',
    languages: ['Kannada', 'Hindi', 'English'],
    consultationModes: ['In-Clinic', 'Video Call'],
    location: 'Athani',
    isTopDoctor: true,
    isActive: true,
  },
  {
    id: 'doc-04',
    name: 'Dr. Pradeep Desai',
    qualification: 'MBBS, DCH, MD - Pediatrics',
    specialization: 'Pediatrician & Child Health Specialist',
    categoryId: 'pediatrician',
    experienceYears: '12+ years',
    hospitalOrClinic: 'Chiguru Children Clinic & Vaccination Center',
    consultationFee: 400,
    discountFee: 320,
    discountPercent: 20,
    rating: 4.9,
    reviewCount: 195,
    image: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=500&auto=format&fit=crop&q=60',
    about: 'Expert pediatrician focused on infant nutrition, timely developmental milestones, asthma in children, and immunization.',
    availableToday: true,
    nextAvailableSlot: 'Today at 12:00 PM',
    languages: ['Kannada', 'English', 'Marathi'],
    consultationModes: ['In-Clinic', 'Video Call'],
    location: 'Athani',
    isTopDoctor: true,
    isActive: true,
  },
  {
    id: 'doc-05',
    name: 'Dr. Meera Nadagouda',
    qualification: 'MBBS, MD - Dermatology, Venereology & Leprosy',
    specialization: 'Dermatologist & Hair Specialist',
    categoryId: 'dermatologist',
    experienceYears: '9+ years',
    hospitalOrClinic: 'Aura Skin & Hair Clinic, Court Road',
    consultationFee: 450,
    discountFee: 360,
    discountPercent: 20,
    rating: 4.8,
    reviewCount: 140,
    image: 'https://images.unsplash.com/photo-1594824813575-56041c304d94?w=500&auto=format&fit=crop&q=60',
    about: 'Specialized in treating cystic acne, pigmentation, psoriasis, scalp disorders, and modern cosmetic skin therapies.',
    availableToday: true,
    nextAvailableSlot: 'Today at 02:00 PM',
    languages: ['Kannada', 'English', 'Hindi'],
    consultationModes: ['In-Clinic', 'Video Call'],
    location: 'Athani',
    isTopDoctor: true,
    isActive: true,
  },
  {
    id: 'doc-06',
    name: 'Dr. Vikram Bellad',
    qualification: 'MBBS, MD - Internal Medicine, DM - Cardiology',
    specialization: 'Consultant Interventional Cardiologist',
    categoryId: 'cardiologist',
    experienceYears: '15+ years',
    hospitalOrClinic: 'Heart & Vascular Specialty Hospital',
    consultationFee: 600,
    discountFee: 480,
    discountPercent: 20,
    rating: 4.9,
    reviewCount: 260,
    image: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=500&auto=format&fit=crop&q=60',
    about: 'Leading cardiologist with expertise in preventive heart health, post-angioplasty recovery, ECG/2D Echo analysis, and arrhythmia management.',
    availableToday: true,
    nextAvailableSlot: 'Today at 03:30 PM',
    languages: ['English', 'Kannada', 'Hindi'],
    consultationModes: ['In-Clinic', 'Video Call'],
    location: 'Athani',
    isTopDoctor: true,
    isActive: true,
  },
  {
    id: 'doc-07',
    name: 'Dr. Santosh Biradar',
    qualification: 'MBBS, MS - Orthopaedics, Fellowship in Joint Replacement',
    specialization: 'Orthopedic Surgeon & Bone Specialist',
    categoryId: 'orthopedic',
    experienceYears: '13+ years',
    hospitalOrClinic: 'Biradar Orthocare & Trauma Center',
    consultationFee: 450,
    discountFee: 360,
    discountPercent: 20,
    rating: 4.8,
    reviewCount: 180,
    image: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=500&auto=format&fit=crop&q=60',
    about: 'Specializing in knee & hip joint replacement, sports injury rehabilitation, spine spondylosis, and fracture fixation.',
    availableToday: true,
    nextAvailableSlot: 'Today at 11:45 AM',
    languages: ['Kannada', 'Hindi', 'English'],
    consultationModes: ['In-Clinic'],
    location: 'Athani',
    isTopDoctor: true,
    isActive: true,
  },
  {
    id: 'doc-08',
    name: 'Dr. Vinay Kolar',
    qualification: 'MBBS, MS - ENT',
    specialization: 'ENT & Head-Neck Specialist',
    categoryId: 'ent',
    experienceYears: '10+ years',
    hospitalOrClinic: 'Kolar ENT Care Center, Station Road',
    consultationFee: 400,
    discountFee: 320,
    discountPercent: 20,
    rating: 4.7,
    reviewCount: 120,
    image: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=500&auto=format&fit=crop&q=60',
    about: 'Experienced in endoscopic sinus surgery, tonsillectomy, hearing loss treatment, and allergy-induced breathing issues.',
    availableToday: true,
    nextAvailableSlot: 'Today at 05:00 PM',
    languages: ['Kannada', 'English'],
    consultationModes: ['In-Clinic', 'Video Call'],
    location: 'Athani',
    isTopDoctor: true,
    isActive: true,
  },
  {
    id: 'doc-09',
    name: 'Dr. Pooja Shettar',
    qualification: 'BDS, MDS - Conservative Dentistry & Endodontics',
    specialization: 'Dental Surgeon & Root Canal Specialist',
    categoryId: 'dentist',
    experienceYears: '8+ years',
    hospitalOrClinic: 'DentaCare Advanced Smile Studio',
    consultationFee: 300,
    discountFee: 240,
    discountPercent: 20,
    rating: 4.9,
    reviewCount: 155,
    image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=500&auto=format&fit=crop&q=60',
    about: 'Painless single-sitting root canals, dental crowns, teeth whitening, and complete oral hygiene care.',
    availableToday: true,
    nextAvailableSlot: 'Today at 01:30 PM',
    languages: ['Kannada', 'English', 'Hindi'],
    consultationModes: ['In-Clinic'],
    location: 'Athani',
    isTopDoctor: true,
    isActive: true,
  },
  {
    id: 'doc-10',
    name: 'Dr. Arvind Joshi',
    qualification: 'MBBS, MD - Psychiatry',
    specialization: 'Consultant Psychiatrist & Behavioral Therapist',
    categoryId: 'psychiatrist',
    experienceYears: '14+ years',
    hospitalOrClinic: 'Mind & Wellness Clinic',
    consultationFee: 500,
    discountFee: 400,
    discountPercent: 20,
    rating: 4.9,
    reviewCount: 110,
    image: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=500&auto=format&fit=crop&q=60',
    about: 'Empathic mental health care providing treatment for anxiety, adult ADHD, burnout, depression, and lifestyle counseling.',
    availableToday: true,
    nextAvailableSlot: 'Today at 06:00 PM',
    languages: ['Kannada', 'English', 'Hindi'],
    consultationModes: ['Video Call', 'In-Clinic'],
    location: 'Athani',
    isTopDoctor: true,
    isActive: true,
  },
];

/**
 * Seed initial doctors if table is empty
 */
async function seedDoctors() {
  try {
    const count = await Doctor.count();
    if (count === 0) {
      await Doctor.bulkCreate(INITIAL_DOCTORS);
      console.log('✅ Initial doctors seeded successfully.');
    }
  } catch (error) {
    console.error('⚠️ Could not seed doctors:', error.message);
  }
}

/**
 * Get all doctor categories
 */
async function getCategories(req, res) {
  try {
    return res.status(200).json({
      success: true,
      data: DOCTOR_CATEGORIES,
    });
  } catch (error) {
    console.error('Error fetching doctor categories:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch doctor categories',
      error: error.message,
    });
  }
}

/**
 * Get all doctors with filters
 */
async function getAllDoctors(req, res) {
  try {
    const { category, search, topOnly, mode } = req.query;

    let whereClause = { isActive: true };

    if (category && category !== 'all') {
      whereClause.categoryId = category;
    }

    if (topOnly === 'true' || topOnly === true) {
      whereClause.isTopDoctor = true;
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      whereClause[Op.or] = [
        { name: { [Op.iLike]: q } },
        { specialization: { [Op.iLike]: q } },
        { hospitalOrClinic: { [Op.iLike]: q } },
        { qualification: { [Op.iLike]: q } },
        { about: { [Op.iLike]: q } },
      ];
    }

    let doctors = await Doctor.findAll({
      where: whereClause,
      order: [['rating', 'DESC'], ['reviewCount', 'DESC']],
    });

    if (mode) {
      doctors = doctors.filter(doc => {
        const modes = Array.isArray(doc.consultationModes) ? doc.consultationModes : [];
        return modes.some(m => String(m).toLowerCase().includes(String(mode).toLowerCase()));
      });
    }

    // If database returned empty (e.g. before initial sync), return matched items from memory
    if (!doctors || doctors.length === 0) {
      let filtered = [...INITIAL_DOCTORS];
      if (category && category !== 'all') {
        filtered = filtered.filter(d => d.categoryId === category);
      }
      if (topOnly === 'true') {
        filtered = filtered.filter(d => d.isTopDoctor);
      }
      if (search && search.trim()) {
        const s = search.trim().toLowerCase();
        filtered = filtered.filter(d =>
          d.name.toLowerCase().includes(s) ||
          d.specialization.toLowerCase().includes(s) ||
          d.hospitalOrClinic.toLowerCase().includes(s)
        );
      }
      return res.status(200).json({
        success: true,
        count: filtered.length,
        data: filtered,
      });
    }

    return res.status(200).json({
      success: true,
      count: doctors.length,
      data: doctors,
    });
  } catch (error) {
    console.error('Error fetching doctors:', error);
    // Graceful fallback with memory seed
    return res.status(200).json({
      success: true,
      count: INITIAL_DOCTORS.length,
      data: INITIAL_DOCTORS,
    });
  }
}

/**
 * Get single doctor by ID with slots
 */
async function getDoctorById(req, res) {
  try {
    const { id } = req.params;
    let doctor = await Doctor.findByPk(id);

    if (!doctor) {
      doctor = INITIAL_DOCTORS.find(d => d.id === id);
    }

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found',
      });
    }

    // Generate upcoming 7 days slots
    const today = new Date();
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(today.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' });
      days.push({
        date: dateStr,
        dayName: `${dayName}, ${d.getDate()} ${d.toLocaleDateString('en-US', { month: 'short' })}`,
        isAvailable: true,
        slots: [
          { time: '09:00 AM - 10:00 AM', period: 'Morning', available: true },
          { time: '10:00 AM - 11:00 AM', period: 'Morning', available: true },
          { time: '11:00 AM - 12:00 PM', period: 'Morning', available: true },
          { time: '02:00 PM - 03:00 PM', period: 'Afternoon', available: true },
          { time: '03:00 PM - 04:00 PM', period: 'Afternoon', available: true },
          { time: '04:00 PM - 05:00 PM', period: 'Evening', available: true },
          { time: '05:00 PM - 06:00 PM', period: 'Evening', available: true },
          { time: '06:00 PM - 07:00 PM', period: 'Evening', available: true },
          { time: '07:00 PM - 08:00 PM', period: 'Evening', available: true },
          { time: '08:00 PM - 09:00 PM', period: 'Evening', available: true },
          { time: '09:00 PM - 10:00 PM', period: 'Night', available: true },
        ],
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        ...doctor.toJSON ? doctor.toJSON() : doctor,
        schedule: days,
      },
    });
  } catch (error) {
    console.error('Error fetching doctor details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch doctor details',
      error: error.message,
    });
  }
}

/**
 * Create a new doctor consultation appointment
 */
async function createAppointment(req, res) {
  try {
    const {
      doctorId,
      doctorName,
      specialization,
      hospitalOrClinic,
      patientName,
      patientPhone,
      patientAge,
      patientGender,
      consultationType,
      appointmentDate,
      timeSlot,
      symptomsOrReason,
      consultationFee,
    } = req.body;

    if (!doctorId || !patientName || !patientPhone || !appointmentDate || !timeSlot) {
      return res.status(400).json({
        success: false,
        message: 'Missing required appointment fields (doctorId, patientName, patientPhone, appointmentDate, timeSlot)',
      });
    }

    const appointmentId = `APT-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
    const userId = req.user ? req.user.id : (req.body.userId || 'guest_user');

    const appointment = await DoctorAppointment.create({
      id: appointmentId,
      userId,
      doctorId,
      doctorName: doctorName || 'Doctor',
      specialization: specialization || 'General Physician',
      hospitalOrClinic: hospitalOrClinic || 'Athani Clinic',
      patientName,
      patientPhone,
      patientAge: Number(patientAge) || 28,
      patientGender: patientGender || 'Male',
      consultationType: consultationType || 'In-Clinic',
      appointmentDate,
      timeSlot,
      symptomsOrReason: symptomsOrReason || '',
      consultationFee: Number(consultationFee) || 320,
      status: 'confirmed',
      paymentStatus: 'paid',
    });

    return res.status(201).json({
      success: true,
      message: 'Doctor consultation appointment confirmed successfully!',
      data: appointment,
    });
  } catch (error) {
    console.error('Error creating doctor appointment:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create doctor appointment',
      error: error.message,
    });
  }
}

/**
 * Get user appointments
 */
async function getUserAppointments(req, res) {
  try {
    const userId = req.user ? req.user.id : (req.query.userId || 'guest_user');
    const appointments = await DoctorAppointment.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
    });

    return res.status(200).json({
      success: true,
      count: appointments.length,
      data: appointments,
    });
  } catch (error) {
    console.error('Error fetching appointments:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch appointments',
      error: error.message,
    });
  }
}

module.exports = {
  DOCTOR_CATEGORIES,
  INITIAL_DOCTORS,
  seedDoctors,
  getCategories,
  getAllDoctors,
  getDoctorById,
  createAppointment,
  getUserAppointments,
};

