// utils/verifyUserJwtToken.js
const jwt = require("jsonwebtoken");
const User = require("../models/customUserModel");
const AdminUser = require("../models/adminUser");
const Rider = require("../models/ridersModel");
// const Provider = require("../models/providerModel");
// const Admin = require("../models/adminModel");

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "django-insecure-0v(fl_v5t97hk)0mx&qq!b80ua)@-a@2e(5v4nac!$3l(m@9#(";

/**
 * Verify JWT token and return user/admin/provider instance based on role
 * @param {string} token - JWT token string
 * @returns {Object|null} Verified user object or null if invalid
 */
async function verifyUserJwtToken(token) {
  try {
    if (!token) {
      throw new Error("Token is missing");
    }

    // ✅ Decode and verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    const { user_id, role } = decoded;
    
    

    let user = null;

    // ✅ Fetch from the correct table based on role
    switch (role) {
      case "user":
        user = await User.findByPk(user_id);
        break;

      case "rider":
        user = await Rider.findByPk(user_id);
        break;

      case "admin":
        user = await AdminUser.findByPk(decoded.Admin_user_id);
       
        break;

        case "manager":
        user = await AdminUser.findByPk(decoded.Admin_user_id);
        break;

      default:
        throw new Error("Unknown role in token");
    }

    if (!user) {
      throw new Error(`${role} with ID ${user_id} not found`);
    }

    // ✅ Return both user data and role
    
    return { user, role };
  } catch (error) {
    console.error("❌ JWT verification failed:", error.message);
    return null;
  }
}

async function createRiderJWTtoken(payload) {
  const { phone, password } = payload;

  if (!phone || !password) {
    throw new Error('Phone and password are required');
  }

  const user = await Rider.findOne({
    where: { contact: phone }
  });

  if (!user) {
    throw new Error('User not found');
  }

  // In real apps, use bcrypt for hashed password comparison
  const isPasswordValid = user.password === password;

  if (!isPasswordValid) {
    throw new Error('Invalid password');
  }

  // Only include safe fields in token payload
  const tokenPayload = {
    user_id: user.id,
    role: 'rider'
  };

  const token = jwt.sign(tokenPayload, JWT_SECRET, {
    expiresIn: '7d'
  });

  const tokenData = {
    token: token,
    riderId: user.id
  }


  return tokenData;
}

module.exports = {verifyUserJwtToken, createRiderJWTtoken};
