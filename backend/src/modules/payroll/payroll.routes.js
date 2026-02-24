import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { pool } from '../../db/pool.js';

const router = Router();

router.get('/payslips', authenticate, async (req, res) => {
  try {
    const { user_id } = req.query;
    const userId = user_id || req.user?.sub;
    
    const result = await pool.query(
      'SELECT id, user_id, period, file_url, created_at FROM payroll_payslips WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    
    return res.json({ payslips: result.rows });
  } catch (err) {
    console.error('Payroll GET error:', err);
    return res.status(500).json({ message: 'Error fetching payslips' });
  }
});

router.get('/payslips/all', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, user_id, period, file_url, created_at FROM payroll_payslips ORDER BY created_at DESC'
    );
    
    return res.json({ payslips: result.rows });
  } catch (err) {
    console.error('Payroll GET all error:', err);
    return res.status(500).json({ message: 'Error fetching payslips' });
  }
});

router.post('/payslips', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { user_id, period, file_url } = req.body;
    
    if (!user_id || !period || !file_url) {
      return res.status(400).json({ message: 'user_id, period, and file_url are required' });
    }
    
    const result = await pool.query(
      'INSERT INTO payroll_payslips (user_id, period, file_url) VALUES ($1, $2, $3) RETURNING id, user_id, period, file_url, created_at',
      [user_id, period, file_url]
    );
    
    return res.json({ message: 'Payslip uploaded', payslip: result.rows[0] });
  } catch (err) {
    console.error('Payroll POST error:', err);
    return res.status(500).json({ message: 'Error uploading payslip' });
  }
});

router.delete('/payslips/:id', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM payroll_payslips WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Payslip not found' });
    }
    
    return res.json({ message: 'Payslip deleted' });
  } catch (err) {
    console.error('Payroll DELETE error:', err);
    return res.status(500).json({ message: 'Error deleting payslip' });
  }
});

export default router;
