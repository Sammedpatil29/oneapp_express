const GroceryCartItem = require('../models/groceryCartItem');
const GroceryItem = require('../models/groceryItem');

// Add or Update item in cart
// Payload: { productId: 2, quantity: 1 }
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
      attributes: ['product_id', 'quantity'],
      order: [['createdAt', 'DESC']]
    });

    const formattedCart = cartItems.map(item => ({ [item.product_id]: item.quantity }));

    return res.status(200).json({ success: true, message: 'Cart updated', data: formattedCart });

  } catch (error) {
    console.error('Add to Cart Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get User's Cart
exports.getCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const cartItems = await GroceryCartItem.findAll({
      where: { user_id: userId },
      attributes: ['product_id', 'quantity'],
      order: [['createdAt', 'DESC']]
    });

    const formattedCart = cartItems.map(item => ({ [item.product_id]: item.quantity }));
    res.status(200).json({ success: true, data: formattedCart });
  } catch (error) {
    console.error('Get Cart Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Remove specific item by Product ID
exports.removeFromCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId } = req.params;
    
    const deleted = await GroceryCartItem.destroy({ 
      where: { user_id: userId, product_id: productId } 
    });

    if (deleted) {
      return res.status(200).json({ success: true, message: 'Item removed' });
    }
    return res.status(404).json({ success: false, message: 'Item not found in cart' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};