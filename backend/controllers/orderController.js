const pool = require("../config/db");

/**
 * Place an order from cart
 */
exports.placeOrder = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get cart items
    const [cartItems] = await pool.query(
      `SELECT c.*, p.price, p.name
       FROM cart c
       JOIN products p ON c.product_id = p.id
       WHERE c.user_id = ?`,
      [userId]
    );

    if (cartItems.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    // Calculate total amount
    let totalAmount = 0;
    cartItems.forEach(item => {
      totalAmount += item.price * item.quantity;
    });

    // Insert order
    const [[result]] = await pool.query(
      `INSERT INTO orders (user_id, total_amount, created_at)
       VALUES (?, ?, NOW())`,
      [userId, totalAmount]
    );

    const orderId = result.insertId;

    // Insert order items
    for (const item of cartItems) {
      await pool.query(
        `INSERT INTO order_items (order_id, product_id, quantity, price)
         VALUES (?, ?, ?, ?)`,
        [orderId, item.product_id, item.quantity, item.price]
      );
    }

    // Clear cart
    await pool.query("DELETE FROM cart WHERE user_id = ?", [userId]);

    return res.status(201).json({
      message: "Order placed successfully",
      orderId,
      totalAmount
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error placing order" });
  }
};

/**
 * Get user's orders
 */
exports.getUserOrders = async (req, res) => {
  try {
    const userId = req.user.id;

    const [orders] = await pool.query(
      `SELECT o.*, 
              GROUP_CONCAT(
                JSON_OBJECT(
                  'product_id', oi.product_id,
                  'product_name', p.name,
                  'quantity', oi.quantity,
                  'price', oi.price
                )
              ) as items
       FROM orders o
       LEFT JOIN order_items oi ON o.id = oi.order_id
       LEFT JOIN products p ON oi.product_id = p.id
       WHERE o.user_id = ?
       GROUP BY o.id
       ORDER BY o.created_at DESC`,
      [userId]
    );

    const formattedOrders = orders.map(order => ({
      ...order,
      items: order.items ? JSON.parse(`[${order.items}]`) : []
    }));

    return res.json({
      success: true,
      orders: formattedOrders
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error fetching orders" });
  }
};

/**
 * Get order details
 */
exports.getOrderDetails = async (req, res) => {
  try {
    const userId = req.user.id;
    const { orderId } = req.params;

    const [orders] = await pool.query(
      `SELECT o.* FROM orders o WHERE o.id = ? AND o.user_id = ?`,
      [orderId, userId]
    );

    if (orders.length === 0) {
      return res.status(404).json({ message: "Order not found" });
    }

    const [items] = await pool.query(
      `SELECT oi.*, p.name, p.image FROM order_items oi
       JOIN products p ON oi.product_id = p.id
       WHERE oi.order_id = ?`,
      [orderId]
    );

    return res.json({
      success: true,
      order: orders[0],
      items
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error fetching order details" });
  }
};

/**
 * Get all orders (admin only)
 */
exports.getAllOrders = async (req, res) => {
  try {
    const [orders] = await pool.query(
      `SELECT o.*, u.first_name, u.last_name, u.email
       FROM orders o
       JOIN users u ON o.user_id = u.id
       ORDER BY o.created_at DESC`
    );

    return res.json({
      success: true,
      orders
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error fetching orders" });
  }
};
