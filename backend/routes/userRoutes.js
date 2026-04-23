const express = require("express");
const router = express.Router();

const  { verifyToken } = require("../middleware/authMiddleware");
const { getMyProfile } = require("../controllers/userController");

router.get("/me", verifyToken, getMyProfile);

module.exports = router;