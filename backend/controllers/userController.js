const pool = require("../config/db");
console.log("➡️ /me API HIT");
exports.getMyProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user basic info
    const [userRows] = await pool.query(
      `SELECT id, first_name, last_name, email, phone, address, created_at
       FROM users WHERE id = ?`,
      [userId]
    );

    if (userRows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get roles
    const [roleRows] = await pool.query(
      `SELECT r.role_name
       FROM user_roles ur
       JOIN roles r ON ur.role_id = r.id
       WHERE ur.user_id = ?`,
      [userId]
    );

    const roles = roleRows.map(r => r.role_name);

    res.json({
      user: userRows[0],
      roles
    });
console.log("USER FROM TOKEN:", req.user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};