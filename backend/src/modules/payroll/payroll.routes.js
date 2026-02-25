import { Router } from 'express';
import { authenticate, requireRole, requireBranchModule } from '../../middleware/auth.js';
import { pool } from '../../db/pool.js';

const router = Router();

router.get('/payslips', authenticate, requireBranchModule('payroll'), async (req, res) => {
  try {
    const { user_id } = req.query;
    const userId = user_id || req.user?.sub;
    const companyId = req.user?.company_id;
    const branchId = req.user?.branch_id;

    if (req.user?.role === 'branch_manager') {
      const targetResult = await pool.query(
        'SELECT id, branch_id FROM users WHERE id = $1',
        [userId]
      );

      if (targetResult.rows.length === 0 || targetResult.rows[0].branch_id !== branchId) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }
    
    const result = await pool.query(
      'SELECT id, user_id, period, file_url, created_at FROM payroll_payslips WHERE user_id = $1 AND company_id = $2 ORDER BY created_at DESC',
      [userId, companyId]
    );
    
    return res.json({ payslips: result.rows });
  } catch (err) {
    console.error('Payroll GET error:', err);
    return res.status(500).json({ message: 'Error fetching payslips' });
  }
});

router.get('/payslips/all', authenticate, requireRole(['admin', 'company_admin', 'branch_manager']), requireBranchModule('payroll'), async (req, res) => {
  try {
    const companyId = req.user?.company_id;
    let query = 'SELECT id, user_id, period, file_url, created_at FROM payroll_payslips';
    let params = [];

    if (req.user?.role === 'company_admin') {
      query += ' WHERE company_id = $1';
      params = [companyId];
    }

    if (req.user?.role === 'branch_manager') {
      if (!req.user?.branch_id) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      query = `SELECT p.id, p.user_id, p.period, p.file_url, p.created_at
               FROM payroll_payslips p
               JOIN users u ON p.user_id = u.id
               WHERE p.company_id = $1 AND u.branch_id = $2
               ORDER BY p.created_at DESC`;
      params = [companyId, req.user.branch_id];
    }

    const result = await pool.query(query, params);
    
    return res.json({ payslips: result.rows });
  } catch (err) {
    console.error('Payroll GET all error:', err);
    return res.status(500).json({ message: 'Error fetching payslips' });
  }
});

router.post('/payslips', authenticate, requireRole(['admin', 'company_admin', 'branch_manager']), requireBranchModule('payroll'), async (req, res) => {
  try {
    const { user_id, period, file_url } = req.body;
    const companyId = req.user?.company_id;
    
    if (!user_id || !period || !file_url) {
      return res.status(400).json({ message: 'user_id, period, and file_url are required' });
    }
    
    if (req.user?.role === 'branch_manager') {
      if (!req.user?.branch_id) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      const targetResult = await pool.query(
        'SELECT id, branch_id FROM users WHERE id = $1 AND company_id = $2',
        [user_id, companyId]
      );
      if (targetResult.rows.length === 0 || targetResult.rows[0].branch_id !== req.user.branch_id) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    const result = await pool.query(
      'INSERT INTO payroll_payslips (user_id, period, file_url, company_id) VALUES ($1, $2, $3, $4) RETURNING id, user_id, period, file_url, created_at',
      [user_id, period, file_url, companyId]
    );
    
    return res.json({ message: 'Payslip uploaded', payslip: result.rows[0] });
  } catch (err) {
    console.error('Payroll POST error:', err);
    return res.status(500).json({ message: 'Error uploading payslip' });
  }
});

router.delete('/payslips/:id', authenticate, requireRole(['admin', 'company_admin', 'branch_manager']), requireBranchModule('payroll'), async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.company_id;
    let query = 'DELETE FROM payroll_payslips WHERE id = $1';
    let params = [id];

    if (req.user?.role === 'company_admin') {
      query += ' AND company_id = $2';
      params = [id, companyId];
    }

    if (req.user?.role === 'branch_manager') {
      if (!req.user?.branch_id) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      query = `DELETE FROM payroll_payslips p
               USING users u
               WHERE p.id = $1 AND p.user_id = u.id AND p.company_id = $2 AND u.branch_id = $3
               RETURNING p.id`;
      params = [id, companyId, req.user.branch_id];
    }

    const result = await pool.query(query, params);
    
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
