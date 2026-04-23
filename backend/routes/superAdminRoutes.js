const express = require("express");
const router = express.Router();

const { verifyToken } = require("../middleware/authMiddleware");
const { checkRole } = require("../middleware/roleMiddleware");
const {
  getSuperAdminProfile,
  getAllUsers,
  getAllRoles,
  updateUserRole,
  assignRoleToUser,
  removeRoleFromUser,
  createRole,
  removeUser
} = require("../controllers/superAdmincontroller");

// All routes protected by verifyToken and checkRole
router.get("/me", verifyToken, checkRole(["super_admin"]), getSuperAdminProfile);
router.get("/users", verifyToken, checkRole(["super_admin"]), getAllUsers);
router.get("/roles", verifyToken, checkRole(["super_admin"]), getAllRoles);

// Role management
router.post("/assign-role", verifyToken, checkRole(["super_admin"]), assignRoleToUser);
router.post("/remove-role", verifyToken, checkRole(["super_admin"]), removeRoleFromUser);
router.post("/create-role", verifyToken, checkRole(["super_admin"]), createRole);
router.post("/remove-user", verifyToken, checkRole(["super_admin"]), removeUser);

// Backward compatibility
router.post("/update-role", verifyToken, checkRole(["super_admin"]), updateUserRole);

module.exports = router;