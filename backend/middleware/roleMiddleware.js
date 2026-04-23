const pool = require("../config/db");

/**
 * Role-based access control middleware
 * Checks if user has at least one of the required roles
 */
exports.checkRole = (requiredRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.id) {
        return res.status(401).json({ message: "Unauthorized: No user info" });
      }

      const userId = req.user.id;

      // Fetch user's roles from user_roles table
      const [userRoles] = await pool.query(
        `SELECT r.role_name 
         FROM user_roles ur 
         JOIN roles r ON ur.role_id = r.id 
         WHERE ur.user_id = ?`,
        [userId]
      );

      const roleNames = userRoles.map(r => r.role_name);

      // Check if user has at least one required role
      const hasRequiredRole = requiredRoles.some(role => roleNames.includes(role));

      if (!hasRequiredRole) {
        return res.status(403).json({
          message: `Forbidden: Required roles: ${requiredRoles.join(", ")}`
        });
      }

      // Add roles to request for later use
      req.userRoles = roleNames;

      next();

    } catch (error) {
      return res.status(500).json({ message: "Error checking roles" });
    }
  };
};
