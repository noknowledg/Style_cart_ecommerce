const pool = require('../config/db');

/**
 * Audit logging utility for tracking user actions and system events
 */
class AuditLogger {
  /**
   * Log an audit event
   * @param {Object} auditData - Audit log data
   * @param {number} auditData.user_id - User ID
   * @param {string} auditData.action - Action performed (CREATE, UPDATE, DELETE, LOGIN, etc.)
   * @param {number} auditData.target_id - ID of the target entity (optional)
   * @param {string} auditData.details - Additional details about the action
   * @param {string} auditData.ip_address - IP address of the user
   */
  static async log(auditData) {
    try {
      const {
        user_id,
        action,
        target_id,
        details,
        ip_address
      } = auditData;

      const query = `
        INSERT INTO audit_logs
        (user_id, action, target_id, details, ip_address)
        VALUES (?, ?, ?, ?, ?)
      `;

      const values = [
        user_id || null,
        action,
        target_id || null,
        details || null,
        ip_address || null
      ];

      await pool.execute(query, values);
    } catch (error) {
      console.error('Audit logging error:', error);
      // Don't throw error to avoid breaking main functionality
    }
  }

  /**
   * Extract user info from request for audit logging
   * @param {Object} req - Express request object
   * @returns {Object} User info for audit log
   */
  static extractUserInfo(req) {
    const user = req.user || {};
    return {
      user_id: user.id,
      ip_address: req.ip || req.connection.remoteAddress
    };
  }

  /**
   * Log user authentication events
   */
  static async logAuth(req, action, details = null, target_id = null) {
    const userInfo = this.extractUserInfo(req);
    await this.log({
      ...userInfo,
      action,
      target_id,
      details
    });
  }

  /**
   * Log user management events
   */
  static async logUser(req, action, target_id, details = null) {
    const userInfo = this.extractUserInfo(req);
    await this.log({
      ...userInfo,
      action,
      target_id,
      details
    });
  }

  /**
   * Log product management events
   */
  static async logProduct(req, action, target_id, details = null) {
    const userInfo = this.extractUserInfo(req);
    await this.log({
      ...userInfo,
      action,
      target_id,
      details
    });
  }

  /**
   * Log order events
   */
  static async logOrder(req, action, target_id, details = null) {
    const userInfo = this.extractUserInfo(req);
    await this.log({
      ...userInfo,
      action,
      target_id,
      details
    });
  }

  /**
   * Log cart events
   */
  static async logCart(req, action, target_id, details = null) {
    const userInfo = this.extractUserInfo(req);
    await this.log({
      ...userInfo,
      action,
      target_id,
      details
    });
  }

  /**
   * Log role management events
   */
  static async logRoleUpdate(req, action, target_id, details = null) {
    const userInfo = this.extractUserInfo(req);
    await this.log({
      ...userInfo,
      action,
      target_id,
      details
    });
  }
}

module.exports = AuditLogger;