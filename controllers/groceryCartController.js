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
      if (cartItem) await cartItem.destroy();
      return res.status(200).json({ success: true, message: 'Item removed from cart', data: null });
    }

    if (cartItem) {
      cartItem.quantity = qty;
      await cartItem.save();
    } else {
      cartItem = await GroceryCartItem.create({
        user_id: userId,
        product_id: productId,
        quantity: qty
      });
    }

    // Fetch the updated item with product details to return
    const updatedItem = await GroceryCartItem.findOne({
      where: { id: cartItem.id },
      include: [{ model: GroceryItem }]
    });

    return res.status(200).json({ success: true, message: 'Cart updated', data: updatedItem });

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
      include: [{ model: GroceryItem }],
      order: [['createdAt', 'DESC']]
    });
    res.status(200).json({ success: true, data: cartItems });
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