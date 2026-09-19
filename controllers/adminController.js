const AdminUser = require('../models/adminUser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt'); // Ensure you have installed this: npm install bcrypt
const Service = require('../models/Services');
const GroceryOrder = require('../models/groceryOrderModel');
const DineoutOrder = require('../models/dineoutOrderModel');
const Booking = require('../models/bookingModel');
const Ride = require('../models/rideModel');
const User = require('../models/customUserModel');
const Rider = require('../models/ridersModel');
const PharmacyOrder = require('../models/pharmacyOrderModel');
const { Op } = require('sequelize');
const { sendEmailUtility } = require('./emailController');

const JWT_SECRET = process.env.JWT_SECRET || "django-insecure-0v(fl_v5t97hk)0mx&qq!b80ua)@-a@2e(5v4nac!$3l(m@9#(";

// In-memory store for admin password reset OTPs
// Format: { phone: { otp, email, adminId, expiresAt, attempts } }
const adminResetOtpStore = new Map();

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
 * Get Admin Home Data
 * GET /api/admin/home
 */
exports.getAdminHomeData = async (req, res) => {
  try {
    // Extract date range in epoch format from request query or body
    const startDate = req.body?.params?.startDate || req.query?.startDate;
    const endDate = req.body?.params?.endDate || req.query?.endDate;
    console.log(startDate, endDate)
// 1775327400 1776537000 output

    let fromDate = new Date(0); // Default to beginning of time if no date provided
    let toDate = new Date();
    let trendEndDate = new Date();

    if (startDate && endDate) {
      let startMs = parseInt(startDate);
      let endMs = parseInt(endDate);
      
      // If the epoch timestamp is in seconds (10 digits), convert to milliseconds
      if (startMs < 100000000000) startMs *= 1000;
      if (endMs < 100000000000) endMs *= 1000;

      fromDate = new Date(startMs);
      toDate = new Date(endMs);
      trendEndDate = new Date(endMs);
    }

    // Calculate start date for the 7-day trend
    const trendStartDate = new Date(trendEndDate);
    trendStartDate.setDate(trendEndDate.getDate() - 6);
    trendStartDate.setHours(0, 0, 0, 0); // Start of the 7th day ago

    // Determine the widest range needed for our database query
    const queryStartDate = new Date(Math.min(fromDate.getTime(), trendStartDate.getTime()));
    const queryEndDate = new Date(Math.max(toDate.getTime(), trendEndDate.getTime()));


    const whereClause = {
      createdAt: {
        [Op.between]: [queryStartDate, queryEndDate]
      }
    };

    // Parallel fetch: Services, Orders, Customer & Fleet statistics
    const [
      services,
      groceries,
      dineouts,
      events,
      rides,
      pharmacyOrders,
      totalCustomers,
      totalRiders,
      onlineRiders,
      verifiedRiders
    ] = await Promise.all([
      Service.findAll({ attributes: ['id', 'title', 'status'] }).catch(() => []),
      GroceryOrder.findAll({ where: whereClause, attributes: ['createdAt', 'bill_details'] }).catch(() => []),
      DineoutOrder.findAll({ where: whereClause, attributes: ['createdAt', 'bill_details'] }).catch(() => []),
      Booking.findAll({ where: whereClause, attributes: ['createdAt', 'total_amount'] }).catch(() => []),
      Ride.findAll({ where: whereClause, attributes: ['createdAt', 'service_details'] }).catch(() => []),
      PharmacyOrder.findAll({ where: whereClause, attributes: ['createdAt', 'billSummary'] }).catch(() => []),
      User.count().catch(() => 0),
      Rider.count().catch(() => 0),
      Rider.count({ where: { status: 'online' } }).catch(() => 0),
      Rider.count({ where: { is_verified: true } }).catch(() => 0)
    ]);

    // Service availability breakdown
    let activeServicesCount = 0;
    const serviceCounts = {
      'Available': 0,
      'Not Available': 0
    };

    services.forEach(service => {
      const status = (service.status || '').toLowerCase();
      if (status === 'active' || status === 'available') {
        serviceCounts['Available']++;
        activeServicesCount++;
      } else {
        serviceCounts['Not Available']++;
      }
    });

    const serviceStatusData = Object.entries(serviceCounts);

    // Categories initialization
    const counts = { Grocery: 0, Dineout: 0, Event: 0, Ride: 0, Pharmacy: 0 };
    const sales = { Grocery: 0, Dineout: 0, Event: 0, Ride: 0, Pharmacy: 0 };

    const trendMap = {};
    const trendKeys = [];
    
    // Pre-fill the 7-day trend map backward from end date
    for (let i = 6; i >= 0; i--) {
      const d = new Date(trendEndDate);
      d.setDate(d.getDate() - i);
      
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateKey = `${yyyy}-${mm}-${dd}`;
      
      const displayStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      trendMap[dateKey] = { displayStr, count: 0, sales: 0 };
      trendKeys.push(dateKey);
    }

    // Helper function to process orders
    const processOrders = (orders, category, getSalesFn) => {
      if (!Array.isArray(orders)) return;
      orders.forEach(order => {
        const orderDate = new Date(order.createdAt);
        const orderTime = orderDate.getTime();
        const salesVal = parseFloat(getSalesFn(order)) || 0;

        // 1. Overall stats for selected date range
        if (orderTime >= fromDate.getTime() && orderTime <= toDate.getTime()) {
          counts[category] = (counts[category] || 0) + 1;
          sales[category] = (sales[category] || 0) + salesVal;
        }

        // 2. 7-Day Trend specific buckets
        const oYyyy = orderDate.getFullYear();
        const oMm = String(orderDate.getMonth() + 1).padStart(2, '0');
        const oDd = String(orderDate.getDate()).padStart(2, '0');
        const orderDateKey = `${oYyyy}-${oMm}-${oDd}`;
        
        if (trendMap[orderDateKey]) {
          trendMap[orderDateKey].count++;
          trendMap[orderDateKey].sales += salesVal;
        }
      });
    };

    // Process models
    processOrders(groceries, 'Grocery', o => o.bill_details?.toPay);
    processOrders(dineouts, 'Dineout', o => o.bill_details?.toPay || o.bill_details?.grandTotal);
    processOrders(events, 'Event', o => o.total_amount);
    processOrders(rides, 'Ride', o => o.service_details?.price);
    processOrders(pharmacyOrders, 'Pharmacy', o => o.billSummary?.toPay || o.billSummary?.total);

    const orderCountData = Object.entries(counts);
    const salesValueData = Object.entries(sales).map(([k, v]) => [k, parseFloat(v.toFixed(2))]);
    const trendData = trendKeys.map(key => {
      const item = trendMap[key];
      return [item.displayStr, item.count, parseFloat(item.sales.toFixed(2))];
    });

    const totalOrders = Object.values(counts).reduce((acc, val) => acc + val, 0);
    const totalSales = parseFloat(Object.values(sales).reduce((acc, val) => acc + val, 0).toFixed(2));
    const avgOrderValue = totalOrders > 0 ? parseFloat((totalSales / totalOrders).toFixed(2)) : 0;

    // Detailed service breakdown table
    const serviceBreakdown = Object.keys(counts).map(key => ({
      name: key,
      orders: counts[key],
      sales: parseFloat(sales[key].toFixed(2)),
      orderShare: totalOrders > 0 ? parseFloat(((counts[key] / totalOrders) * 100).toFixed(1)) : 0,
      salesShare: totalSales > 0 ? parseFloat(((sales[key] / totalSales) * 100).toFixed(1)) : 0
    }));

    // Today's metrics
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const todayItem = trendMap[todayKey] || { count: 0, sales: 0 };
    const todayOrders = todayItem.count;
    const todaySales = parseFloat(todayItem.sales.toFixed(2));

    res.status(200).json({ 
      success: true, 
      data: { 
        serviceStatusData,
        orderCountData,
        salesValueData,
        trendData,
        totalOrders,
        totalSales,
        avgOrderValue,
        totalCustomers,
        totalRiders,
        onlineRiders,
        verifiedRiders,
        activeServicesCount,
        totalServicesCount: services.length,
        serviceBreakdown,
        todayOrders,
        todaySales
      } 
    });
  } catch (error) {
    console.error('Get Admin Home Data Error:', error);
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

/**
 * Forgot Password - Send OTP to admin's registered email
 * POST /api/admin/forgot-password
 */
exports.adminForgotPassword = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    const admin = await AdminUser.findOne({ where: { phone } });
    if (!admin) {
      return res.status(404).json({ success: false, message: 'No admin account found with this phone number' });
    }

    if (!admin.email) {
      return res.status(400).json({ success: false, message: 'No email address registered for this account. Contact your administrator.' });
    }

    // Generate 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));

    // Store OTP with 10-minute expiry
    adminResetOtpStore.set(phone, {
      otp,
      email: admin.email,
      adminId: admin.id,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
      attempts: 0
    });

    // Mask email for response (e.g., p***u@gmail.com)
    const emailParts = admin.email.split('@');
    const name = emailParts[0];
    const maskedName = name.length <= 2 
      ? name[0] + '***' 
      : name[0] + '***' + name[name.length - 1];
    const maskedEmail = maskedName + '@' + emailParts[1];

    // Send OTP email
    const emailBody = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
        <div style="background: linear-gradient(135deg, #000000, #1f1f1f); padding: 30px 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">ONE<span style="font-weight: 300;">APP</span></h1>
          <p style="color: #888; margin: 8px 0 0; font-size: 13px; text-transform: uppercase; letter-spacing: 2px;">Admin Console</p>
        </div>
        <div style="padding: 32px 24px;">
          <h2 style="color: #333; margin: 0 0 8px; font-size: 20px;">Password Reset</h2>
          <p style="color: #666; font-size: 14px; line-height: 1.6;">Hi ${admin.first_name || 'Admin'}, use the OTP below to reset your password. This code expires in <strong>10 minutes</strong>.</p>
          <div style="background: #f8f9fa; border: 2px dashed #dee2e6; border-radius: 10px; padding: 20px; text-align: center; margin: 24px 0;">
            <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #000;">${otp}</span>
          </div>
          <p style="color: #999; font-size: 12px; text-align: center;">If you didn't request this, please ignore this email.</p>
        </div>
        <div style="background: #f8f9fa; padding: 16px 24px; text-align: center; border-top: 1px solid #eee;">
          <p style="color: #aaa; font-size: 11px; margin: 0;">© ${new Date().getFullYear()} OneApp Admin Console</p>
        </div>
      </div>
    `;

    const emailResult = await sendEmailUtility(admin.email, 'OneApp Admin - Password Reset OTP', emailBody);

    if (!emailResult.success) {
      return res.status(500).json({ success: false, message: 'Failed to send OTP email. Please try again.' });
    }

    res.status(200).json({ 
      success: true, 
      message: 'OTP sent successfully', 
      maskedEmail 
    });
  } catch (error) {
    console.error('Admin Forgot Password Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Verify Reset OTP
 * POST /api/admin/verify-reset-otp
 */
exports.adminVerifyResetOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    if (!phone || !otp) {
      return res.status(400).json({ success: false, message: 'Phone and OTP are required' });
    }

    const stored = adminResetOtpStore.get(phone);

    if (!stored) {
      return res.status(400).json({ success: false, message: 'No OTP found. Please request a new one.' });
    }

    // Check expiry
    if (Date.now() > stored.expiresAt) {
      adminResetOtpStore.delete(phone);
      return res.status(400).json({ success: false, message: 'OTP has expired. Please request a new one.' });
    }

    // Check max attempts
    if (stored.attempts >= 5) {
      adminResetOtpStore.delete(phone);
      return res.status(429).json({ success: false, message: 'Too many failed attempts. Please request a new OTP.' });
    }

    // Verify OTP
    if (stored.otp !== String(otp).trim()) {
      stored.attempts++;
      return res.status(400).json({ 
        success: false, 
        message: `Invalid OTP. ${5 - stored.attempts} attempts remaining.` 
      });
    }

    // OTP verified — generate a short-lived reset token (5 min)
    const resetToken = jwt.sign(
      { adminId: stored.adminId, purpose: 'password_reset' }, 
      JWT_SECRET, 
      { expiresIn: '5m' }
    );

    // Don't delete the OTP yet (cleanup happens on password reset or expiry)

    res.status(200).json({ 
      success: true, 
      message: 'OTP verified successfully',
      resetToken 
    });
  } catch (error) {
    console.error('Admin Verify Reset OTP Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Reset Password (using reset token from verified OTP)
 * POST /api/admin/reset-password
 */
exports.adminResetPassword = async (req, res) => {
  try {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword) {
      return res.status(400).json({ success: false, message: 'Reset token and new password are required' });
    }

    if (String(newPassword).trim().length < 4) {
      return res.status(400).json({ success: false, message: 'Password must be at least 4 characters long' });
    }

    // Verify the reset token
    let decoded;
    try {
      decoded = jwt.verify(resetToken, JWT_SECRET);
    } catch (err) {
      return res.status(400).json({ success: false, message: 'Reset token has expired. Please start over.' });
    }

    if (decoded.purpose !== 'password_reset') {
      return res.status(400).json({ success: false, message: 'Invalid reset token' });
    }

    // Find admin and update password
    const admin = await AdminUser.findByPk(decoded.adminId);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    const hashedPassword = await bcrypt.hash(String(newPassword).trim(), 10);
    admin.password_field = hashedPassword;
    await admin.save();

    // Cleanup: remove OTP from store
    adminResetOtpStore.delete(admin.phone);

    res.status(200).json({ success: true, message: 'Password reset successfully. You can now login with your new password.' });
  } catch (error) {
    console.error('Admin Reset Password Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Change Password (for logged-in admin via settings)
 * POST /api/admin/change-password
 */
exports.adminChangePassword = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Current password and new password are required' });
    }

    if (String(newPassword).trim().length < 4) {
      return res.status(400).json({ success: false, message: 'New password must be at least 4 characters long' });
    }

    const admin = await AdminUser.findByPk(decoded.user_id);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(String(currentPassword).trim(), admin.password_field);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    // Hash and save new password
    const hashedPassword = await bcrypt.hash(String(newPassword).trim(), 10);
    admin.password_field = hashedPassword;
    await admin.save();

    res.status(200).json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Admin Change Password Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};