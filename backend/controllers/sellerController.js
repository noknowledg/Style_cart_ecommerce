const pool = require("../config/db");
const path = require("path");
const fs = require("fs");
const AuditLogger = require("../utils/auditLogger");

/**
 * Create a product (seller only - creates with their seller_id)
 */
exports.createProduct = async (req, res) => {
  try {
    const sellerId = req.user.id; // From JWT token
    const { name, category, price, description } = req.body;

    if (!name || !category || !price) {
      return res.status(400).json({
        message: "name, category, and price are required"
      });
    }

    const allowedCategories = ["clothes", "shoes", "jewellery"];
    if (!allowedCategories.includes(category)) {
      return res.status(400).json({
        message: `Invalid category. Allowed: ${allowedCategories.join(", ")}`
      });
    }

    let imagePath = null;
    if (req.file) {
      imagePath = path.relative(path.join(__dirname, "../"), req.file.path);
    }

    const [result] = await pool.query(
      `INSERT INTO products (name, category, price, description, seller_id, image)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, category, price, description || null, sellerId, imagePath]
    );

    // Audit log product creation
    await AuditLogger.logProduct(req, 'CREATE_PRODUCT', result.insertId, `Product "${name}" created in category "${category}"`);

    return res.status(201).json({
      message: "Product created successfully",
      productId: result.insertId
    });

  } catch (error) {
    console.error(error);
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).json({ message: "Error creating product" });
  }
};

/**
 * Get all products for a seller
 */
exports.getSellerProducts = async (req, res) => {
  try {
    const sellerId = req.user.id;

    const [products] = await pool.query(
      `SELECT * FROM products WHERE seller_id = ? ORDER BY id DESC`,
      [sellerId]
    );

    return res.json({ success: true, products });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error fetching products" });
  }
};

/**
 * Update seller's own product
 */
exports.updateProduct = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const { id } = req.params;
    const { name, category, price, description } = req.body;

    if (!id || !name || !category || !price) {
      return res.status(400).json({
        message: "id, name, category, and price are required"
      });
    }

    // Check if product belongs to seller
    const [product] = await pool.query(
      "SELECT * FROM products WHERE id = ? AND seller_id = ?",
      [id, sellerId]
    );

    if (product.length === 0) {
      return res.status(403).json({
        message: "You can only update your own products"
      });
    }

    let imagePath = product[0].image;

    // If new image provided
    if (req.file) {
      // Delete old image
      if (product[0].image) {
        const oldImagePath = path.join(__dirname, "../", product[0].image);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
      imagePath = path.relative(path.join(__dirname, "../"), req.file.path);
    }

    await pool.query(
      `UPDATE products
       SET name = ?, category = ?, price = ?, description = ?, image = ?
       WHERE id = ? AND seller_id = ?`,
      [name, category, price, description || null, imagePath, id, sellerId]
    );

    // Audit log product update
    await AuditLogger.logProduct(req, 'UPDATE_PRODUCT', id, `Product updated: ${name}`);

    return res.json({ message: "Product updated successfully" });

  } catch (error) {
    console.error(error);
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    return res.status(500).json({ message: "Error updating product" });
  }
};

/**
 * Delete seller's own product
 */
exports.deleteProduct = async (req, res) => {
  try {
    const sellerId = req.user.id;
    const { id } = req.params;

    const [product] = await pool.query(
      "SELECT * FROM products WHERE id = ? AND seller_id = ?",
      [id, sellerId]
    );

    if (product.length === 0) {
      return res.status(403).json({
        message: "You can only delete your own products"
      });
    }

    // Delete image
    if (product[0].image) {
      const imagePath = path.join(__dirname, "../", product[0].image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    // Delete from order_items first
    await pool.query("DELETE FROM order_items WHERE product_id = ?", [id]);

    // Delete from cart
    await pool.query("DELETE FROM cart WHERE product_id = ?", [id]);

    // Delete product
    await pool.query("DELETE FROM products WHERE id = ?", [id]);

    // Audit log product deletion
    await AuditLogger.logProduct(req, 'DELETE_PRODUCT', id, `Product deleted by seller`);

    return res.json({ message: "Product deleted successfully" });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error deleting product" });
  }
};

/**
 * Get seller dashboard stats
 */
exports.getDashboardStats = async (req, res) => {
  try {
    const sellerId = req.user.id;

    // Total products
    const [[{ totalProducts }]] = await pool.query(
      "SELECT COUNT(*) as totalProducts FROM products WHERE seller_id = ?",
      [sellerId]
    );

    // Total sales
    const [[{ totalSales }]] = await pool.query(
      `SELECT COALESCE(SUM(oi.quantity), 0) as totalSales 
       FROM order_items oi 
       JOIN products p ON oi.product_id = p.id 
       WHERE p.seller_id = ?`,
      [sellerId]
    );

    // Total revenue
    const [[{ totalRevenue }]] = await pool.query(
      `SELECT COALESCE(SUM(oi.price * oi.quantity), 0) as totalRevenue 
       FROM order_items oi 
       JOIN products p ON oi.product_id = p.id 
       WHERE p.seller_id = ?`,
      [sellerId]
    );

    return res.json({
      success: true,
      stats: {
        totalProducts,
        totalSales,
        totalRevenue
      }
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error fetching stats" });
  }
};
