import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { requireFields } from '../../middleware/validate.js';
import { pool } from '../../db/pool.js';

const router = Router();

// Get all leave types (leave plans)
router.get('/types', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, annual_quota FROM leave_types ORDER BY name'
    );
    return res.json({ leaveTypes: result.rows });
  } catch (err) {
    console.error('Leave types GET error:', err);
    return res.status(500).json({ message: 'Error fetching leave types' });
  }
});

// Create new leave type (admin only)
router.post('/types', authenticate, requireRole(['admin']), requireFields(['name', 'annual_quota']), async (req, res) => {
  try {
    const { name, annual_quota } = req.body;
    
    const result = await pool.query(
      'INSERT INTO leave_types (name, annual_quota) VALUES ($1, $2) RETURNING id, name, annual_quota',
      [name, annual_quota]
    );
    
    return res.json({ message: 'Leave type created', leaveType: result.rows[0] });
  } catch (err) {
    console.error('Leave type POST error:', err);
    if (err.code === '23505') {
      return res.status(400).json({ message: 'Leave type already exists' });
    }
    return res.status(500).json({ message: 'Error creating leave type' });
  }
});

// Update leave type (admin only)
router.put('/types/:id', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, annual_quota } = req.body;
    
    const result = await pool.query(
      'UPDATE leave_types SET name = COALESCE($1, name), annual_quota = COALESCE($2, annual_quota) WHERE id = $3 RETURNING id, name, annual_quota',
      [name, annual_quota, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Leave type not found' });
    }
    
    return res.json({ message: 'Leave type updated', leaveType: result.rows[0] });
  } catch (err) {
    console.error('Leave type PUT error:', err);
    return res.status(500).json({ message: 'Error updating leave type' });
  }
});

// Delete leave type (admin only)
router.delete('/types/:id', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM leave_types WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Leave type not found' });
    }
    
    return res.json({ message: 'Leave type deleted' });
  } catch (err) {
    console.error('Leave type DELETE error:', err);
    return res.status(500).json({ message: 'Error deleting leave type' });
  }
});

export default router;
