const jwt = require('jsonwebtoken');
const AdminUser = require('../models/adminUser');

const verifyAdminToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  }

  try {
    // Use the admin JWT secret
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "django-insecure-0v(fl_v5t97hk)0mx&qq!b80ua)@-a@2e(5v4nac!$3l(m@9#(");
    
    const admin = await AdminUser.findByPk(decoded.user_id || decoded.Admin_user_id);
    if (!admin || !['admin', 'manager'].includes(admin.role)) {
        return res.status(403).json({ success: false, message: 'Forbidden. Admin access required.' });
    }

    req.user = admin; // Attach admin user data to the request
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

module.exports = verifyAdminToken;