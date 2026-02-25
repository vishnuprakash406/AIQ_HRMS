import { Router } from 'express';
import { authenticate, requireRole, requireBranchModule } from '../../middleware/auth.js';
import { requireFields } from '../../middleware/validate.js';
import { pool } from '../../db/pool.js';

const router = Router();

router.get('/', authenticate, requireRole(['admin', 'company_admin', 'branch_manager']), requireBranchModule('inventory'), async (req, res) => {
  try {
    const companyId = req.user?.company_id;
    let whereClause = '';
    let params = [];

    if (req.user?.role === 'company_admin') {
      whereClause = 'WHERE company_id = $1';
      params = [companyId];
    }

    if (req.user?.role === 'branch_manager') {
      if (!req.user?.branch_id) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      whereClause = 'WHERE company_id = $1 AND branch_id = $2';
      params = [companyId, req.user.branch_id];
    }
    const result = await pool.query(
      `SELECT id, name, category, status, created_at FROM inventory_items ${whereClause} ORDER BY created_at DESC`,
      params
    );
    return res.json({ items: result.rows });
  } catch (err) {
    console.error('Inventory GET error:', err);
    return res.status(500).json({ message: 'Error fetching inventory' });
  }
});

router.post('/', authenticate, requireRole(['admin', 'company_admin', 'branch_manager']), requireBranchModule('inventory'), requireFields(['name', 'category']), async (req, res) => {
  try {
    const { name, category, status = 'available', branch_id } = req.body;
    const companyId = req.user?.company_id;
    const branchId = req.user?.role === 'branch_manager' ? req.user?.branch_id : branch_id || null;

    if (req.user?.role === 'branch_manager' && !branchId) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    const result = await pool.query(
      'INSERT INTO inventory_items (name, category, status, company_id, branch_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, name, category, status, branch_id, created_at',
      [name, category, status, companyId, branchId]
    );
    
    return res.json({ message: 'Item created', item: result.rows[0] });
  } catch (err) {
    console.error('Inventory POST error:', err);
    return res.status(500).json({ message: 'Error creating inventory item' });
  }
});

router.get('/:id', authenticate, requireRole(['admin', 'company_admin', 'branch_manager']), requireBranchModule('inventory'), async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.company_id;
    let whereClause = 'id = $1';
    let params = [id];

    if (req.user?.role === 'company_admin') {
      whereClause = 'id = $1 AND company_id = $2';
      params = [id, companyId];
    }

    if (req.user?.role === 'branch_manager') {
      if (!req.user?.branch_id) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      whereClause = 'id = $1 AND company_id = $2 AND branch_id = $3';
      params = [id, companyId, req.user.branch_id];
    }
    
    const result = await pool.query(
      `SELECT id, name, category, status, created_at FROM inventory_items WHERE ${whereClause}`,
      params
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    return res.json({ item: result.rows[0] });
  } catch (err) {
    console.error('Inventory GET by ID error:', err);
    return res.status(500).json({ message: 'Error fetching item' });
  }
});

router.put('/:id', authenticate, requireRole(['admin', 'company_admin', 'branch_manager']), requireBranchModule('inventory'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, status, branch_id } = req.body;
    const companyId = req.user?.company_id;
    let whereClause = 'id = $5';
    let params = [name, category, status, branch_id || null, id];

    if (req.user?.role === 'company_admin') {
      whereClause = 'id = $5 AND company_id = $6';
      params = [name, category, status, branch_id || null, id, companyId];
    }

    if (req.user?.role === 'branch_manager') {
      if (!req.user?.branch_id) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      whereClause = 'id = $5 AND company_id = $6 AND branch_id = $7';
      params = [name, category, status, req.user.branch_id, id, companyId, req.user.branch_id];
    }
    
    const result = await pool.query(
      `UPDATE inventory_items SET name = COALESCE($1, name), category = COALESCE($2, category), status = COALESCE($3, status), branch_id = COALESCE($4, branch_id) WHERE ${whereClause} RETURNING id, name, category, status, branch_id, created_at`,
      params
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    return res.json({ message: 'Item updated', item: result.rows[0] });
  } catch (err) {
    console.error('Inventory PUT error:', err);
    return res.status(500).json({ message: 'Error updating item' });
  }
});

router.delete('/:id', authenticate, requireRole(['admin', 'company_admin', 'branch_manager']), requireBranchModule('inventory'), async (req, res) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.company_id;
    let whereClause = 'id = $1';
    let params = [id];

    if (req.user?.role === 'company_admin') {
      whereClause = 'id = $1 AND company_id = $2';
      params = [id, companyId];
    }

    if (req.user?.role === 'branch_manager') {
      if (!req.user?.branch_id) {
        return res.status(403).json({ message: 'Forbidden' });
      }
      whereClause = 'id = $1 AND company_id = $2 AND branch_id = $3';
      params = [id, companyId, req.user.branch_id];
    }
    
    const result = await pool.query(
      `DELETE FROM inventory_items WHERE ${whereClause} RETURNING id`,
      params
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }
    
    return res.json({ message: 'Item deleted' });
  } catch (err) {
    console.error('Inventory DELETE error:', err);
    return res.status(500).json({ message: 'Error deleting item' });
  }
});

router.post('/:id/allocate', authenticate, requireRole(['admin', 'company_admin', 'branch_manager']), requireBranchModule('inventory'), requireFields(['userId']), async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    const companyId = req.user?.company_id;

    const itemResult = await pool.query(
      'SELECT id, company_id, branch_id FROM inventory_items WHERE id = $1',
      [id]
    );

    if (itemResult.rows.length === 0) {
      return res.status(404).json({ message: 'Item not found' });
    }

    const item = itemResult.rows[0];
    if (req.user?.role !== 'admin' && item.company_id !== companyId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (req.user?.role === 'branch_manager') {
      if (!req.user?.branch_id || item.branch_id !== req.user.branch_id) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    }

    const userResult = await pool.query(
      'SELECT id, company_id, branch_id FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const targetUser = userResult.rows[0];
    if (req.user?.role !== 'admin' && targetUser.company_id !== companyId) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (req.user?.role === 'branch_manager' && targetUser.branch_id !== req.user.branch_id) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    
    const allocationBranchId = item.branch_id || targetUser.branch_id;
    const result = await pool.query(
      'INSERT INTO inventory_allocations (item_id, user_id, branch_id) VALUES ($1, $2, $3) RETURNING id, item_id, user_id, branch_id, allocated_at',
      [id, userId, allocationBranchId]
    );
    
    return res.json({ message: 'Item allocated', allocation: result.rows[0] });
  } catch (err) {
    console.error('Inventory allocate error:', err);
    return res.status(500).json({ message: 'Error allocating item' });
  }
});

export default router;
