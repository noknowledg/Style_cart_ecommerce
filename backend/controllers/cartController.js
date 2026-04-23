const pool = require("../config/db");

/**
 * Get user's cart
 */
exports.getCart = async (req, res) => {
  try {
    const userId = req.user.id;

    const [items] = await pool.query(
      `SELECT c.*, p.name, p.price, p.image
       FROM cart c
       JOIN products p ON c.product_id = p.id
       WHERE c.user_id = ?
       ORDER BY c.id DESC`,
      [userId]
    );

    // Calculate total
    let total = 0;
    items.forEach(item => {
      total += item.price * item.quantity;
    });

    return res.json({
      success: true,
      items,
      total
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error fetching cart" });
  }
};

/**
 * Add item to cart
 */
exports.addToCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { productId, quantity } = req.body;

    if (!productId || !quantity || quantity < 1) {
      return res.status(400).json({
        message: "productId and quantity (>= 1) are required"
      });
    }

    // Check if product exists
    const [product] = await pool.query(
      "SELECT * FROM products WHERE id = ?",
      [productId]
    );

    if (product.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Check if item already in cart
    const [existing] = await pool.query(
      "SELECT * FROM cart WHERE user_id = ? AND product_id = ?",
      [userId, productId]
    );

    if (existing.length > 0) {
      // Update quantity
      const newQuantity = existing[0].quantity + quantity;

      await pool.query(
        "UPDATE cart SET quantity = ? WHERE id = ?",
        [newQuantity, existing[0].id]
      );
    } else {
      // Add new item
      await pool.query(
        "INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)",
        [userId, productId, quantity]
      );
    }

    return res.json({ message: "Item added to cart" });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error adding to cart" });
  }
};

/**
 * Update cart item quantity
 */
exports.updateCartItem = async (req, res) => {
  try {
    const userId = req.user.id;
    const { cartId, quantity } = req.body;

    if (!cartId || !quantity) {
      return res.status(400).json({
        message: "cartId and quantity are required"
      });
    }

    if (quantity < 1) {
      return res.status(400).json({ message: "Quantity must be at least 1" });
    }

    // Verify cart item belongs to user
    const [item] = await pool.query(
      "SELECT * FROM cart WHERE id = ? AND user_id = ?",
      [cartId, userId]
    );

    if (item.length === 0) {
      return res.status(404).json({ message: "Cart item not found" });
    }

    // Update quantity
    await pool.query(
      "UPDATE cart SET quantity = ? WHERE id = ?",
      [quantity, cartId]
    );

    return res.json({ message: "Cart item updated" });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error updating cart item" });
  }
};

/**
 * Remove item from cart
 */
exports.removeFromCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const { cartId } = req.params;

    // Verify cart item belongs to user
    const [item] = await pool.query(
      "SELECT * FROM cart WHERE id = ? AND user_id = ?",
      [cartId, userId]
    );

    if (item.length === 0) {
      return res.status(404).json({ message: "Cart item not found" });
    }

    // Delete item
    await pool.query("DELETE FROM cart WHERE id = ?", [cartId]);

    return res.json({ message: "Item removed from cart" });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error removing from cart" });
  }
};

/**
 * Clear cart
 */
exports.clearCart = async (req, res) => {
  try {
    const userId = req.user.id;

    await pool.query("DELETE FROM cart WHERE user_id = ?", [userId]);

    return res.json({ message: "Cart cleared" });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error clearing cart" });
  }
};
