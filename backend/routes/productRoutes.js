const express = require("express");
const router = express.Router();

const {
  getAllProducts,
  getProductDetails,
  getProductsByCategory,
  searchProducts
} = require("../controllers/productController");

// Public routes (no authentication required)
router.get("/", getAllProducts);
router.get("/search", searchProducts);
router.get("/:id", getProductDetails);
router.get("/category/:category", getProductsByCategory);

module.exports = router;
