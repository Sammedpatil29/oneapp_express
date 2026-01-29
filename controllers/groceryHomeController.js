const GroceryCategory = require('../models/groceryCategory');
const Banner = require('../models/banners');
const GroceryCartItem = require('../models/groceryCartItem');
const GroceryItem = require('../models/groceryItem');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const sequelize = require('../db');

exports.getGroceryHomeData = async (req, res) => {
  try {
    // Get categories with at least one item
    const distinctCategories = await GroceryItem.findAll({
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('category')), 'category']],
      where: { is_active: true },
      raw: true
    });
    const validCategoryNames = distinctCategories.map(item => item.category).filter(Boolean);

    // 1. Fetch public data
    const [categories, banners, hotItems, under100Items] = await Promise.all([
      GroceryCategory.findAll({
        where: { is_active: true, name: { [Op.in]: validCategoryNames } },
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
    let itemCount = 0;
    let totalPrice = 0;
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_key_123');
        const userId = decoded.id;

        const cartItems = await GroceryCartItem.findAll({
          where: { user_id: userId },
          include: [{
            model: GroceryItem,
            attributes: ['price', 'discount']
          }],
          attributes: ['product_id', 'quantity'],
          order: [['createdAt', 'DESC']]
        });
        cart = cartItems.map(item => {
          const qty = item.quantity;
          itemCount += qty;
          if (item.GroceryItem) {
            const price = parseFloat(item.GroceryItem.price) || 0;
            const discount = parseFloat(item.GroceryItem.discount) || 0;
            const sellingPrice = Math.max(0, price - discount);
            totalPrice += sellingPrice * qty;
          }
          return { [item.product_id]: qty };
        });
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
        stock: item.stock,
        img: item.image_url
      };
    };

    res.status(200).json({
      success: true,
      data: {
        categories,
        banners,
        cart,
        itemCount,
        totalPrice: totalPrice.toFixed(2),
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

exports.getCategoryPageData = async (req, res) => {
  try {
    const { selectedCategory } = req.body;

    // Get categories with at least one item
    const distinctCategories = await GroceryItem.findAll({
      attributes: [[sequelize.fn('DISTINCT', sequelize.col('category')), 'category']],
      where: { is_active: true },
      raw: true
    });
    const validCategoryNames = distinctCategories.map(item => item.category).filter(Boolean);

    // 1. Fetch Categories and Products for the selected route
    const [categories, products] = await Promise.all([
      GroceryCategory.findAll({
        where: { is_active: true, name: { [Op.in]: validCategoryNames } },
        order: [['createdAt', 'ASC']]
      }),
      GroceryItem.findAll({
        where: { category: selectedCategory, is_active: true }
      })
    ]);

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
        stock: item.stock,
        img: item.image_url
      };
    };

    res.status(200).json({
      success: true,
      data: {
        categories,
        products: products.map(formatProduct)
      }
    });
  } catch (error) {
    console.error('Error fetching category page data:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getProductsByCategory = async (req, res) => {
  try {
    const { selectedCategory } = req.body;

    // 1. Fetch Products for the selected category
    const products = await GroceryItem.findAll({
      where: { category: selectedCategory, is_active: true }
    });

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
        stock: item.stock,
        img: item.image_url
      };
    };

    res.status(200).json({
      success: true,
      data: {
        products: products.map(formatProduct)
      }
    });
  } catch (error) {
    console.error('Error fetching products by category:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getDynamicSectionData = async (req, res) => {
  try {
    const { term } = req.body;
    let banner = null;
    let products = [];
    let title = '';

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
        stock: item.stock,
        img: item.image_url
      };
    };

    if (term === 'under_100') {
      title = 'Under ₹100 Store';
      banner = await Banner.findOne({ where: { type: 'under_100', is_active: true } });
      products = await GroceryItem.findAll({
        where: { price: { [Op.lt]: 100 }, is_active: true },
        limit: 20
      });
    } else if (term === 'trending') {
      title = 'Trending Now';
      banner = await Banner.findOne({ where: { type: 'trending', is_active: true } });
      products = await GroceryItem.findAll({
        where: { is_featured: true, is_active: true },
        limit: 20
      });
    } else if (term === 'new_arrivals') {
      title = 'Fresh Arrivals';
      banner = await Banner.findOne({ where: { type: 'new_arrivals', is_active: true } });
      products = await GroceryItem.findAll({
        where: { is_active: true },
        order: [['createdAt', 'DESC']],
        limit: 20
      });
    } else {
      // Default empty response for unknown terms
      title = 'Section';
    }

    res.status(200).json({
      success: true,
      data: {
        title,
        banner,
        products: products.map(formatProduct)
      }
    });
  } catch (error) {
    console.error('Error fetching dynamic section data:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};