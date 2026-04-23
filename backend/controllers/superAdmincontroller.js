const db = require("../config/db"); // mysql2 pool/connection
const AuditLogger = require("../utils/auditLogger");

exports.getSuperAdminProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await db.query(
      `SELECT id, first_name, last_name, email
       FROM users
       WHERE id = ?`,
      [userId]
    );

    return res.json({
      success: true,
      user: rows[0]
    });

  } catch (error) {
    return res.status(500).json({ message: "Error fetching profile" });
  }
};



exports.getAllUsers = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        GROUP_CONCAT(r.role_name) AS roles
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE u.id NOT IN (
        SELECT user_id 
        FROM user_roles 
        WHERE role_id = (SELECT id FROM roles WHERE role_name = 'super_admin')
      )
      GROUP BY u.id
      ORDER BY u.id DESC
    `);

    const users = rows.map(u => ({
      ...u,
      roles: u.roles ? u.roles.split(",") : []
    }));

    return res.json({ success: true, users });

  } catch (error) {
    return res.status(500).json({ message: "Error fetching users" });
  }
};

exports.getAllRoles = async (req, res) => {
  try {
    const [roles] = await db.query(`
      SELECT * FROM roles 
      WHERE role_name != 'super_admin'
    `);

    return res.json({ success: true, roles });

  } catch (error) {
    return res.status(500).json({ message: "Error fetching roles" });
  }
};

/**
 * Assign a role to a user (supports multiple roles)
 */
exports.assignRoleToUser = async (req, res) => {
  try {
    const { userId, roleId } = req.body;

    if (!userId || !roleId) {
      return res.status(400).json({ message: "userId and roleId are required" });
    }

    // Check if target user is super_admin
    const [superAdminCheck] = await db.query(`
      SELECT ur.user_id
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = ? AND r.role_name = 'super_admin'
    `, [userId]);

    if (superAdminCheck.length > 0) {
      return res.status(403).json({
        message: "Cannot modify super admin roles"
      });
    }

    // Check if user already has this role
    const [existingRole] = await db.query(
      "SELECT * FROM user_roles WHERE user_id = ? AND role_id = ?",
      [userId, roleId]
    );

    if (existingRole.length > 0) {
      return res.status(400).json({
        message: "User already has this role"
      });
    }

    // Get role name for logging
    const [roleData] = await db.query(
      "SELECT role_name FROM roles WHERE id = ?",
      [roleId]
    );

    const roleName = roleData[0]?.role_name || 'unknown';

    // Assign the role (add without removing existing roles)
    await db.query(
      "INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)",
      [userId, roleId]
    );

    // Log the role assignment
    await AuditLogger.logRoleUpdate(req, 'ROLE_ASSIGN', userId, {
      assigned_role: roleName,
      performed_by: req.user.id
    });

    return res.json({ message: "Role assigned successfully" });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error assigning role" });
  }
};

/**
 * Remove a role from a user
 */
exports.removeRoleFromUser = async (req, res) => {
  try {
    const { userId, roleId } = req.body;

    if (!userId || !roleId) {
      return res.status(400).json({ message: "userId and roleId are required" });
    }

    // Check if target user is super_admin
    const [superAdminCheck] = await db.query(`
      SELECT ur.user_id
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = ? AND r.role_name = 'super_admin'
    `, [userId]);

    if (superAdminCheck.length > 0) {
      return res.status(403).json({
        message: "Cannot modify super admin roles"
      });
    }

    // Get role name for logging before removal
    const [roleData] = await db.query(
      "SELECT role_name FROM roles WHERE id = ?",
      [roleId]
    );

    const roleName = roleData[0]?.role_name || 'unknown';

    // Remove the role
    await db.query(
      "DELETE FROM user_roles WHERE user_id = ? AND role_id = ?",
      [userId, roleId]
    );

    // Log the role removal
    await AuditLogger.logRoleUpdate(req, 'ROLE_REMOVE', userId, {
      removed_role: roleName,
      performed_by: req.user.id
    });

    return res.json({ message: "Role removed successfully" });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error removing role" });
  }
};

/**
 * Update user role (replaces existing role - for backward compatibility)
 */
exports.updateUserRole = async (req, res) => {
  try {
    const { userId, roleId } = req.body;

    // check if target user is super_admin
    const [check] = await db.query(`
      SELECT r.role_name
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = ?
    `, [userId]);

    const oldRoles = check.map(r => r.role_name);

    if (oldRoles.includes("super_admin")) {
      return res.status(403).json({
        message: "Cannot modify super admin role"
      });
    }

    // Get new role name for logging
    const [newRoleData] = await db.query(
      "SELECT role_name FROM roles WHERE id = ?",
      [roleId]
    );

    const newRoleName = newRoleData[0]?.role_name || 'unknown';

    // remove old roles
    await db.query("DELETE FROM user_roles WHERE user_id = ?", [userId]);

    // assign new role
    await db.query(
      "INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)",
      [userId, roleId]
    );

    // Log the role update
    await AuditLogger.logRoleUpdate(req, 'ROLE_UPDATE', userId, {
      old_roles: oldRoles.join(', '),
      new_role: newRoleName,
      performed_by: req.user.id
    });

    return res.json({ message: "Role updated successfully" });

  } catch (error) {
    console.error('Error updating role:', error);
    return res.status(500).json({ message: "Error updating role" });
  }
};

/**
 * Remove a user completely
 */
exports.removeUser = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    // Check if target user is super_admin
    const [superAdminCheck] = await db.query(`
      SELECT ur.user_id
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = ? AND r.role_name = 'super_admin'
    `, [userId]);

    if (superAdminCheck.length > 0) {
      return res.status(403).json({
        message: "Cannot remove super admin"
      });
    }

    // Delete the user (CASCADE will handle related tables)
    await db.query("DELETE FROM users WHERE id = ?", [userId]);

    return res.json({ message: "User removed successfully" });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error removing user" });
  }
};

/**
 * Add a new role
 */
exports.createRole = async (req, res) => {
  try {
    const { roleName } = req.body;

    if (!roleName) {
      return res.status(400).json({ message: "roleName is required" });
    }

    // Check if role already exists
    const [existing] = await db.query(
      "SELECT id FROM roles WHERE role_name = ?",
      [roleName.toLowerCase()]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: "Role already exists" });
    }

    // Insert new role
    const [result] = await db.query(
      "INSERT INTO roles (role_name) VALUES (?)",
      [roleName.toLowerCase()]
    );

    return res.json({
      message: "Role created successfully",
      roleId: result.insertId
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Error creating role" });
  }
};