const express = require('express');
const router = express.Router();

const {
  getAuditLogs,
  getAuditStats,
  getAuditLogById,
  cleanupAuditLogs
} = require('../controllers/auditController');

const { verifyToken } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');

// All audit routes require super_admin role
const auditMiddleware = [verifyToken, checkRole(['super_admin'])];

// Get audit logs with filtering and pagination
router.get('/', auditMiddleware, getAuditLogs);

// Get audit statistics
router.get('/stats', auditMiddleware, getAuditStats);

// Get specific audit log
router.get('/:id', auditMiddleware, getAuditLogById);

// Cleanup old audit logs
router.delete('/cleanup', auditMiddleware, cleanupAuditLogs);

module.exports = router;