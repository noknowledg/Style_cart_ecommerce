const express = require("express");
const router = express.Router();

const { verifyToken } = require("../middleware/authMiddleware");
const { checkRole } = require("../middleware/roleMiddleware");
const {
  placeOrder,
  getUserOrders,
  getOrderDetails,
  getAllOrders
} = require("../controllers/orderController");

// User endpoints
router.post("/place", verifyToken, checkRole(["consumer"]), placeOrder);
router.get("/my-orders", verifyToken, checkRole(["consumer"]), getUserOrders);
router.get("/:orderId", verifyToken, checkRole(["consumer"]), getOrderDetails);

// Admin endpoint
router.get("/", verifyToken, checkRole(["admin"]), getAllOrders);

module.exports = router;
