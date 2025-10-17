// utils/verifyUserJwtToken.js
const jwt = require("jsonwebtoken");
const User = require("../models/customUserModel");
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
    const { id, role } = decoded;

    let user = null;

    // ✅ Fetch from the correct table based on role
    switch (role) {
      case "user":
        user = await User.findByPk(id);
        break;

    //   case "provider":
    //     user = await Provider.findByPk(id);
    //     break;

    //   case "admin":
    //     user = await Admin.findByPk(id);
    //     break;

    //     case "manager":
    //     user = await Admin.findByPk(id);
    //     break;

      default:
        throw new Error("Unknown role in token");
    }

    if (!user) {
      throw new Error(`${role} with ID ${id} not found`);
    }

    // ✅ Return both user data and role
    return { user, role };
  } catch (error) {
    console.error("❌ JWT verification failed:", error.message);
    return null;
  }
}

module.exports = verifyUserJwtToken;
