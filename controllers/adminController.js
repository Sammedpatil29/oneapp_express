const AdminUser = require('../models/adminUser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt'); // Ensure you have installed this: npm install bcrypt

const JWT_SECRET = process.env.JWT_SECRET || "django-insecure-0v(fl_v5t97hk)0mx&qq!b80ua)@-a@2e(5v4nac!$3l(m@9#(";

/**
 * Create a new Admin User
 * POST /api/admin/create
 */
exports.createAdmin = async (req, res) => {
  try {
    const { email, password, first_name, last_name, phone, role, profile_image } = req.body;

    // Basic Validation
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    // Check if admin already exists
    const existingAdmin = await AdminUser.findOne({ where: { email } });
    if (existingAdmin) {
      return res.status(409).json({ success: false, message: 'Admin with this email already exists' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create Admin
    const newAdmin = await AdminUser.create({
      email,
      password_field: hashedPassword, // Storing hashed password
      first_name,
      last_name,
      phone,
      role: role || 'admin',
      profile_image,
      date_joined: new Date(),
      is_active: true,
      is_verified: true
    });

    // Return success (excluding password)
    const adminData = newAdmin.toJSON();
    delete adminData.password_field;

    res.status(201).json({ success: true, message: 'Admin created successfully', data: adminData });
  } catch (error) {
    console.error('Create Admin Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Login Admin
 * POST /api/admin/login
 */
exports.loginAdmin = async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ success: false, message: 'phone and password are required' });
    }

    const admin = await AdminUser.findOne({ where: { phone } });
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    // Verify Password
    const isMatch = await bcrypt.compare(password, admin.password_field);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Generate Token (Payload matches expectations in utils/jwttoken.js)
    const token = jwt.sign({ user_id: admin.id, Admin_user_id: admin.id, role: admin.role }, JWT_SECRET, { expiresIn: '24h' });

    res.status(200).json({ success: true, message: 'Login successful', token, role: admin.role });
  } catch (error) {
    console.error('Login Admin Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};