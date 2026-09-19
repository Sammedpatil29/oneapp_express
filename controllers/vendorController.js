// controllers/vendorController.js
const Vendor = require('../models/vendorModel');
const { sign, verify } = require('jsonwebtoken');
const { sendEmailUtility } = require('./emailController');

const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key_123';

// In-memory OTP storage: phone -> { otp, vendorId, email, expiresAt, attempts }
const vendorOtpStore = new Map();

/**
 * Utility to mask email for privacy: e.g. "ramesh.patil@gmail.com" -> "ra***il@gmail.com"
 */
function maskEmail(email) {
  if (!email || typeof email !== 'string') return '';
  const parts = email.split('@');
  if (parts.length !== 2) return email;
  const [name, domain] = parts;
  if (name.length <= 3) {
    return `${name.charAt(0)}***@${domain}`;
  }
  const start = name.slice(0, 2);
  const end = name.slice(-2);
  return `${start}***${end}@${domain}`;
}

/**
 * Seed initial dummy vendor if database has none or dummy phone is missing
 */
async function seedVendor() {
  try {
    const dummyPhone = '9876543210';
    const existing = await Vendor.findOne({ where: { phone: dummyPhone } });

    if (!existing) {
      // Use SMTP_USER if available so OTP actually arrives in user's inbox during testing!
      const targetEmail = process.env.SMTP_USER || 'vendor@pintu.com';
      const existingEmail = await Vendor.findOne({ where: { email: targetEmail } });
      const finalEmail = existingEmail ? targetEmail.replace('@', '+dummy@') : targetEmail;

      const dummy = await Vendor.create({
        name: 'Ramesh Patil',
        store_name: 'Pintu Fresh Mart',
        phone: dummyPhone,
        email: finalEmail,
        category: 'grocery',
        city: 'Hubballi',
        address: 'Shop #14, APMC Market Yard, Hubballi',
        is_open: true,
        status: 'active',
        rating: 4.9,
        role: 'vendor',
      });
      console.log(`✅ [VENDOR SEED] Created dummy vendor: ${dummy.store_name} | Phone: ${dummy.phone} | Email: ${dummy.email}`);
    } else {
      console.log(`ℹ️ [VENDOR SEED] Dummy vendor exists: ${existing.store_name} (+91 ${existing.phone}) -> ${existing.email}`);
    }
  } catch (err) {
    console.warn('⚠️ [VENDOR SEED] Notice:', err.message);
  }
}

/**
 * 1. Request Vendor Login OTP via Mobile Number
 * POST /api/vendor/send-otp
 * Body: { phone: "9876543210" } or { mobileNumber: "9876543210" }
 */
