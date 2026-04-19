const AdminUser = require('../models/adminUser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt'); // Ensure you have installed this: npm install bcrypt
const Service = require('../models/Services');
const GroceryOrder = require('../models/groceryOrderModel');
const DineoutOrder = require('../models/dineoutOrderModel');
const Booking = require('../models/bookingModel');
const Ride = require('../models/rideModel');
const { Op } = require('sequelize');

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

    // Fetch all services (unfiltered by date)
    const services = await Service.findAll({
      attributes: ['status']
    });

    const serviceCounts = {
      'Not Available': 0,
      'Available': 0
    };

    services.forEach(service => {
      const status = (service.status || '').toLowerCase();
      if (status === 'active' || status === 'available') {
        serviceCounts['Available']++;
      } else {
        serviceCounts['Not Available']++;
      }
    });

    const serviceStatusData = Object.entries(serviceCounts);

    // Fetch Orders for counts and sales
    const whereClause = {
      createdAt: {
        [Op.between]: [queryStartDate, queryEndDate]
      }
    };

    const [groceries, dineouts, events, rides] = await Promise.all([
      GroceryOrder.findAll({ where: whereClause, attributes: ['createdAt', 'bill_details'] }),
      DineoutOrder.findAll({ where: whereClause, attributes: ['createdAt', 'bill_details'] }),
      Booking.findAll({ where: whereClause, attributes: ['createdAt', 'total_amount'] }),
      Ride.findAll({ where: whereClause, attributes: ['createdAt', 'service_details'] })
    ]);

    const counts = { Grocery: 0, Dineout: 0, Event: 0, Ride: 0 };
    const sales = { Grocery: 0, Dineout: 0, Event: 0, Ride: 0 };

    const trendMap = {};
    const trendKeys = [];
    
    // Pre-fill the 7-day trend map backward from end date
    for (let i = 6; i >= 0; i--) {
      const d = new Date(trendEndDate);
      d.setDate(d.getDate() - i);
      
      // YYYY-MM-DD acts as a timezone-safe local internal key
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateKey = `${yyyy}-${mm}-${dd}`;
      
      // "May 1" specific format logic
      const displayStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      trendMap[dateKey] = { displayStr, count: 0, sales: 0 };
      trendKeys.push(dateKey);
    }

    // Internal helper function to categorize logic across the 4 modules seamlessly
    const processOrders = (orders, category, getSalesFn) => {
      orders.forEach(order => {
        const orderDate = new Date(order.createdAt);
        const orderTime = orderDate.getTime();
        const salesVal = parseFloat(getSalesFn(order)) || 0;

        // 1. Overall stats for given generic date range
        if (orderTime >= fromDate.getTime() && orderTime <= toDate.getTime()) {
          counts[category]++;
          sales[category] += salesVal;
        }

        // 2. Add into 7-Day Trend specific buckets
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

    // Process models utilizing their unique JSON columns
    processOrders(groceries, 'Grocery', o => o.bill_details?.toPay);
    processOrders(dineouts, 'Dineout', o => o.bill_details?.toPay || o.bill_details?.grandTotal);
    processOrders(events, 'Event', o => o.total_amount);
    processOrders(rides, 'Ride', o => o.service_details?.price);

    const orderCountData = Object.entries(counts);
    const salesValueData = Object.entries(sales).map(([k, v]) => [k, parseFloat(v.toFixed(2))]);
    const trendData = trendKeys.map(key => {
      const item = trendMap[key];
      return [item.displayStr, item.count, parseFloat(item.sales.toFixed(2))];
    });

    const totalOrders = Object.values(counts).reduce((acc, val) => acc + val, 0);
    const totalSales = parseFloat(Object.values(sales).reduce((acc, val) => acc + val, 0).toFixed(2));

    res.status(200).json({ 
      success: true, 
      data: { 
        serviceStatusData,
        orderCountData,
        salesValueData,
        trendData,
        totalOrders,
        totalSales
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