import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../../db/pool.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Company Login
 * POST /company/login
 * Body: { company_code, username, password }
 * Returns: { status, token, role, company_id, modules }
 */
export async function companyLogin(req, res) {
  try {
    const { company_code, username, password } = req.body;

    if (!company_code || !username || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Company code, username, and password are required'
      });
    }

    // Fetch company
    const companyResult = await pool.query(
      'SELECT id, company_code, name, password_hash, is_active FROM companies WHERE company_code = $1 AND username = $2',
      [company_code, username]
    );

    if (companyResult.rows.length === 0) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid company code, username, or password'
      });
    }

    const company = companyResult.rows[0];

    if (!company.is_active) {
      return res.status(403).json({
        status: 'error',
        message: 'Company is inactive'
      });
    }

    // Check license validity
    const licenseResult = await pool.query(
      `SELECT 
        is_active,
        remaining_days,
        CEIL(EXTRACT(EPOCH FROM (license_end_date - CURRENT_TIMESTAMP)) / 86400) as calculated_remaining_days
       FROM company_licenses 
       WHERE company_code = $1`,
      [company_code]
    );

    if (licenseResult.rows.length === 0) {
      return res.status(403).json({
        status: 'error',
        message: '❌ No license found for this company'
      });
    }

    const license = licenseResult.rows[0];
    if (!license.is_active || license.calculated_remaining_days <= 0) {
      return res.status(403).json({
        status: 'error',
        message: `❌ Company license has expired. Remaining days: ${Math.max(0, license.calculated_remaining_days)}`
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, company.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid company code, username, or password'
      });
    }

    // Get modules for this company
    const modulesResult = await pool.query(
      'SELECT module_name, is_enabled FROM company_modules WHERE company_id = $1',
      [company.id]
    );

    // Generate token with company_id
    const token = jwt.sign(
      {
        id: company.id,
        company_code: company.company_code,
        company_name: company.name,
        role: 'company_admin'
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      status: 'success',
      message: 'Company login successful',
      token,
      role: 'company_admin',
      company_id: company.id,
      company_name: company.name,
      modules: modulesResult.rows
    });
  } catch (error) {
    console.error('Company login error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}

/**
 * Get Company Modules
 * GET /company/modules
 * Auth: Company admin token required
 * Returns: { status, message, modules }
 */
export async function getCompanyModules(req, res) {
  try {
    const companyId = req.user.id;

    const result = await pool.query(
      'SELECT module_name, is_enabled FROM company_modules WHERE company_id = $1 ORDER BY module_name',
      [companyId]
    );

    return res.status(200).json({
      status: 'success',
      message: 'Modules retrieved successfully',
      modules: result.rows
    });
  } catch (error) {
    console.error('Get modules error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}

/**
 * Toggle Module
 * PUT /company/modules/:moduleName
 * Auth: Company admin token required
 * Body: { is_enabled }
 * Returns: { status, message, data }
 */
export async function toggleModule(req, res) {
  try {
    const companyId = req.user.id;
    const { moduleName } = req.params;
    const { is_enabled } = req.body;

    if (is_enabled === undefined) {
      return res.status(400).json({
        status: 'error',
        message: 'is_enabled field is required'
      });
    }

    const result = await pool.query(
      'UPDATE company_modules SET is_enabled = $1 WHERE company_id = $2 AND module_name = $3 RETURNING module_name, is_enabled',
      [is_enabled, companyId, moduleName]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Module not found'
      });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Module updated successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Toggle module error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}

/**
 * Get Company Info
 * GET /company/info
 * Auth: Company admin token required
 * Returns: { status, message, data }
 */
export async function getCompanyInfo(req, res) {
  try {
    const companyId = req.user.id;

    const companyResult = await pool.query(
      'SELECT id, company_code, name, employee_limit, is_active FROM companies WHERE id = $1',
      [companyId]
    );

    if (companyResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Company not found'
      });
    }

    const company = companyResult.rows[0];

    // Get employee count
    const employeeResult = await pool.query(
      'SELECT COUNT(*) as count FROM users WHERE company_id = $1',
      [companyId]
    );

    const employeeCount = parseInt(employeeResult.rows[0].count, 10);

    // Get modules
    const modulesResult = await pool.query(
      'SELECT module_name, is_enabled FROM company_modules WHERE company_id = $1',
      [companyId]
    );

    return res.status(200).json({
      status: 'success',
      message: 'Company info retrieved successfully',
      data: {
        ...company,
        employee_count: employeeCount,
        employee_limit: company.employee_limit,
        modules: modulesResult.rows
      }
    });
  } catch (error) {
    console.error('Get company info error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}

/**
 * Get Company Employees
 * GET /company/employees
 * Auth: Company admin token required
 * Returns: { status, message, employees }
 */
export async function getCompanyEmployees(req, res) {
  try {
    const companyId = req.user.id;

    const result = await pool.query(
      'SELECT id, email, phone, full_name as fullName, designation, role, created_at FROM users WHERE company_id = $1 ORDER BY full_name',
      [companyId]
    );

    return res.status(200).json({
      status: 'success',
      message: 'Employees retrieved successfully',
      employees: result.rows || []
    });
  } catch (error) {
    console.error('Get company employees error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}

/**
 * Create Company Employee
 * POST /company/employees
 * Auth: Company admin token required
 * Body: { email, phone, fullName, designation, password, role }
 * Returns: { status, message, employee }
 */
export async function createCompanyEmployee(req, res) {
  try {
    const companyId = req.user.id;
    const { email, phone, fullName, designation, role = 'employee', password } = req.body;

    if (!email && !phone) {
      return res.status(400).json({
        status: 'error',
        message: 'Email or phone is required'
      });
    }

    // Check company employee limit
    const countResult = await pool.query(
      'SELECT employee_limit FROM companies WHERE id = $1',
      [companyId]
    );

    if (countResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Company not found'
      });
    }

    const company = countResult.rows[0];
    const employeeCountResult = await pool.query(
      'SELECT COUNT(*) FROM users WHERE company_id = $1',
      [companyId]
    );

    const currentCount = parseInt(employeeCountResult.rows[0].count, 10);
    if (currentCount >= company.employee_limit) {
      return res.status(400).json({
        status: 'error',
        message: `Employee limit (${company.employee_limit}) reached`
      });
    }

    const emailLower = email ? email.toLowerCase() : null;
    const phoneLower = phone ? phone.toLowerCase() : null;

    const passwordHash = password 
      ? await bcrypt.hash(password, 8) 
      : await bcrypt.hash(Math.random().toString(36).substring(2, 15), 8);

    const result = await pool.query(
      'INSERT INTO users (company_id, email, phone, full_name, password_hash, role) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email, phone, full_name, role, created_at',
      [companyId, emailLower, phoneLower, fullName, passwordHash, role]
    );

    const employee = result.rows[0];

    if (designation) {
      await pool.query(
        'INSERT INTO employee_profiles (user_id, designation) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET designation = EXCLUDED.designation, updated_at = now()',
        [employee.id, designation]
      );
    }

    return res.status(201).json({
      status: 'success',
      message: 'Employee created successfully',
      employee
    });
  } catch (error) {
    console.error('Create company employee error:', error);
    if (error.code === '23505') {
      return res.status(400).json({
        status: 'error',
        message: 'Email or phone already exists'
      });
    }
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}

/**
 * Update Employee Attendance Mode
 * PUT /company/employees/:employeeId/attendance-mode
 * Auth: Company admin token required
 * Body: { attendanceMode }
 * Returns: { status, message }
 */
export async function updateCompanyEmployeeAttendanceMode(req, res) {
  try {
    const companyId = req.user.id;
    const { employeeId } = req.params;
    const { attendanceMode } = req.body;

    if (!attendanceMode) {
      return res.status(400).json({
        status: 'error',
        message: 'attendanceMode is required'
      });
    }

    // Verify employee belongs to company
    const employeeResult = await pool.query(
      'SELECT id FROM users WHERE id = $1 AND company_id = $2',
      [employeeId, companyId]
    );

    if (employeeResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Employee not found'
      });
    }

    await pool.query(
      'UPDATE users SET attendance_mode = $1 WHERE id = $2',
      [attendanceMode, employeeId]
    );

    return res.status(200).json({
      status: 'success',
      message: 'Attendance mode updated successfully'
    });
  } catch (error) {
    console.error('Update attendance mode error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}

/**
 * Change Company Password (Company changes their own password)
 * POST /company/change-password
 * Auth: Company admin token required
 * Body: { currentPassword, newPassword }
 * Returns: { status, message }
 */
export async function changeCompanyPassword(req, res) {
  try {
    const companyId = req.user.id;
    const { currentPassword, newPassword } = req.body;

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

    // Fetch company from database
    const result = await pool.query(
      'SELECT id, company_code, name, password_hash FROM companies WHERE id = $1',
      [companyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Company not found'
      });
    }

    const company = result.rows[0];

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, company.password_hash);
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
      'UPDATE companies SET password_hash = $1 WHERE id = $2',
      [newPasswordHash, companyId]
    );

    return res.status(200).json({
      status: 'success',
      message: 'Password changed successfully'
    });
  } catch (error) {
    console.error('Change company password error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}

/**
 * Reset Company Employee Password
 * POST /company/employees/:employeeId/reset-password
 * Auth: Company admin token required
 * Body: { newPassword }
 * Returns: { status, message }
 */
export async function resetCompanyEmployeePassword(req, res) {
  try {
    const companyId = req.user.id;
    const { employeeId } = req.params;
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({
        status: 'error',
        message: 'newPassword is required'
      });
    }

    // Verify employee belongs to company
    const employeeResult = await pool.query(
      'SELECT id FROM users WHERE id = $1 AND company_id = $2',
      [employeeId, companyId]
    );

    if (employeeResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Employee not found'
      });
    }

    const passwordHash = await bcrypt.hash(newPassword, 8);

    await pool.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [passwordHash, employeeId]
    );

    return res.status(200).json({
      status: 'success',
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}
