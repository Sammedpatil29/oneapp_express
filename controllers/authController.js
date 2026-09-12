// controllers/authController.js
const User = require('../models/customUserModel');
const { verify, sign } = require('jsonwebtoken');
const { sendFcmNotification } = require('../utils/fcmSender');
const { sendEmailUtility } = require('./emailController');

// 🔐 Secret Key (Put this in your .env file in production)
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_key_123';

/**
 * 1. Verify Token
 * Checks if the token sent from frontend is valid.
 * Used on App Splash Screen.
 */
async function verifyToken(req, res) {
  try {
    const token = req.headers.authorization?.split(' ')[1]; // Expecting "Bearer <token>"

    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    // Verify the token
    verify(token, JWT_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(401).json({ success: false, valid: false, message: 'Token expired or invalid' });
      }

      // Optional: Check if user still exists in DB
      const user = await User.findByPk(decoded.id);
      if (!user) {
        return res.status(401).json({ success: false, valid: false, message: 'User no longer exists' });
      }

      // Token is valid
      return res.json({ success: true, valid: true, user });
    });

  } catch (error) {
    console.error('Verify Token Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

/**
 * 2. Login (Check Phone)
 * Checks if phone exists.
 * - If YES: Returns JWT Token (Login success).
 * - If NO: Returns flag to show Register Form.
 */
async function login(req, res) {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number is required' });
    }

    // Check if user exists
    const user = await User.findOne({ where: { phone } });

    if (user) {
      // ✅ User found: Generate Token & Login
      const token = sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
      
      // Update last_login
      user.last_login = new Date();
      await user.save();

      return res.json({
        success: true,
        isNewUser: false,
        token: token,
        user: user
      });
    } else {
      // ❌ User not found: Tell frontend to show Register Form
      return res.json({
        success: true, // Request was successful, but user needs to register
        isNewUser: true,
        message: 'User not found, please register'
      });
    }

  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
}

/**
 * 3. Create User (Register)
 * specific flow: Creates user -> Returns JWT Token.
 */
async function register(req, res) {
  try {
    const { phone, username, email, first_name, last_name, fcm_token } = req.body;

    // Basic Validation
    if (!phone || !username || !email) {
      return res.status(400).json({ success: false, message: 'Phone, Username, and Email are required' });
    }

    // Check for duplicates (safety check)
    const existingUser = await User.findOne({ where: { phone } });
    if (existingUser) {
      return res.status(409).json({ success: false, message: 'User with this phone already exists' });
    }

    // Create new user
    const newUser = await User.create({
      phone,
      username,
      email,
      first_name,
      last_name,
      fcm_token,
      is_active: true,
      role: 'user', // default role
      date_joined: new Date(),
      last_login: new Date()
    });

    // ✅ Generate Token immediately after creation
    const token = sign({ id: newUser.id, role: newUser.role }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      token: token,
      user: newUser
    });

    // Send a welcome notification if FCM token is present (fire and forget)
    if (fcm_token) {
      sendFcmNotification(
        fcm_token,
        'Welcome to OneApp!',
        `Hi ${first_name || 'there'}, thank you for joining us.`
      ).catch(err => 
        console.error("Failed to send welcome notification:", err)
      );
    }
  } catch (error) {
    console.error('Registration Error:', error);
    // Handle Sequelize Unique Constraint Errors (e.g., duplicate email)
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ success: false, message: 'Username or Email already taken' });
    }
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
}

/**
 * 4. Get User Data
 * GET /user
 * Returns user details based on the provided token.
 */
