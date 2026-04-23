const pool = require("../config/db");

/**
 * Get dashboard stats for admin
 */
exports.getDashboardStats = async (req, res) => {
  try {
    // Total users
    const [[{ totalUsers }]] = await pool.query(
      "SELECT COUNT(*) as totalUsers FROM users"
    );

    // Total products
    const [[{ totalProducts }]] = await pool.query(
      "SELECT COUNT(*) as totalProducts FROM products"
    );

    // Total orders
    const [[{ totalOrders }]] = await pool.query(
      "SELECT COUNT(*) as totalOrders FROM orders"
    );

    // Total revenue
    const [[{ totalRevenue }]] = await pool.query(
      "SELECT COALESCE(SUM(total_amount), 0) as totalRevenue FROM orders"
    );

    return res.json({
      success: true,
      stats: {
        totalUsers,
        totalProducts,
        totalOrders,
        totalRevenue
      }
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error fetching stats" });
  }
};

/**
 * Get all products
 */
exports.getAllProducts = async (req, res) => {
  try {
    const [products] = await pool.query(
      `SELECT p.*, u.first_name, u.last_name 
       FROM products p 
       LEFT JOIN users u ON p.seller_id = u.id 
       ORDER BY p.id DESC`
    );

    return res.json({ success: true, products });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error fetching products" });
  }
};

/**
 * Update product
 */
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, price, description } = req.body;

    if (!id || !name || !category || !price) {
      return res.status(400).json({
        message: "id, name, category, and price are required"
      });
    }

    const [existing] = await pool.query(
      "SELECT id FROM products WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    await pool.query(
      `UPDATE products 
       SET name = ?, category = ?, price = ?, description = ?
       WHERE id = ?`,
      [name, category, price, description || null, id]
    );

    return res.json({ message: "Product updated successfully" });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error updating product" });
  }
};

/**
 * Delete product
 */
exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const [existing] = await pool.query(
      "SELECT image FROM products WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Delete associated image if it exists
    if (existing[0].image) {
      const path = require("path");
      const fs = require("fs");
      const imagePath = path.join(__dirname, "../uploads", existing[0].image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // Delete from orders first (foreign key constraint)
    await pool.query("DELETE FROM order_items WHERE product_id = ?", [id]);

    // Delete from cart
    await pool.query("DELETE FROM cart WHERE product_id = ?", [id]);

    // Delete product
    await pool.query("DELETE FROM products WHERE id = ?", [id]);

    return res.json({ message: "Product deleted successfully" });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error deleting product" });
  }
};
