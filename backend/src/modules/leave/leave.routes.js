import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { requireFields } from '../../middleware/validate.js';
import { pool } from '../../db/pool.js';

const router = Router();

router.post('/apply', authenticate, requireFields(['type', 'startDate', 'endDate']), async (req, res) => {
  try {
    const { type, startDate, endDate, reason } = req.body;
    const userId = req.user?.sub;
    
    const result = await pool.query(
      'INSERT INTO leave_requests (user_id, leave_type_id, start_date, end_date, reason, status) VALUES ($1, (SELECT id FROM leave_types WHERE name = $2), $3, $4, $5, $6) RETURNING id, user_id, start_date, end_date, status, created_at',
      [userId, type, startDate, endDate, reason || null, 'pending']
    );
    
    return res.json({ message: 'Leave applied', leave: result.rows[0] });
  } catch (err) {
    console.error('Leave apply error:', err);
    return res.status(500).json({ message: 'Error applying leave' });
  }
});

router.get('/balance', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT name, annual_quota FROM leave_types ORDER BY name'
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

router.get('/', authenticate, async (req, res) => {
  try {
    const userId = req.user?.sub;
    
    const result = await pool.query(
      'SELECT id, user_id, start_date, end_date, status, reason, created_at FROM leave_requests WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    
    return res.json({ leaves: result.rows });
  } catch (err) {
    console.error('Leave GET error:', err);
    return res.status(500).json({ message: 'Error fetching leaves' });
  }
});

router.get('/all', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, user_id, start_date, end_date, status, reason, created_at FROM leave_requests ORDER BY created_at DESC'
    );
    
    return res.json({ leaves: result.rows });
  } catch (err) {
    console.error('Leave GET all error:', err);
    return res.status(500).json({ message: 'Error fetching leaves' });
  }
});

router.post('/:id/decision', authenticate, requireRole(['admin']), requireFields(['status']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    
    const result = await pool.query(
      'UPDATE leave_requests SET status = $1 WHERE id = $2 RETURNING id, user_id, start_date, end_date, status, created_at',
      [status, id]
    );
    
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
