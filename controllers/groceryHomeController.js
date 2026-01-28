const GroceryCategory = require('../models/groceryCategory');
const Banner = require('../models/banners');
const GroceryCartItem = require('../models/groceryCartItem');
const GroceryItem = require('../models/groceryItem');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');

exports.getGroceryHomeData = async (req, res) => {
  try {
    // 1. Fetch public data
    const [categories, banners, hotItems, under100Items] = await Promise.all([
      GroceryCategory.findAll({
        where: { is_active: true },
        order: [['createdAt', 'ASC']]
      }),
      Banner.findAll({
        where: {
          is_active: true,
          type: 'corousel'
        }
      }),
      GroceryItem.findAll({
        where: { is_featured: true, is_active: true },
        limit: 6
      }),
      GroceryItem.findAll({
        where: { price: { [Op.lt]: 100 }, is_active: true },
        limit: 6
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

        const cartItems = await GroceryCartItem.findAll({
          where: { user_id: userId },
          attributes: ['product_id', 'quantity'],
          order: [['createdAt', 'DESC']]
        });
        cart = cartItems.map(item => ({ [item.product_id]: item.quantity }));
      } catch (error) {
        // Token is invalid or expired, so we'll just return an empty cart.
        // This is a graceful failure, as the cart is optional here.
        console.log('Grocery home: Could not verify token. Returning empty cart.');
      }
    }

    // Helper to format products
    const formatProduct = (item) => {
      const originalPrice = parseFloat(item.price);
      const discount = parseFloat(item.discount) || 0;
      const sellingPrice = originalPrice - discount;
      const discountPercent = originalPrice > 0 ? Math.round((discount / originalPrice) * 100) : 0;

      return {
        id: item.id,
        name: item.name,
        weight: `${parseFloat(item.unit_value)} ${item.unit}`,
        price: sellingPrice,
        originalPrice: originalPrice,
        discount: discountPercent,
        time: '15 mins',
        img: item.image_url
      };
    };

    res.status(200).json({
      success: true,
      data: {
        categories,
        banners,
        cart,
        productSections: [
          {
            title: 'Hot Items',
            subtitle: 'Trending now',
            products: hotItems.map(formatProduct)
          },
          {
            title: 'Under ₹100',
            subtitle: 'Budget friendly picks',
            products: under100Items.map(formatProduct)
          }
        ]
      }
    });
  } catch (error) {
    console.error('Error fetching grocery home data:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};