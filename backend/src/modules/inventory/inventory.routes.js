import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { requireFields } from '../../middleware/validate.js';
import { pool } from '../../db/pool.js';

const router = Router();

router.get('/', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, category, status, created_at FROM inventory_items ORDER BY created_at DESC'
    );
    return res.json({ items: result.rows });
  } catch (err) {
    console.error('Inventory GET error:', err);
    return res.status(500).json({ message: 'Error fetching inventory' });
  }
});

router.post('/', authenticate, requireRole(['admin']), requireFields(['name', 'category']), async (req, res) => {
  try {
    const { name, category, status = 'available' } = req.body;
    
    const result = await pool.query(
      'INSERT INTO inventory_items (name, category, status) VALUES ($1, $2, $3) RETURNING id, name, category, status, created_at',
      [name, category, status]
    );
    
    return res.json({ message: 'Item created', item: result.rows[0] });
  } catch (err) {
    console.error('Inventory POST error:', err);
    return res.status(500).json({ message: 'Error creating inventory item' });
  }
});

router.get('/:id', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'SELECT id, name, category, status, created_at FROM inventory_items WHERE id = $1',
      [id]
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

router.put('/:id', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, status } = req.body;
    
    const result = await pool.query(
      'UPDATE inventory_items SET name = COALESCE($1, name), category = COALESCE($2, category), status = COALESCE($3, status) WHERE id = $4 RETURNING id, name, category, status, created_at',
      [name, category, status, id]
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

router.delete('/:id', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM inventory_items WHERE id = $1 RETURNING id',
      [id]
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

router.post('/:id/allocate', authenticate, requireRole(['admin']), requireFields(['userId']), async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    
    const result = await pool.query(
      'INSERT INTO inventory_allocations (item_id, user_id) VALUES ($1, $2) RETURNING id, item_id, user_id, allocated_at',
      [id, userId]
    );
    
    return res.json({ message: 'Item allocated', allocation: result.rows[0] });
  } catch (err) {
    console.error('Inventory allocate error:', err);
    return res.status(500).json({ message: 'Error allocating item' });
  }
});

export default router;
