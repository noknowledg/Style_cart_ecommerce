const express = require("express");
const router = express.Router();

const { verifyToken } = require("../middleware/authMiddleware");
const { checkRole } = require("../middleware/roleMiddleware");
const {
  getDashboardStats,
  getAllProducts,
  updateProduct,
  deleteProduct
} = require("../controllers/adminController");

// All routes protected by verifyToken and checkRole
router.get("/stats", verifyToken, checkRole(["admin"]), getDashboardStats);
router.get("/products", verifyToken, checkRole(["admin"]), getAllProducts);
router.put("/products/:id", verifyToken, checkRole(["admin"]), updateProduct);
router.delete("/products/:id", verifyToken, checkRole(["admin"]), deleteProduct);

module.exports = router;
