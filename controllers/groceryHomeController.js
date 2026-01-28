const GroceryCategory = require('../models/groceryCategory');
const Banner = require('../models/banners');
const GroceryCartItem = require('../models/groceryCartItem');
const GroceryItem = require('../models/groceryItem');
const jwt = require('jsonwebtoken');

exports.getGroceryHomeData = async (req, res) => {
  try {
    // 1. Fetch public data
    const [categories, banners] = await Promise.all([
      GroceryCategory.findAll({
        where: { is_active: true },
        order: [['createdAt', 'ASC']]
      }),
      Banner.findAll({
        where: {
          is_active: true,
          type: 'corousel'
        }
      })
    ]);

    // 2. Fetch user-specific cart data if a valid token is provided
    let cart = [];
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_key_123');
        const userId = decoded.id;

        cart = await GroceryCartItem.findAll({
          where: { user_id: userId },
          include: [{ model: GroceryItem }],
          order: [['createdAt', 'DESC']]
        });
      } catch (error) {
        // Token is invalid or expired, so we'll just return an empty cart.
        // This is a graceful failure, as the cart is optional here.
        console.log('Grocery home: Could not verify token. Returning empty cart.');
      }
    }

    res.status(200).json({
      success: true,
      data: {
        categories,
        banners,
        cart,
        other: [] // Sending empty array as requested
      }
    });
  } catch (error) {
    console.error('Error fetching grocery home data:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};