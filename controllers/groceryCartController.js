const GroceryCartItem = require('../models/groceryCartItem');
const GroceryItem = require('../models/groceryItem');
const { Op } = require('sequelize');
const sequelize = require('../db');

/**
 * Add or Update item in cart
 * POST /api/grocery/cart
 * Body: { productId: Integer, quantity: Integer }
 */
exports.updateCartItem = async (req, res) => {
  try {
    const userId = req.user.id; // Extracted from token by middleware
    const { productId, quantity } = req.body;

    if (!productId || quantity === undefined) {
      return res.status(400).json({ success: false, message: 'Product ID and quantity are required' });
    }

    const qty = parseInt(quantity);

    // Check if item exists in cart
    let cartItem = await GroceryCartItem.findOne({
      where: { user_id: userId, product_id: productId }
    });

    if (qty <= 0) {
      if (cartItem) {
        await cartItem.destroy();
      }
    } else {
      // Fetch the grocery item to validate against
      const groceryItem = await GroceryItem.findByPk(productId);
      if (!groceryItem) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }

      // Validate stock, min, and max quantity
      if (qty > groceryItem.stock) {
        return res.status(400).json({ success: false, message: `Only ${groceryItem.stock} items available in stock.` });
      }
      if (qty < groceryItem.min_quantity) {
        return res.status(400).json({ success: false, message: `Minimum order quantity is ${groceryItem.min_quantity}.` });
      }
      if (groceryItem.max_quantity && qty > groceryItem.max_quantity) {
        return res.status(400).json({ success: false, message: `Maximum order quantity is ${groceryItem.max_quantity}.` });
      }

      // If validation passes, update or create
      if (cartItem) {
        cartItem.quantity = qty;
        await cartItem.save();
      } else {
        await GroceryCartItem.create({
          user_id: userId,
          product_id: productId,
          quantity: qty
        });
      }
    }

    // Fetch the updated cart list to return
    const cartItems = await GroceryCartItem.findAll({
      where: { user_id: userId },
      include: [{
        model: GroceryItem,
        attributes: ['price', 'discount']
      }],
      attributes: ['product_id', 'quantity'],
      order: [['createdAt', 'DESC']]
    });

    let itemCount = 0;
    let totalPrice = 0;

    const formattedCart = cartItems.map(item => {
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

    return res.status(200).json({ success: true, message: 'Cart updated', data: formattedCart, itemCount, totalPrice: totalPrice.toFixed(2) });

  } catch (error) {
    console.error('Add to Cart Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get Cart Data with Calculations & Suggestions
 * GET /api/grocery/cart
 * Query: ?coupon=CODE (optional)
 * Response: { items, billDetails, suggestions }
 */
exports.getCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { coupon } = req.query;

    // 1. Fetch Cart Items
    const cartItems = await GroceryCartItem.findAll({
      where: { user_id: userId },
      include: [{
        model: GroceryItem,
        attributes: ['id', 'name', 'price', 'discount', 'unit', 'unit_value', 'image_url', 'stock', 'category', 'tags']
      }]
    });

    let totalMRP = 0;
    let totalSellingPrice = 0;
    let itemCount = 0;
    const productIds = [];
    const categories = new Set();

    const items = cartItems.map(item => {
      const product = item.GroceryItem;
      if (!product) return null;

      const qty = item.quantity;
      const mrp = parseFloat(product.price);
      const discount = parseFloat(product.discount) || 0;
      const sellingPrice = Math.max(0, mrp - discount);
      const isOutOfStock = product.stock <= 0;

      if (!isOutOfStock) {
        totalMRP += mrp * qty;
        totalSellingPrice += sellingPrice * qty;
        itemCount += qty;
      }

      productIds.push(product.id);
      if (product.category) categories.add(product.category);

      return {
        cartItemId: item.id,
        productId: product.id,
        name: product.name,
        image: product.image_url,
        weight: `${parseFloat(product.unit_value)} ${product.unit}`,
        mrp: mrp,
        sellingPrice: sellingPrice,
        quantity: qty,
        stock: product.stock,
        total: isOutOfStock ? 0 : sellingPrice * qty,
        isOutOfStock
      };
    }).filter(Boolean);

    // 2. Calculate Charges
    const handlingCharge = 3.00;
    const freeDeliveryThreshold = 199;
    const deliveryFee = totalSellingPrice >= freeDeliveryThreshold ? 0 : 30.00;
    
    // Late Night Charge (10 PM - 6 AM)
    const hour = new Date().getHours();
    const isLateNight = hour >= 22 || hour < 6;
    const lateNightCharge = isLateNight ? 15.00 : 0;
    
    const surgeCharge = 0; // Placeholder
    
    // Coupon Logic
    let couponDiscount = 0;
    let couponStatus = 'none'; // none, applied, invalid, not_applicable
    let couponMessage = '';

    if (coupon) {
      const code = coupon.toUpperCase();
      // Mock Coupons (Replace with DB lookup: await Coupon.findOne({ where: { code } }))
      const coupons = {
        'WELCOME50': { type: 'flat', value: 50, minOrder: 299 },
        'SAVE10': { type: 'percent', value: 10, max: 100, minOrder: 500 }
      };

      const promo = coupons[code];
      if (promo) {
        if (totalSellingPrice >= promo.minOrder) {
          if (promo.type === 'flat') couponDiscount = promo.value;
          if (promo.type === 'percent') couponDiscount = Math.min((totalSellingPrice * promo.value) / 100, promo.max);
          couponStatus = 'applied';
          couponMessage = 'Coupon applied successfully';
        } else {
          couponStatus = 'not_applicable';
          couponMessage = `Add items worth ₹${(promo.minOrder - totalSellingPrice).toFixed(2)} more to apply this coupon`;
        }
      } else {
        couponStatus = 'invalid';
        couponMessage = 'Invalid Coupon Code';
      }
    }

    const toPay = Math.max(0, totalSellingPrice + handlingCharge + deliveryFee + lateNightCharge + surgeCharge - couponDiscount);
    const totalSavings = (totalMRP - totalSellingPrice) + couponDiscount + (deliveryFee === 0 && totalSellingPrice > 0 ? 40 : 0);

    // 3. Product Suggestions
    let suggestions = [];
    const whereClause = {
      is_active: true,
      id: { [Op.notIn]: productIds }
    };

    if (categories.size > 0) {
      whereClause.category = { [Op.in]: Array.from(categories) };
    } else {
      whereClause.is_featured = true;
    }

    suggestions = await GroceryItem.findAll({
      where: whereClause,
      limit: 10,
      order: sequelize.random()
    });

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
        img: item.image_url,
        stock: item.stock
      };
    };

    res.status(200).json({
      success: true,
      data: {
        items,
        billDetails: {
          mrpTotal: totalMRP.toFixed(2),
          itemTotal: totalSellingPrice.toFixed(2),
          handlingCharge: handlingCharge.toFixed(2),
          deliveryFee: deliveryFee.toFixed(2),
          lateNightCharge: lateNightCharge.toFixed(2),
          surgeCharge: surgeCharge.toFixed(2),
          couponDiscount: couponDiscount.toFixed(2),
          couponStatus,
          couponMessage,
          toPay: toPay.toFixed(2),
          totalSavings: totalSavings.toFixed(2),
          deliveryMessage: deliveryFee === 0 
            ? 'Free Delivery Applied' 
            : `Add items worth ₹${(freeDeliveryThreshold - totalSellingPrice).toFixed(2)} more for free delivery`
        },
        suggestions: suggestions.map(formatProduct)
      }
    });

  } catch (error) {
    console.error('Get Cart Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Remove Item from Cart
 * DELETE /api/grocery/cart/:productId
 */
exports.removeFromCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;

    const deleted = await GroceryCartItem.destroy({
      where: { user_id: userId, product_id: productId }
    });

    if (deleted) {
      return res.status(200).json({ success: true, message: 'Item removed from cart' });
    }
    return res.status(404).json({ success: false, message: 'Item not found in cart' });
  } catch (error) {
    console.error('Remove Cart Item Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
