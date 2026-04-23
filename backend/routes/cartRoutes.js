const express = require("express");
const router = express.Router();

const { verifyToken } = require("../middleware/authMiddleware");
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
} = require("../controllers/cartController");

// All routes protected by verifyToken
router.get("/", verifyToken, getCart);
router.post("/add", verifyToken, addToCart);
router.put("/update", verifyToken, updateCartItem);
router.delete("/remove/:cartId", verifyToken, removeFromCart);
router.delete("/clear", verifyToken, clearCart);

module.exports = router;
