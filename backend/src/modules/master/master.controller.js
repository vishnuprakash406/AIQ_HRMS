import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../../db/pool.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Master Login
 * POST /master/login
 * Body: { username, password }
 * Returns: { status, token, message }
 */
export async function masterLogin(req, res) {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Username and password are required'
      });
    }

    // Fetch master from database
    const result = await pool.query(
      'SELECT id, username, password_hash FROM masters WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid username or password'
      });
    }

    const master = result.rows[0];

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, master.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid username or password'
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: master.id,
        username: master.username,
        role: 'master'
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      status: 'success',
      message: 'Master login successful',
      token,
      role: 'master'
    });
  } catch (error) {
    console.error('Master login error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}

/**
 * Create Master (Admin only - should be protected)
 * POST /master/create
 * Body: { username, password, email }
 * Returns: { status, message, data }
 */
export async function createMaster(req, res) {
  try {
    const { username, password, email } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Username and password are required'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert master
    const result = await pool.query(
      'INSERT INTO masters (username, password_hash, email) VALUES ($1, $2, $3) RETURNING id, username, email',
      [username, hashedPassword, email || null]
    );

    return res.status(201).json({
      status: 'success',
      message: 'Master created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({
        status: 'error',
        message: 'Username already exists'
      });
    }
    console.error('Create master error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}

/**
 * Create Company
 * POST /master/companies
 * Auth: Master JWT token required
 * Body: { company_code, name, username, password, employee_limit, default_modules }
 * Returns: { status, message, data }
 */
export async function createCompany(req, res) {
  try {
    const { company_code, name, username, password, email, contact_number, employee_limit = 50, default_modules = [] } = req.body;

    if (!company_code || !name || !username || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'company_code, name, username, and password are required'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert company
      const companyResult = await client.query(
        'INSERT INTO companies (company_code, name, username, password_hash, email, contact_number, employee_limit) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, company_code, name, employee_limit',
        [company_code, name, username, hashedPassword, email || null, contact_number || null, employee_limit]
      );

      const company = companyResult.rows[0];

      // All available modules
      const allModules = [
        'inventory',
        'employee_management',
        'payroll',
        'attendance',
        'leave',
        'geofencing',
        'onboarding',
        'support',
        'documents'
      ];

      // Insert all modules - enabled if in default_modules, disabled otherwise
      for (const module of allModules) {
        const isEnabled = default_modules.includes(module);
        await client.query(
          'INSERT INTO company_modules (company_id, module_name, is_enabled) VALUES ($1, $2, $3)',
          [company.id, module, isEnabled]
        );
      }

      // Create default license (1 year from now)
      const licenseEndDate = new Date();
      licenseEndDate.setFullYear(licenseEndDate.getFullYear() + 1);
      const remainingDays = 365;

      await client.query(
        `INSERT INTO company_licenses 
         (company_id, company_code, license_start_date, license_duration_value, license_duration_type, license_end_date, remaining_days, is_active)
         VALUES ($1, $2, CURRENT_TIMESTAMP, 1, 'years', $3, $4, TRUE)`,
        [company.id, company.company_code, licenseEndDate, remainingDays]
      );

      await client.query('COMMIT');

      return res.status(201).json({
        status: 'success',
        message: 'Company created successfully',
        data: {
          ...company,
          modules: allModules
        }
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    if (error.code === '23505') {
      return res.status(400).json({
        status: 'error',
        message: 'Company code or username already exists'
      });
    }
    console.error('Create company error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}

/**
 * Get All Companies
 * GET /master/companies
 * Auth: Master JWT token required
 * Returns: { status, message, data: companies[] }
 */
export async function getAllCompanies(req, res) {
  try {
    const result = await pool.query(
      'SELECT id, company_code, name, employee_limit, is_active, created_at FROM companies ORDER BY created_at DESC'
    );

    return res.status(200).json({
      status: 'success',
      message: 'Companies retrieved successfully',
      data: result.rows
    });
  } catch (error) {
    console.error('Get companies error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}

/**
 * Get Company Details
 * GET /master/companies/:companyId
 * Auth: Master JWT token required
 * Returns: { status, message, data }
 */
export async function getCompanyDetails(req, res) {
  try {
    const { companyId } = req.params;

    // Get company info
    const companyResult = await pool.query(
      'SELECT id, company_code, name, email, contact_number, employee_limit, is_active, created_at FROM companies WHERE id = $1',
      [companyId]
    );

    if (companyResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Company not found'
      });
    }

    const company = companyResult.rows[0];

    // Get modules
    const modulesResult = await pool.query(
      'SELECT module_name, is_enabled FROM company_modules WHERE company_id = $1',
      [companyId]
    );

    // Get employee count
    const employeeResult = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE company_id = $1',
      [companyId]
    );

    return res.status(200).json({
      status: 'success',
      message: 'Company details retrieved successfully',
      data: {
        ...company,
        modules: modulesResult.rows,
        employee_count: parseInt(employeeResult.rows[0].count, 10)
      }
    });
  } catch (error) {
    console.error('Get company details error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}

/**
 * Update Company
 * PUT /master/companies/:companyId
 * Auth: Master JWT token required
 * Body: { name, email, contact_number, employee_limit, is_active }
 * Returns: { status, message, data }
 */
export async function updateCompany(req, res) {
  try {
    const { companyId } = req.params;
    const { name, email, contact_number, employee_limit, is_active } = req.body;

    const updates = [];
    const values = [companyId];
    let paramIndex = 2;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      values.push(name);
      paramIndex++;
    }
    if (email !== undefined) {
      updates.push(`email = $${paramIndex}`);
      values.push(email || null);
      paramIndex++;
    }
    if (contact_number !== undefined) {
      updates.push(`contact_number = $${paramIndex}`);
      values.push(contact_number || null);
      paramIndex++;
    }
    if (employee_limit !== undefined) {
      updates.push(`employee_limit = $${paramIndex}`);
      values.push(employee_limit);
      paramIndex++;
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      values.push(is_active);
      paramIndex++;
    }

    if (updates.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No fields to update'
      });
    }

    updates.push(`updated_at = now()`);

    const result = await pool.query(
      `UPDATE companies SET ${updates.join(', ')} WHERE id = $1 RETURNING id, company_code, name, email, contact_number, employee_limit, is_active`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Company not found'
      });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Company updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Update company error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}

/**
 * Get Company Users
 * GET /master/companies/:companyId/users
 * Auth: Master JWT token required
 * Returns: { status, message, users }
 */
export async function getCompanyUsers(req, res) {
  try {
    const { companyId } = req.params;

    const result = await pool.query(
      'SELECT id, email, phone, full_name, role, created_at FROM users WHERE company_id = $1 ORDER BY full_name',
      [companyId]
    );

    return res.status(200).json({
      status: 'success',
      message: 'Users retrieved successfully',
      users: result.rows || []
    });
  } catch (error) {
    console.error('Get company users error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}

/**
 * Reset Company Password (Master Only)
 * POST /master/companies/:companyId/reset-password
 * Auth: Master JWT token required
 * Body: { newPassword }
 * Returns: { status, message }
 */
export async function resetCompanyPassword(req, res) {
  try {
    const { companyId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'newPassword is required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        status: 'error',
        message: 'Password must be at least 6 characters long'
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    const result = await pool.query(
      'UPDATE companies SET password_hash = $1 WHERE id = $2 RETURNING id, company_code, name, username',
      [passwordHash, companyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Company not found'
      });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Company password reset successfully',
      company: result.rows[0]
    });
  } catch (error) {
    console.error('Reset company password error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}

/**
 * Reset User Password (Master Only)
 * POST /master/users/:userId/reset-password
 * Auth: Master JWT token required
 * Body: { newPassword }
 * Returns: { status, message }
 */
export async function resetUserPassword(req, res) {
  try {
    const { userId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'newPassword is required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        status: 'error',
        message: 'Password must be at least 6 characters long'
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    const result = await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2 RETURNING id, email, full_name',
      [passwordHash, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Password reset successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Reset user password error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}

/**
 * Change Master Password (Master changes their own password)
 * POST /master/change-password
 * Auth: Master JWT token required
 * Body: { currentPassword, newPassword }
 * Returns: { status, message }
 */
export async function changeMasterPassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    const masterId = req.master.id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        status: 'error',
        message: 'New password must be at least 6 characters long'
      });
    }

    // Fetch master from database
    const result = await pool.query(
      'SELECT id, username, password_hash FROM masters WHERE id = $1',
      [masterId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Master not found'
      });
    }

    const master = result.rows[0];

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, master.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await pool.query(
      'UPDATE masters SET password_hash = $1 WHERE id = $2',
      [newPasswordHash, masterId]
    );

    return res.status(200).json({
      status: 'success',
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change master password error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}

/**
 * Toggle Company Module Status
 * PUT /master/companies/:companyId/modules/:moduleName
 * Auth: Master JWT token required
 * Body: { is_enabled }
 * Returns: { status, message, data }
 */
export async function toggleCompanyModule(req, res) {
  try {
    const { companyId, moduleName } = req.params;
    const { is_enabled } = req.body;

    if (is_enabled === undefined) {
      return res.status(400).json({
        status: 'error',
        message: 'is_enabled field is required'
      });
    }

    // Update module
    const result = await pool.query(
      'UPDATE company_modules SET is_enabled = $1 WHERE company_id = $2 AND module_name = $3 RETURNING module_name, is_enabled',
      [is_enabled, companyId, moduleName]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Module not found for this company'
      });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Module updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Toggle company module error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}
