// controllers/authController.js
const User = require('../models/customUserModel');
const { verify, sign } = require('jsonwebtoken');

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

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      token: token,
      user: newUser
    });

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

module.exports = { verifyToken, login, register, getUser };