async function sendVendorOtp(req, res) {
  try {
    const rawPhone = req.body.phone || req.body.mobileNumber;
    if (!rawPhone) {
      return res.status(400).json({
        success: false,
        message: 'Mobile number is required',
      });
    }

    const cleanPhone = String(rawPhone).replace(/\D/g, '').slice(-10);
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 10-digit Indian mobile number',
      });
    }

    // Lookup vendor by phone
    const vendor = await Vendor.findOne({ where: { phone: cleanPhone } });

    // CRITICAL: If vendor is NOT registered, return notRegistered flag
    if (!vendor) {
      return res.status(404).json({
        success: false,
        notRegistered: true,
        message: `Mobile number (+91 ${cleanPhone}) is not registered as a Pintu Vendor. Please contact admin or partner support to onboard your store.`,
      });
    }

    // Check if vendor is active
    if (vendor.status && vendor.status.toLowerCase() !== 'active') {
      return res.status(403).json({
        success: false,
        notActive: true,
        message: `Your vendor account is currently ${vendor.status}. Please contact Pintu Partner Support.`,
      });
    }

    if (!vendor.email) {
      return res.status(400).json({
        success: false,
        message: 'No registered email found for this vendor account. Please contact Pintu Partner Support.',
      });
    }

    const cleanEmail = vendor.email.toLowerCase().trim();
    // Generate secure 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes validity

    vendorOtpStore.set(cleanPhone, {
      otp,
      vendorId: vendor.id,
      email: cleanEmail,
      expiresAt,
      attempts: 0,
    });

    const masked = maskEmail(cleanEmail);

    // Email Template styled with Pintu brand color #a000e2
    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 540px; margin: 0 auto; padding: 32px 24px; border: 1px solid #e2e8f0; border-radius: 20px; background-color: #ffffff; box-shadow: 0 4px 20px rgba(0,0,0,0.05);">
        <div style="text-align: center; margin-bottom: 26px;">
          <div style="display: inline-block; width: 50px; height: 50px; line-height: 50px; border-radius: 14px; background: linear-gradient(135deg, #a000e2 0%, #7900b2 100%); color: #ffffff; font-size: 26px; font-weight: 800; margin-bottom: 8px;">
            P
          </div>
          <h2 style="color: #a000e2; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Pintu Vendor Hub</h2>
          <p style="color: #64748b; font-size: 13px; margin-top: 4px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Merchant Portal Authentication</p>
        </div>

        <p style="font-size: 15px; color: #1e293b; margin-bottom: 8px; font-weight: 600;">Hello ${vendor.name || 'Merchant'},</p>
        <p style="font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 24px;">
          Use the 6-digit verification code below to securely sign in to your merchant portal for <strong>${vendor.store_name}</strong>.
        </p>

        <div style="background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%); border: 2px dashed #a000e2; border-radius: 16px; padding: 24px 20px; text-align: center; margin-bottom: 24px;">
          <div style="font-size: 12px; font-weight: 700; color: #a000e2; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">Your One-Time Code</div>
          <span style="font-size: 38px; font-weight: 800; letter-spacing: 10px; color: #680096; font-family: monospace;">${otp}</span>
        </div>

        <div style="background: #f8fafc; border-radius: 12px; padding: 14px 16px; margin-bottom: 24px;">
          <div style="display: flex; align-items: center; gap: 8px; font-size: 12.5px; color: #64748b; line-height: 1.5;">
            <span>⏱️ Code is valid for <strong>10 minutes</strong>. Do not share this OTP with anyone, including Pintu representatives.</span>
          </div>
        </div>

        <div style="border-top: 1px solid #f1f5f9; padding-top: 18px; text-align: center;">
          <p style="font-size: 12px; color: #94a3b8; margin: 0 0 4px;">Registered Mobile: +91 ${cleanPhone}</p>
          <p style="font-size: 11.5px; color: #cbd5e1; margin: 0;">© 2026 Pintu Technologies Pvt Ltd. All rights reserved.</p>
        </div>
      </div>
    `;

    // Send email via existing utility
    const emailResult = await sendEmailUtility(cleanEmail, `Your Pintu Vendor Login Code: ${otp}`, htmlBody);
    console.log(`✉️ [VENDOR EMAIL OTP] Sent to: ${cleanEmail} (Phone: ${cleanPhone}) | OTP: ${otp} | SentStatus: ${emailResult?.success}`);

    return res.status(200).json({
      success: true,
      message: `OTP sent successfully to registered email (${masked})`,
      email: masked,
      cleanEmail: cleanEmail,
      devOtp: process.env.NODE_ENV !== 'production' ? otp : undefined,
    });
  } catch (error) {
    console.error('Error in sendVendorOtp:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to send OTP: ' + error.message,
    });
  }
}

/**
 * 2. Verify Vendor OTP
 * POST /api/vendor/verify-otp
 * Body: { phone: "9876543210", otp: "123456" }
 */
async function verifyVendorOtp(req, res) {
  try {
    const rawPhone = req.body.phone || req.body.mobileNumber;
    const { otp } = req.body;

    if (!rawPhone || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and OTP are required',
      });
    }

    const cleanPhone = String(rawPhone).replace(/\D/g, '').slice(-10);
    const cleanOtp = String(otp).trim();

    const record = vendorOtpStore.get(cleanPhone);

    // Verify OTP against store (or allow test OTP '123456' in dev)
    const isMatch = (record && record.otp === cleanOtp) || (process.env.NODE_ENV !== 'production' && cleanOtp === '123456');

    if (!isMatch) {
      if (record && Date.now() > record.expiresAt) {
        vendorOtpStore.delete(cleanPhone);
        return res.status(400).json({
          success: false,
          message: 'Verification code has expired. Please request a new code.',
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code. Please check and try again.',
      });
    }

    // OTP verified: clear from store
    vendorOtpStore.delete(cleanPhone);

    // Fetch vendor record
    const vendor = await Vendor.findOne({ where: { phone: cleanPhone } });
    if (!vendor) {
      return res.status(404).json({
        success: false,
        notRegistered: true,
        message: 'Vendor not found. Please contact support.',
      });
    }

    // Update last_login
    vendor.last_login = new Date();
    await vendor.save();

    // Generate JWT Token
    const token = sign(
      { id: vendor.id, phone: vendor.phone, role: 'vendor' },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    const userPayload = {
      id: vendor.id,
      phone: vendor.phone,
      name: vendor.name,
      email: vendor.email,
      role: 'vendor',
      store: {
        id: vendor.id,
        name: vendor.store_name,
        category: vendor.category,
        city: vendor.city,
        address: vendor.address,
        isOpen: vendor.is_open !== false,
        rating: vendor.rating || 4.8,
        status: vendor.status || 'active',
      },
    };

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: userPayload,
    });
  } catch (error) {
    console.error('Error in verifyVendorOtp:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during OTP verification: ' + error.message,
    });
  }
}

/**
 * 3. Get Current Vendor Profile
 * GET /api/vendor/profile
 */
async function getVendorProfile(req, res) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = verify(token, JWT_SECRET);
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    const vendor = await Vendor.findByPk(decoded.id);
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    return res.status(200).json({
      success: true,
      vendor: {
        id: vendor.id,
        phone: vendor.phone,
        name: vendor.name,
        email: vendor.email,
        store: {
          id: vendor.id,
          name: vendor.store_name,
          category: vendor.category,
          city: vendor.city,
          address: vendor.address,
          isOpen: vendor.is_open,
          rating: vendor.rating,
          status: vendor.status,
        },
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * 4. Update Store Online/Offline status
 * PUT /api/vendor/status
 * Body: { is_open: true/false }
 */
async function updateStoreStatus(req, res) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = verify(token, JWT_SECRET);
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    const { is_open, isOpen } = req.body;
    const finalStatus = typeof is_open === 'boolean' ? is_open : (typeof isOpen === 'boolean' ? isOpen : true);

    const vendor = await Vendor.findByPk(decoded.id);
    if (!vendor) {
      return res.status(404).json({ success: false, message: 'Vendor not found' });
    }

    vendor.is_open = finalStatus;
    await vendor.save();

    return res.status(200).json({
      success: true,
      message: finalStatus ? 'Store is now online' : 'Store is now paused',
      is_open: vendor.is_open,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

/**
 * 5. Get All Vendors (for admin or debugging)
 * GET /api/vendor/list
 */
async function getAllVendors(req, res) {
  try {
    const vendors = await Vendor.findAll({
      order: [['createdAt', 'DESC']],
    });
    return res.status(200).json({ success: true, count: vendors.length, data: vendors });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  seedVendor,
  sendVendorOtp,
  verifyVendorOtp,
  getVendorProfile,
  updateStoreStatus,
  getAllVendors,
};

