import { Router } from 'express';
import { authenticate, requireRole, requireBranchModule } from '../../middleware/auth.js';
import { requireFields } from '../../middleware/validate.js';
import { pool } from '../../db/pool.js';

const router = Router();

async function getUserIdFromAuth(req) {
  const userKey = (req.user?.sub || '').toLowerCase();
  const companyId = req.user?.company_id;
  if (!userKey || !companyId) return null;

  const result = await pool.query(
    'SELECT id FROM users WHERE (LOWER(email) = $1 OR LOWER(phone) = $1) AND company_id = $2',
    [userKey, companyId]
  );

  return result.rows[0]?.id || null;
}

router.post('/apply', authenticate, requireBranchModule('leave'), requireFields(['type', 'startDate', 'endDate']), async (req, res) => {
  try {
    const { type, startDate, endDate, reason } = req.body;
    const userId = await getUserIdFromAuth(req);
    const companyId = req.user?.company_id;

    if (!userId) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const result = await pool.query(
      'INSERT INTO leave_requests (user_id, company_id, leave_type_id, start_date, end_date, reason, status) VALUES ($1, $2, (SELECT id FROM leave_types WHERE name = $3 AND company_id = $2), $4, $5, $6, $7) RETURNING id, user_id, start_date, end_date, status, created_at',
      [userId, companyId, type, startDate, endDate, reason || null, 'pending']
    );
    
    return res.json({ message: 'Leave applied', leave: result.rows[0] });
  } catch (err) {
    console.error('Leave apply error:', err);
    return res.status(500).json({ message: 'Error applying leave' });
  }
});

router.get('/balance', authenticate, requireBranchModule('leave'), async (req, res) => {
  try {
    const companyId = req.user?.company_id;
    const result = await pool.query(
      'SELECT name, annual_quota FROM leave_types WHERE company_id = $1 ORDER BY name',
      [companyId]
    );
    
    const balance = {};
    result.rows.forEach(row => {
      balance[row.name.toLowerCase()] = row.annual_quota || 0;
    });
    
    return res.json({ balance });
  } catch (err) {
    console.error('Leave balance error:', err);
    return res.status(500).json({ message: 'Error fetching balance' });
  }
});

router.get('/', authenticate, requireBranchModule('leave'), async (req, res) => {
  try {
    const userId = await getUserIdFromAuth(req);
    const companyId = req.user?.company_id;

    if (!userId) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const result = await pool.query(
      'SELECT id, user_id, start_date, end_date, status, reason, created_at FROM leave_requests WHERE user_id = $1 AND company_id = $2 ORDER BY created_at DESC',
      [userId, companyId]
    );
    
    return res.json({ leaves: result.rows });
  } catch (err) {
    console.error('Leave GET error:', err);
    return res.status(500).json({ message: 'Error fetching leaves' });
  }
});

router.get('/all', authenticate, requireRole(['admin', 'company_admin', 'branch_manager']), requireBranchModule('leave'), async (req, res) => {
  try {
    const companyId = req.user?.company_id;
    // If admin role, show all; if company_admin, show only company leaves
    let query = 'SELECT id, user_id, start_date, end_date, status, reason, created_at FROM leave_requests';
    let params = [];

    if (req.user?.role === 'company_admin') {
      query += ' WHERE company_id = $1';
      params = [companyId];
    }

    if (req.user?.role === 'branch_manager') {
      if (!req.user?.branch_id) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      query = `SELECT lr.id, lr.user_id, lr.start_date, lr.end_date, lr.status, lr.reason, lr.created_at
               FROM leave_requests lr
               JOIN users u ON lr.user_id = u.id
               WHERE lr.company_id = $1 AND u.branch_id = $2
               ORDER BY lr.created_at DESC`;
      params = [companyId, req.user.branch_id];
    }

    const result = await pool.query(query, params);
    
    return res.json({ leaves: result.rows });
  } catch (err) {
    console.error('Leave GET all error:', err);
    return res.status(500).json({ message: 'Error fetching leaves' });
  }
});

router.post('/:id/decision', authenticate, requireRole(['admin', 'company_admin', 'branch_manager']), requireBranchModule('leave'), requireFields(['status']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const companyId = req.user?.company_id;
    
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    let query = 'UPDATE leave_requests SET status = $1 WHERE id = $2';
    let params = [status, id];

    if (req.user?.role === 'company_admin') {
      query += ' AND company_id = $3';
      params = [status, id, companyId];
    }

    if (req.user?.role === 'branch_manager') {
      if (!req.user?.branch_id) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      query = `UPDATE leave_requests lr
               SET status = $1
               FROM users u
               WHERE lr.id = $2 AND lr.user_id = u.id AND lr.company_id = $3 AND u.branch_id = $4
               RETURNING lr.id, lr.user_id, lr.start_date, lr.end_date, lr.status, lr.created_at`;
      params = [status, id, companyId, req.user.branch_id];
    }

    const result = await pool.query(query, params);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Leave request not found' });
    }
    
    return res.json({ message: 'Leave updated', leave: result.rows[0] });
  } catch (err) {
    console.error('Leave decision error:', err);
    return res.status(500).json({ message: 'Error updating leave' });
  }
});

export default router;
