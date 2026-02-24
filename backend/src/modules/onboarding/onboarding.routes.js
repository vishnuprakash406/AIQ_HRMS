import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { requireFields } from '../../middleware/validate.js';
import { pool } from '../../db/pool.js';
import { onboardingUpload } from '../../middleware/upload.js';

const router = Router();

async function getUserIdFromAuth(req) {
  const userKey = (req.user?.sub || '').toLowerCase();
  if (!userKey) return null;

  const result = await pool.query(
    'SELECT id FROM users WHERE LOWER(email) = $1 OR LOWER(phone) = $1',
    [userKey]
  );

  return result.rows[0]?.id || null;
}

async function getUserIdByParam(userId) {
  const result = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
  return result.rows[0]?.id || null;
}

// Get onboarding tasks for current employee
router.get('/tasks', authenticate, async (req, res) => {
  try {
    const userId = await getUserIdFromAuth(req);
    if (!userId) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const result = await pool.query(`
      SELECT 
        oc.id, 
        oc.task_id,
        d.title,
        d.file_url as description,
        oc.completed,
        oc.completed_at
      FROM onboarding_checklist oc
      JOIN documents d ON d.id = oc.task_id
      WHERE oc.user_id = $1
      ORDER BY oc.created_at
    `, [userId]);
    
    return res.json({ tasks: result.rows });
  } catch (err) {
    console.error('Onboarding GET error:', err);
    return res.status(500).json({ message: 'Error fetching tasks' });
  }
});

// Get all onboarding task templates (admin only)
router.get('/templates', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, title, file_url as description, created_at FROM documents WHERE kind = $1 ORDER BY created_at DESC',
      ['onboarding']
    );
    
    return res.json({ templates: result.rows });
  } catch (err) {
    console.error('Onboarding templates GET error:', err);
    return res.status(500).json({ message: 'Error fetching templates' });
  }
});

// Create onboarding task template (admin only)
router.post('/templates', authenticate, requireRole(['admin']), requireFields(['title']), async (req, res) => {
  try {
    const { title, description } = req.body;
    const admin_id = req.user?.sub;
    
    const result = await pool.query(
      'INSERT INTO documents (kind, owner_id, title, file_url) VALUES ($1, $2, $3, $4) RETURNING id, title, file_url as description, created_at',
      ['onboarding', admin_id, title, description || null]
    );
    
    return res.json({ message: 'Task template created', template: result.rows[0] });
  } catch (err) {
    console.error('Onboarding POST error:', err);
    return res.status(500).json({ message: 'Error creating task' });
  }
});

// Delete onboarding task template (admin only)
router.delete('/templates/:id', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM documents WHERE id = $1 AND kind = $2 RETURNING id',
      [id, 'onboarding']
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    return res.json({ message: 'Task deleted' });
  } catch (err) {
    console.error('Onboarding DELETE error:', err);
    return res.status(500).json({ message: 'Error deleting task' });
  }
});

// Assign onboarding tasks to employee (admin only)
router.post('/assign/:userId', authenticate, requireRole(['admin']), requireFields(['taskIds']), async (req, res) => {
  try {
    const { userId } = req.params;
    const { taskIds } = req.body; // Array of task IDs
    
    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({ message: 'taskIds must be a non-empty array' });
    }
    
    // Create checklist entries for each task
    const promises = taskIds.map(taskId =>
      pool.query(
        'INSERT INTO onboarding_checklist (user_id, task_id, completed) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING RETURNING id',
        [userId, taskId, false]
      )
    );
    
    await Promise.all(promises);
    
    return res.json({ message: 'Tasks assigned to employee' });
  } catch (err) {
    console.error('Onboarding assign error:', err);
    return res.status(500).json({ message: 'Error assigning tasks' });
  }
});

// Mark task as complete (employee)
router.put('/tasks/:taskChecklistId/complete', authenticate, async (req, res) => {
  try {
    const { taskChecklistId } = req.params;
    const userId = await getUserIdFromAuth(req);
    if (!userId) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const result = await pool.query(
      'UPDATE onboarding_checklist SET completed = true, completed_at = now() WHERE id = $1 AND user_id = $2 RETURNING id, completed, completed_at',
      [taskChecklistId, userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    return res.json({ message: 'Task marked as complete', task: result.rows[0] });
  } catch (err) {
    console.error('Onboarding complete error:', err);
    return res.status(500).json({ message: 'Error completing task' });
  }
});

// Get current employee onboarding profile
router.get('/profile', authenticate, async (req, res) => {
  try {
    const userId = await getUserIdFromAuth(req);
    if (!userId) {
      return res.status(404).json({ message: 'User not found' });
    }

    const result = await pool.query(
      `SELECT designation, date_of_birth, marital_status, spouse_name, father_name, mother_name,
              emergency_contact_name, emergency_contact_phone, address, id_type, id_number,
              bank_name, bank_account_number, bank_ifsc
       FROM employee_profiles WHERE user_id = $1`,
      [userId]
    );

    return res.json({ profile: result.rows[0] || null });
  } catch (err) {
    console.error('Onboarding profile GET error:', err);
    return res.status(500).json({ message: 'Error fetching profile' });
  }
});

// Admin: Get employee onboarding profile
router.get('/profile/:userId', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { userId } = req.params;
    const resolvedId = await getUserIdByParam(userId);
    if (!resolvedId) {
      return res.status(404).json({ message: 'User not found' });
    }

    const result = await pool.query(
      `SELECT designation, date_of_birth, marital_status, spouse_name, father_name, mother_name,
              emergency_contact_name, emergency_contact_phone, address, id_type, id_number,
              bank_name, bank_account_number, bank_ifsc
       FROM employee_profiles WHERE user_id = $1`,
      [resolvedId]
    );

    return res.json({ profile: result.rows[0] || null });
  } catch (err) {
    console.error('Admin onboarding profile GET error:', err);
    return res.status(500).json({ message: 'Error fetching profile' });
  }
});

