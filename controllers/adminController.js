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
    const hashedPassword = await bcrypt.hash(String(password).trim(), 10);

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
 * Get All Admin Users
 * GET /api/admin/list
 */
exports.getAllAdmins = async (req, res) => {
  try {
    const admins = await AdminUser.findAll({
    });
    res.status(200).json({ success: true, data: admins });
  } catch (error) {
    console.error('Get All Admins Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update Admin User
 * PUT /api/admin/:id
 */
exports.updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, password, first_name, last_name, phone, role, profile_image, is_active } = req.body;

    const admin = await AdminUser.findByPk(id);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    // Update fields if provided
    if (email) admin.email = email;
    if (first_name) admin.first_name = first_name;
    if (last_name) admin.last_name = last_name;
    if (phone) admin.phone = phone;
    if (role) admin.role = role;
    if (profile_image) admin.profile_image = profile_image;
    if (is_active !== undefined) admin.is_active = is_active;

    // Handle password update
    if (password && String(password).trim() !== "") {
      const hashedPassword = await bcrypt.hash(String(password).trim(), 10);
      admin.password_field = hashedPassword;
    }

    await admin.save();

    // Return updated data without password
    const adminData = admin.toJSON();
    delete adminData.password_field;

    res.status(200).json({ success: true, message: 'Admin updated successfully', data: adminData });
  } catch (error) {
    console.error('Update Admin Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Delete Admin User
 * DELETE /api/admin/:id
 */
exports.deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await AdminUser.destroy({ where: { id } });

    if (deleted) {
      return res.status(200).json({ success: true, message: 'Admin deleted successfully' });
    }

    return res.status(404).json({ success: false, message: 'Admin not found' });
  } catch (error) {
    console.error('Delete Admin Error:', error);
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
    const isMatch = await bcrypt.compare(String(password).trim(), admin.password_field);
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

/**
 * Get Current Admin Profile
 * GET /api/admin/profile
 */
exports.getAdminProfile = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    
    const admin = await AdminUser.findByPk(decoded.user_id, {
      attributes: { exclude: ['password_field'] }
    });

    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    res.status(200).json({ success: true, data: admin });
  } catch (error) {
    console.error('Get Admin Profile Error:', error);
    res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};