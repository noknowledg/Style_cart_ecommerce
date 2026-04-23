const pool = require("../config/db");

/**
 * Get all products (for consumers/public browsing)
 */
exports.getAllProducts = async (req, res) => {
  try {
    const { category } = req.query;

    let query = `SELECT p.*, u.first_name, u.last_name 
                 FROM products p 
                 LEFT JOIN users u ON p.seller_id = u.id`;

    const params = [];

    if (category) {
      query += " WHERE p.category = ?";
      params.push(category);
    }

    query += " ORDER BY p.id DESC";

    const [products] = await pool.query(query, params);

    return res.json({ success: true, products });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error fetching products" });
  }
};

/**
 * Get single product details
 */
exports.getProductDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const [product] = await pool.query(
      `SELECT p.*, u.first_name, u.last_name, u.email 
       FROM products p 
       LEFT JOIN users u ON p.seller_id = u.id 
       WHERE p.id = ?`,
      [id]
    );

    if (product.length === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.json({ success: true, product: product[0] });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error fetching product" });
  }
};

/**
 * Get products by category
 */
exports.getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params;

    const allowedCategories = ["clothes", "shoes", "jewellery"];
    if (!allowedCategories.includes(category)) {
      return res.status(400).json({
        message: `Invalid category. Allowed: ${allowedCategories.join(", ")}`
      });
    }

    const [products] = await pool.query(
      `SELECT p.*, u.first_name, u.last_name 
       FROM products p 
       LEFT JOIN users u ON p.seller_id = u.id 
       WHERE p.category = ? 
       ORDER BY p.id DESC`,
      [category]
    );

    return res.json({ success: true, products });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error fetching products" });
  }
};

/**
 * Search products
 */
exports.searchProducts = async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
      return res.status(400).json({ message: "Search query is required" });
    }

    const searchTerm = `%${q}%`;

    const [products] = await pool.query(
      `SELECT p.*, u.first_name, u.last_name 
       FROM products p 
       LEFT JOIN users u ON p.seller_id = u.id 
       WHERE p.name LIKE ? OR p.description LIKE ? 
       ORDER BY p.id DESC`,
      [searchTerm, searchTerm]
    );

    return res.json({ success: true, products });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error searching products" });
  }
};
