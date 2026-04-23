const pool = require('../config/db');
const AuditLogger = require('../utils/auditLogger');

/**
 * Get audit logs with filtering and pagination
 */
exports.getAuditLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      user_id,
      action,
      target_id,
      start_date,
      end_date,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;

    // Build WHERE conditions
    let whereConditions = [];
    let params = [];

    if (user_id) {
      whereConditions.push('user_id = ?');
      params.push(user_id);
    }

    if (action) {
      whereConditions.push('action = ?');
      params.push(action);
    }

    if (target_id) {
      whereConditions.push('target_id = ?');
      params.push(target_id);
    }

    if (start_date) {
      whereConditions.push('created_at >= ?');
      params.push(start_date);
    }

    if (end_date) {
      whereConditions.push('created_at <= ?');
      params.push(end_date);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Get total count
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM audit_logs ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // Get logs with user information
    const [logs] = await pool.execute(
      `SELECT al.*, u.first_name, u.last_name, u.email
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       ${whereClause}
       ORDER BY ${sort_by} ${sort_order}
       LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    res.json({
      success: true,
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ message: 'Error fetching audit logs' });
  }
};

/**
 * Get audit log statistics
 */
exports.getAuditStats = async (req, res) => {
  try {
    const { period = '7' } = req.query; // days

    // Get action counts
    const [actionStats] = await pool.execute(`
      SELECT action, COUNT(*) as count
      FROM audit_logs
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      GROUP BY action
      ORDER BY count DESC
    `, [period]);

    // Get user activity counts
    const [userStats] = await pool.execute(`
      SELECT u.email, COUNT(*) as count
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      AND al.user_id IS NOT NULL
      GROUP BY al.user_id, u.email
      ORDER BY count DESC
      LIMIT 10
    `, [period]);

    // Get recent activity
    const [recentActivity] = await pool.execute(`
      SELECT al.*, u.first_name, u.last_name, u.email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.created_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
      ORDER BY al.created_at DESC
      LIMIT 20
    `, [period]);

    res.json({
      success: true,
      stats: {
        actionStats,
        userStats,
        recentActivity
      }
    });

  } catch (error) {
    console.error('Error fetching audit stats:', error);
    res.status(500).json({ message: 'Error fetching audit statistics' });
  }
};

/**
 * Get audit log by ID
 */
exports.getAuditLogById = async (req, res) => {
  try {
    const { id } = req.params;

    const [logs] = await pool.execute(
      `SELECT al.*, u.first_name, u.last_name, u.email
       FROM audit_logs al
       LEFT JOIN users u ON al.user_id = u.id
       WHERE al.id = ?`,
      [id]
    );

    if (logs.length === 0) {
      return res.status(404).json({ message: 'Audit log not found' });
    }

    res.json({ success: true, log: logs[0] });

  } catch (error) {
    console.error('Error fetching audit log:', error);
    res.status(500).json({ message: 'Error fetching audit log' });
  }
};

/**
 * Delete old audit logs (cleanup function)
 */
exports.cleanupAuditLogs = async (req, res) => {
  try {
    const { days = 90 } = req.body; // Default 90 days retention

    const [result] = await pool.execute(
      'DELETE FROM audit_logs WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
      [days]
    );

    // Log the cleanup action
    await AuditLogger.log({
      ...AuditLogger.extractUserInfo(req),
      action: 'CLEANUP',
      details: `Deleted ${result.affectedRows} audit logs older than ${days} days`
    });

    res.json({
      success: true,
      message: `Deleted ${result.affectedRows} old audit logs`
    });

  } catch (error) {
    console.error('Error cleaning up audit logs:', error);
    res.status(500).json({ message: 'Error cleaning up audit logs' });
  }
};