// Admin: Update employee onboarding profile
router.put('/profile/:userId', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { userId } = req.params;
    const resolvedId = await getUserIdByParam(userId);
    if (!resolvedId) {
      return res.status(404).json({ message: 'User not found' });
    }

    const {
      designation,
      date_of_birth,
      marital_status,
      spouse_name,
      father_name,
      mother_name,
      emergency_contact_name,
      emergency_contact_phone,
      address,
      id_type,
      id_number,
      bank_name,
      bank_account_number,
      bank_ifsc
    } = req.body;

    const result = await pool.query(
      `INSERT INTO employee_profiles (
        user_id, designation, date_of_birth, marital_status, spouse_name, father_name, mother_name,
        emergency_contact_name, emergency_contact_phone, address, id_type, id_number,
        bank_name, bank_account_number, bank_ifsc, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12,
        $13, $14, $15, now()
      )
      ON CONFLICT (user_id) DO UPDATE SET
        designation = EXCLUDED.designation,
        date_of_birth = EXCLUDED.date_of_birth,
        marital_status = EXCLUDED.marital_status,
        spouse_name = EXCLUDED.spouse_name,
        father_name = EXCLUDED.father_name,
        mother_name = EXCLUDED.mother_name,
        emergency_contact_name = EXCLUDED.emergency_contact_name,
        emergency_contact_phone = EXCLUDED.emergency_contact_phone,
        address = EXCLUDED.address,
        id_type = EXCLUDED.id_type,
        id_number = EXCLUDED.id_number,
        bank_name = EXCLUDED.bank_name,
        bank_account_number = EXCLUDED.bank_account_number,
        bank_ifsc = EXCLUDED.bank_ifsc,
        updated_at = now()
      RETURNING designation, date_of_birth, marital_status, spouse_name, father_name, mother_name,
                emergency_contact_name, emergency_contact_phone, address, id_type, id_number,
                bank_name, bank_account_number, bank_ifsc`,
      [
        resolvedId,
        designation || null,
        date_of_birth || null,
        marital_status || null,
        spouse_name || null,
        father_name || null,
        mother_name || null,
        emergency_contact_name || null,
        emergency_contact_phone || null,
        address || null,
        id_type || null,
        id_number || null,
        bank_name || null,
        bank_account_number || null,
        bank_ifsc || null
      ]
    );

    return res.json({ message: 'Profile updated', profile: result.rows[0] });
  } catch (err) {
    console.error('Admin onboarding profile PUT error:', err);
    return res.status(500).json({ message: 'Error updating profile' });
  }
});

// Upload onboarding document
router.post('/documents/:userId', authenticate, requireRole(['admin']), onboardingUpload.single('file'), async (req, res) => {
  try {
    const { userId } = req.params;
    const resolvedId = await getUserIdByParam(userId);
    if (!resolvedId) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'file is required' });
    }

    const { title } = req.body;
    const fileUrl = `/uploads/onboarding/${req.file.filename}`;

    const result = await pool.query(
      'INSERT INTO documents (kind, owner_id, title, file_url) VALUES ($1, $2, $3, $4) RETURNING id, title, file_url, created_at',
      ['onboarding_doc', resolvedId, title || req.file.originalname, fileUrl]
    );

    return res.json({ message: 'Document uploaded', document: result.rows[0] });
  } catch (err) {
    console.error('Onboarding document upload error:', err);
    return res.status(500).json({ message: 'Error uploading document' });
  }
});

// List onboarding documents for current employee
router.get('/documents', authenticate, async (req, res) => {
  try {
    const userId = await getUserIdFromAuth(req);
    if (!userId) {
      return res.status(404).json({ message: 'User not found' });
    }

    const result = await pool.query(
      'SELECT id, title, file_url, created_at FROM documents WHERE kind = $1 AND owner_id = $2 ORDER BY created_at DESC',
      ['onboarding_doc', userId]
    );

    return res.json({ documents: result.rows });
  } catch (err) {
    console.error('Onboarding documents GET error:', err);
    return res.status(500).json({ message: 'Error fetching documents' });
  }
});

// Admin: List onboarding documents for employee
router.get('/documents/:userId', authenticate, requireRole(['admin']), async (req, res) => {
  try {
    const { userId } = req.params;
    const resolvedId = await getUserIdByParam(userId);
    if (!resolvedId) {
      return res.status(404).json({ message: 'User not found' });
    }

    const result = await pool.query(
      'SELECT id, title, file_url, created_at FROM documents WHERE kind = $1 AND owner_id = $2 ORDER BY created_at DESC',
      ['onboarding_doc', resolvedId]
    );

    return res.json({ documents: result.rows });
  } catch (err) {
    console.error('Admin onboarding documents GET error:', err);
    return res.status(500).json({ message: 'Error fetching documents' });
  }
});

export default router;
