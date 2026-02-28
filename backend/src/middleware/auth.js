import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { pool } from '../db/pool.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const token = header.slice(7);
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

export function requireRole(roles = []) {
  const allowed = Array.isArray(roles) ? roles : [roles];
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    if (!allowed.length || allowed.includes(req.user.role)) {
      return next();
    }
    return res.status(403).json({ message: 'Forbidden' });
  };
}

async function resolveUserIdFromAuth(req) {
  const userKey = (req.user?.sub || '').toLowerCase();
  const companyId = req.user?.company_id;

  if (req.user?.user_id) return req.user.user_id;
  if (!userKey || !companyId) return null;

  const result = await pool.query(
    'SELECT id FROM users WHERE (LOWER(email) = $1 OR LOWER(phone) = $1 OR LOWER(employee_code) = $1) AND company_id = $2',
    [userKey, companyId]
  );

  return result.rows[0]?.id || null;
}

export function requireBranchModule(moduleName) {
  return async (req, res, next) => {
    try {
      if (req.user?.role !== 'branch_manager') {
        return next();
      }

      if (!req.user?.branch_id) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      const managerId = await resolveUserIdFromAuth(req);
      if (!managerId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      const result = await pool.query(
        'SELECT id FROM branch_manager_modules WHERE manager_user_id = $1 AND module_name = $2 AND is_enabled = TRUE',
        [managerId, moduleName]
      );

      if (result.rows.length === 0) {
        return res.status(403).json({ message: 'Forbidden' });
      }

      return next();
    } catch (error) {
      console.error('Branch module access error:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  };
}

/**
 * Verify Master JWT Token
 */
export function verifyMasterToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'error',
      message: 'Authorization token required'
    });
  }

  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (decoded.role !== 'master') {
      return res.status(403).json({
        status: 'error',
        message: 'Only masters can access this endpoint'
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid or expired token'
    });
  }
}

/**
 * Verify Company Admin JWT Token
 */
export function verifyCompanyToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'error',
      message: 'Authorization token required'
    });
  }

  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    if (decoded.role !== 'company_admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Only company admins can access this endpoint'
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid or expired token'
    });
  }
}

/**
 * Verify Company Admin or Branch Manager JWT Token
 */
export function verifyCompanyOrBranchManagerToken(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({
      status: 'error',
      message: 'Authorization token required'
    });
  }

  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    if (!['company_admin', 'branch_manager', 'manager'].includes(decoded.role)) {
      return res.status(403).json({
        status: 'error',
        message: 'Only company admins or managers can access this endpoint'
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid or expired token'
    });
  }
}