async function getUser(req, res) {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    verify(token, JWT_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(401).json({ success: false, message: 'Token expired or invalid' });
      }

      const user = await User.findByPk(decoded.id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }

      return res.json({ success: true, user });
    });
  } catch (error) {
    console.error('Get User Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

/**
 * 5. Update User Data
 * PATCH /user
 * Updates first_name, last_name, and email for the logged-in user.
 */
async function updateUser(req, res) {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    verify(token, JWT_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(401).json({ success: false, message: 'Token expired or invalid' });
      }

      try {
        const user = await User.findByPk(decoded.id);
        if (!user) {
          return res.status(404).json({ success: false, message: 'User not found' });
        }

        const { first_name, last_name, profile_image } = req.body;

        // Strictly disallow updating phone and email: they are permanent and immutable
        if (first_name !== undefined) user.first_name = String(first_name).trim();
        if (last_name !== undefined) user.last_name = String(last_name).trim();
        if (profile_image !== undefined) user.profile_image = profile_image;

        await user.save();

        return res.json({ success: true, message: 'Profile updated successfully', user });
      } catch (dbError) {
        console.error('Update User DB Error:', dbError);
        if (dbError.name === 'SequelizeUniqueConstraintError') {
          return res.status(409).json({ success: false, message: 'Email already in use' });
        }
        return res.status(500).json({ success: false, message: 'Database error' });
      }
    });
  } catch (error) {
    console.error('Update User Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

/**
 * 6. Update FCM Token
 * PATCH /fcm-token
 * Updates the FCM token for the logged-in user.
 */
async function updateFcmToken(req, res) {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    verify(token, JWT_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(401).json({ success: false, message: 'Token expired or invalid' });
      }

      try {
        const user = await User.findByPk(decoded.id);
        if (!user) {
          return res.status(404).json({ success: false, message: 'User not found' });
        }

        const { fcm_token } = req.body;

        if (!fcm_token) {
          return res.status(400).json({ success: false, message: 'FCM Token is required' });
        }

        user.fcm_token = fcm_token;
        await user.save();

        return res.json({ success: true, message: 'FCM Token updated successfully' });
      } catch (dbError) {
        console.error('Update FCM Token DB Error:', dbError);
        return res.status(500).json({ success: false, message: 'Database error' });
      }
    });
  } catch (error) {
    console.error('Update FCM Token Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

/**
 * 7. Get All Users
 * GET /users
 * Fetches a list of all users.
 */
async function getAllUsers(req, res) {
  try {
    const users = await User.findAll({
      order: [['date_joined', 'DESC']]
    });

    return res.status(200).json({ success: true, count: users.length, data: users });
  } catch (error) {
    console.error('Get All Users Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
}

// In-memory store for Customer Email OTPs
const customerEmailOtpStore = new Map();

/**
 * 8. Send Customer Email OTP
 * POST /api/auth/send-otp
 */
async function sendCustomerEmailOtp(req, res) {
  try {
    const { email } = req.body;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    // Generate secure 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    customerEmailOtpStore.set(cleanEmail, { otp, expiresAt, attempts: 0 });

    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #a000e2; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Pintu</h2>
          <p style="color: #64748b; font-size: 14px; margin-top: 4px; font-weight: 500;">Everyday Mobility &amp; Minutes Delivery</p>
        </div>
        <p style="font-size: 15px; color: #1e293b; margin-bottom: 12px;">Hello,</p>
        <p style="font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 24px;">Use the verification code below to securely authenticate your Pintu customer account.</p>
        <div style="background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%); border: 2px dashed #a000e2; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
          <span style="font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #7900b2; font-family: monospace;">${otp}</span>
        </div>
        <p style="font-size: 13px; color: #64748b; line-height: 1.5; margin-bottom: 20px;">⏱️ This one-time code is valid for <strong>10 minutes</strong>. For your account security, please do not share this code with anyone.</p>
        <div style="border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px;">
          <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">© 2026 Pintu Logistics &amp; Mobility Pvt Ltd. All rights reserved.</p>
        </div>
      </div>
    `;

    // Attempt email delivery
    const emailResult = await sendEmailUtility(cleanEmail, `Your Pintu Verification Code: ${otp}`, htmlBody);
    console.log(`✉️ [CUSTOMER EMAIL OTP] Sent to: ${cleanEmail} | OTP: ${otp} | SentStatus: ${emailResult?.success}`);

    return res.status(200).json({
      success: true,
      message: 'Verification code sent successfully to ' + cleanEmail,
      devOtp: process.env.NODE_ENV !== 'production' ? otp : undefined
    });
  } catch (error) {
    console.error('Error in sendCustomerEmailOtp:', error);
    return res.status(500).json({ success: false, message: 'Failed to send verification code. ' + error.message });
  }
}

/**
 * 9. Verify Customer Email OTP
 * POST /api/auth/verify-otp
 */
async function verifyCustomerEmailOtp(req, res) {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and verification code are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanOtp = otp.toString().trim();

    const record = customerEmailOtpStore.get(cleanEmail);
    if (!record) {
      return res.status(400).json({
        success: false,
        message: 'No OTP requested for this email or it has expired. Please request a new code.'
      });
    }

    if (Date.now() > record.expiresAt) {
      customerEmailOtpStore.delete(cleanEmail);
      return res.status(400).json({
        success: false,
        message: 'Verification code has expired. Please request a new code.'
      });
    }

    if (record.otp !== cleanOtp) {
      record.attempts = (record.attempts || 0) + 1;
      if (record.attempts >= 5) {
        customerEmailOtpStore.delete(cleanEmail);
        return res.status(400).json({
          success: false,
          message: 'Too many incorrect attempts. Please request a new verification code.'
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Incorrect verification code. Please check and try again.'
      });
    }

    // Code verified successfully -> consume it
    customerEmailOtpStore.delete(cleanEmail);

    // Check if user exists by email
    const user = await User.findOne({ where: { email: cleanEmail } });

    if (user) {
      const token = sign({ id: user.id, role: user.role || 'user' }, JWT_SECRET, { expiresIn: '30d' });
      user.last_login = new Date();
      await user.save();

      return res.status(200).json({
        success: true,
        isNewUser: false,
        token,
        user
      });
    } else {
      return res.status(200).json({
        success: true,
        isNewUser: true,
        email: cleanEmail,
        message: 'Email verified. Please complete your registration.'
      });
    }
  } catch (error) {
    console.error('Error in verifyCustomerEmailOtp:', error);
    return res.status(500).json({ success: false, message: 'Server error during OTP verification: ' + error.message });
  }
}

module.exports = {
  verifyToken,
  login,
  register,
  getUser,
  updateUser,
  updateFcmToken,
  getAllUsers,
  sendCustomerEmailOtp,
  verifyCustomerEmailOtp
};