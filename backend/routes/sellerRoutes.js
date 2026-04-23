const express = require("express");
const router = express.Router();

const { verifyToken } = require("../middleware/authMiddleware");
const { checkRole } = require("../middleware/roleMiddleware");
const upload = require("../middleware/uploadMiddleware");
const {
  createProduct,
  getSellerProducts,
  updateProduct,
  deleteProduct,
  getDashboardStats
} = require("../controllers/sellerController");

// All routes protected by verifyToken and checkRole
router.get("/stats", verifyToken, checkRole(["seller"]), getDashboardStats);
router.get("/products", verifyToken, checkRole(["seller"]), getSellerProducts);
router.post("/products", verifyToken, checkRole(["seller"]), upload.single("image"), createProduct);
router.put("/products/:id", verifyToken, checkRole(["seller"]), upload.single("image"), updateProduct);
router.delete("/products/:id", verifyToken, checkRole(["seller"]), deleteProduct);

module.exports = router;
