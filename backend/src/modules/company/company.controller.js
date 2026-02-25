import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../../db/pool.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

/**
 * Company Login
 * POST /company/login
 * Body: { company_code, username, password }
 * Returns: { status, token, role, company_id, modules, branch_id, branch_name }
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
      'SELECT id, company_code, name, username, password_hash, is_active FROM companies WHERE company_code = $1',
      [company_code]
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

    let branch = null;
    let user = null;
    let authRole = 'company_admin';

    if (company.username === username) {
      const isPasswordValid = await bcrypt.compare(password, company.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({
          status: 'error',
          message: 'Invalid company code, username, or password'
        });
      }
    } else {
      const userResult = await pool.query(
        `SELECT id, branch_id, role, password_hash, full_name, email, phone, employee_code
         FROM users
         WHERE company_id = $1
           AND (email = $2 OR phone = $2 OR employee_code = $2)
         LIMIT 1`,
        [company.id, username]
      );

      if (userResult.rows.length === 0) {
        return res.status(401).json({
          status: 'error',
          message: 'Invalid company code, username, or password'
        });
      }

      user = userResult.rows[0];

      if (!['branch_manager', 'manager'].includes(user.role)) {
        return res.status(403).json({
          status: 'error',
          message: 'Only branch managers can use company login'
        });
      }

      const isUserPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isUserPasswordValid) {
        return res.status(401).json({
          status: 'error',
          message: 'Invalid company code, username, or password'
        });
      }

      authRole = user.role === 'manager' ? 'branch_manager' : user.role;

      if (!user.branch_id) {
        return res.status(400).json({
          status: 'error',
          message: 'User is not assigned to any branch'
        });
      }

      const branchResult = await pool.query(
        'SELECT id, name, is_active FROM branches WHERE id = $1 AND company_id = $2',
        [user.branch_id, company.id]
      );

      if (branchResult.rows.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'Branch not found'
        });
      }

      branch = branchResult.rows[0];
      if (!branch.is_active) {
        return res.status(400).json({
          status: 'error',
          message: 'Branch is inactive'
        });
      }
    }

    const modulesResult = await pool.query(
      'SELECT module_name, is_enabled FROM company_modules WHERE company_id = $1',
      [company.id]
    );

    let modules = modulesResult.rows;

    if (authRole === 'branch_manager' && user?.id) {
      const managerModulesResult = await pool.query(
        'SELECT module_name, is_enabled, can_view, can_modify, can_update FROM branch_manager_modules WHERE manager_user_id = $1 ORDER BY module_name',
        [user.id]
      );
      modules = managerModulesResult.rows;
    }

    const tokenPayload = {
      id: company.id,
      company_id: company.id,
      company_code: company.company_code,
      company_name: company.name,
      role: authRole,
      branch_id: branch?.id || null,
      branch_name: branch?.name || null,
      user_id: user?.id || null,
      sub: username
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

    return res.status(200).json({
      status: 'success',
      message: 'Company login successful',
      token,
      role: authRole,
      company_id: company.id,
      company_name: company.name,
      modules,
      branch_id: branch?.id || null,
      branch_name: branch?.name || null
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
 * Public Company Branches
 * GET /company/public/branches?company_code=XYZ
 * Returns: { status, message, branches }
 */
export async function getPublicCompanyBranches(req, res) {
  try {
    const { company_code } = req.query;

    if (!company_code) {
      return res.status(400).json({
        status: 'error',
        message: 'company_code is required'
      });
    }

    const companyResult = await pool.query(
      'SELECT id, is_active FROM companies WHERE company_code = $1',
      [company_code]
    );

    if (companyResult.rows.length === 0 || !companyResult.rows[0].is_active) {
      return res.status(404).json({
        status: 'error',
        message: 'Company not found or inactive'
      });
    }

    const branchesResult = await pool.query(
      'SELECT id, name FROM branches WHERE company_id = $1 AND is_active = TRUE ORDER BY name',
      [companyResult.rows[0].id]
    );

    return res.status(200).json({
      status: 'success',
      message: 'Branches retrieved successfully',
      branches: branchesResult.rows
    });
  } catch (error) {
    console.error('Get public branches error:', error);
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
      'SELECT id, company_code, name, employee_limit, branch_limit, is_active FROM companies WHERE id = $1',
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

    // Get branches
    const branchesResult = await pool.query(
      `SELECT b.id, b.name, b.employee_limit, b.is_active,
              (SELECT COUNT(*) FROM users u WHERE u.branch_id = b.id) as employee_count
       FROM branches b
       WHERE b.company_id = $1
       ORDER BY b.created_at`,
      [companyId]
    );

    return res.status(200).json({
      status: 'success',
      message: 'Company info retrieved successfully',
      data: {
        ...company,
        employee_count: employeeCount,
        employee_limit: company.employee_limit,
        branch_count: branchesResult.rows.length,
        branch_limit: company.branch_limit,
        branches: branchesResult.rows,
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
           `SELECT u.id, u.email, u.phone, u.full_name as "fullName", u.designation, u.role, u.branch_id,
            b.name as branch_name, u.created_at, u.attendance_mode, u.employee_code
       FROM users u
       LEFT JOIN branches b ON u.branch_id = b.id
       WHERE u.company_id = $1
       ORDER BY u.full_name`,
      [companyId]
    );

    // Get module access for each employee
    const employees = await Promise.all(
      result.rows.map(async (employee) => {
        const accessResult = await pool.query(
          'SELECT module_name, access_level, is_enabled FROM employee_module_access WHERE employee_id = $1',
          [employee.id]
        );
        return {
          ...employee,
          module_access: accessResult.rows
        };
      })
    );

    return res.status(200).json({
      status: 'success',
      message: 'Employees retrieved successfully',
      employees: employees
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
    const { email, phone, fullName, designation, role = 'employee', password, branchId } = req.body;

    if (!email && !phone) {
      return res.status(400).json({
        status: 'error',
        message: 'Email or phone is required'
      });
    }

    if (!branchId) {
      return res.status(400).json({
        status: 'error',
        message: 'branchId is required'
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

    const branchResult = await pool.query(
      'SELECT id, employee_limit, is_active FROM branches WHERE id = $1 AND company_id = $2',
      [branchId, companyId]
    );

    if (branchResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Branch not found'
      });
    }

    const branch = branchResult.rows[0];
    if (!branch.is_active) {
      return res.status(400).json({
        status: 'error',
        message: 'Branch is inactive'
      });
    }

    if (branch.employee_limit <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Branch employee limit is not set'
      });
    }

    const branchCountResult = await pool.query(
      'SELECT COUNT(*) FROM users WHERE branch_id = $1',
      [branchId]
    );

    const branchCount = parseInt(branchCountResult.rows[0].count, 10);
    if (branchCount >= branch.employee_limit) {
      return res.status(400).json({
        status: 'error',
        message: `Branch employee limit (${branch.employee_limit}) reached`
      });
    }

    // Generate employee code
    const employeeCodeResult = await pool.query(
      'SELECT generate_employee_code($1::UUID) as employee_code',
      [companyId]
    );
    const employeeCode = employeeCodeResult.rows[0].employee_code;
    
    const result = await pool.query(
        'INSERT INTO users (company_id, branch_id, email, phone, full_name, designation, password_hash, role, employee_code) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, email, phone, full_name, designation, role, branch_id, employee_code, created_at',
        [companyId, branchId, emailLower, phoneLower, fullName, designation, passwordHash, role, employeeCode]
    );

    const employee = result.rows[0];

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
 * Update Company Employee
 * PUT /company/employees/:employeeId
 * Auth: Company admin token required
 * Body: { email, phone, fullName, designation, role, branchId }
 * Returns: { status, message, employee }
 */
export async function updateCompanyEmployee(req, res) {
  try {
    const companyId = req.user.id;
    const { employeeId } = req.params;
    const { email, phone, fullName, designation, role, branchId } = req.body;

    const employeeResult = await pool.query(
      'SELECT id, branch_id FROM users WHERE id = $1 AND company_id = $2',
      [employeeId, companyId]
    );

    if (employeeResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Employee not found'
      });
    }

    let newBranchId = branchId || employeeResult.rows[0].branch_id;

    if (branchId) {
      const branchResult = await pool.query(
        'SELECT id, employee_limit, is_active FROM branches WHERE id = $1 AND company_id = $2',
        [branchId, companyId]
      );

      if (branchResult.rows.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'Branch not found'
        });
      }

      const branch = branchResult.rows[0];
      if (!branch.is_active) {
        return res.status(400).json({
          status: 'error',
          message: 'Branch is inactive'
        });
      }

      if (branch.employee_limit <= 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Branch employee limit is not set'
        });
      }

      const branchCountResult = await pool.query(
        'SELECT COUNT(*) FROM users WHERE branch_id = $1 AND id <> $2',
        [branchId, employeeId]
      );

      const branchCount = parseInt(branchCountResult.rows[0].count, 10);
      if (branchCount >= branch.employee_limit) {
        return res.status(400).json({
          status: 'error',
          message: `Branch employee limit (${branch.employee_limit}) reached`
        });
      }

      newBranchId = branchId;
    }

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      values.push(email ? email.toLowerCase() : null);
    }

    if (phone !== undefined) {
      updates.push(`phone = $${paramIndex++}`);
      values.push(phone ? phone.toLowerCase() : null);
    }

    if (fullName !== undefined) {
      updates.push(`full_name = $${paramIndex++}`);
      values.push(fullName);
    }

    if (designation !== undefined) {
      updates.push(`designation = $${paramIndex++}`);
      values.push(designation);
    }

    if (role !== undefined) {
      updates.push(`role = $${paramIndex++}`);
      values.push(role);
    }

    if (newBranchId !== undefined) {
      updates.push(`branch_id = $${paramIndex++}`);
      values.push(newBranchId);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'No fields to update'
      });
    }

    values.push(employeeId, companyId);

    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramIndex++} AND company_id = $${paramIndex} RETURNING id, email, phone, full_name, designation, role, branch_id, employee_code, created_at`,
      values
    );

    return res.status(200).json({
      status: 'success',
      message: 'Employee updated successfully',
      employee: result.rows[0]
    });
  } catch (error) {
    console.error('Update company employee error:', error);
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
 * Delete Company Employee
 * DELETE /company/employees/:employeeId
 * Auth: Company admin token required
 * Returns: { status, message }
 */
export async function deleteCompanyEmployee(req, res) {
  try {
    const companyId = req.user.id;
    const { employeeId } = req.params;

    if (!employeeId) {
      return res.status(400).json({
        status: 'error',
        message: 'employeeId is required'
      });
    }

    // Verify employee belongs to company
    const employeeResult = await pool.query(
      'SELECT id, email, full_name FROM users WHERE id = $1 AND company_id = $2',
      [employeeId, companyId]
    );

    if (employeeResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Employee not found'
      });
    }

    const employee = employeeResult.rows[0];

    // Delete employee
    await pool.query(
      'DELETE FROM users WHERE id = $1 AND company_id = $2',
      [employeeId, companyId]
    );

    return res.status(200).json({
      status: 'success',
      message: `Employee ${employee.full_name} deleted successfully`
    });
  } catch (error) {
    console.error('Delete employee error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}

/**
 * Get Company Branches
 * GET /company/branches
 * Auth: Company admin token required
 * Returns: { status, message, branches }
 */
export async function getCompanyBranches(req, res) {
  try {
    const companyId = req.user.id;
    const userRole = req.user.role;
    const userBranchId = req.user.branch_id;

    const values = [companyId];
    let branchFilter = '';

    if (userRole === 'branch_manager' && userBranchId) {
      values.push(userBranchId);
      branchFilter = 'AND b.id = $2';
    }

    const result = await pool.query(
      `SELECT b.id, b.name, b.employee_limit, b.is_active, b.created_at,
              (SELECT COUNT(*) FROM users u WHERE u.branch_id = b.id) as employee_count
       FROM branches b
       WHERE b.company_id = $1 ${branchFilter}
       ORDER BY b.created_at`,
      values
    );

    return res.status(200).json({
      status: 'success',
      message: 'Branches retrieved successfully',
      branches: result.rows || []
    });
  } catch (error) {
    console.error('Get company branches error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}

/**
 * Create Company Branch
 * POST /company/branches
 * Auth: Company admin token required
 * Body: { name, employee_limit }
 * Returns: { status, message, branch }
 */
export async function createCompanyBranch(req, res) {
  try {
    const companyId = req.user.id;
    const { name, employee_limit } = req.body;

    if (!name) {
      return res.status(400).json({
        status: 'error',
        message: 'name is required'
      });
    }

    if (!Number.isInteger(employee_limit) || employee_limit < 1) {
      return res.status(400).json({
        status: 'error',
        message: 'employee_limit must be an integer of at least 1'
      });
    }

    const companyResult = await pool.query(
      'SELECT employee_limit, branch_limit FROM companies WHERE id = $1',
      [companyId]
    );

    if (companyResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Company not found'
      });
    }

    const company = companyResult.rows[0];

    const branchCountResult = await pool.query(
      'SELECT COUNT(*) FROM branches WHERE company_id = $1',
      [companyId]
    );

    const branchCount = parseInt(branchCountResult.rows[0].count, 10);
    if (branchCount >= company.branch_limit) {
      return res.status(400).json({
        status: 'error',
        message: `Branch limit (${company.branch_limit}) reached`
      });
    }

    const totalAllocatedResult = await pool.query(
      'SELECT COALESCE(SUM(employee_limit), 0) as total FROM branches WHERE company_id = $1',
      [companyId]
    );

    const allocated = parseInt(totalAllocatedResult.rows[0].total, 10);
    if (allocated + employee_limit > company.employee_limit) {
      return res.status(400).json({
        status: 'error',
        message: 'Total branch employee limits exceed company employee limit'
      });
    }

    const result = await pool.query(
      'INSERT INTO branches (company_id, name, employee_limit) VALUES ($1, $2, $3) RETURNING id, name, employee_limit, is_active, created_at',
      [companyId, name.trim(), employee_limit]
    );

    return res.status(201).json({
      status: 'success',
      message: 'Branch created successfully',
      branch: result.rows[0]
    });
  } catch (error) {
    console.error('Create company branch error:', error);
    if (error.code === '23505') {
      return res.status(400).json({
        status: 'error',
        message: 'Branch name already exists'
      });
    }
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}

/**
 * Update Company Branch
 * PUT /company/branches/:branchId
 * Auth: Company admin token required
 * Body: { name, employee_limit, is_active }
 * Returns: { status, message, branch }
 */
export async function updateCompanyBranch(req, res) {
  try {
    const companyId = req.user.id;
    const { branchId } = req.params;
    const { name, employee_limit, is_active } = req.body;

    const updates = [];
    const values = [branchId, companyId];
    let paramIndex = 3;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      values.push(name.trim());
      paramIndex++;
    }

    if (employee_limit !== undefined) {
      if (!Number.isInteger(employee_limit) || employee_limit < 1) {
        return res.status(400).json({
          status: 'error',
          message: 'employee_limit must be an integer of at least 1'
        });
      }

      const companyResult = await pool.query(
        'SELECT employee_limit FROM companies WHERE id = $1',
        [companyId]
      );

      if (companyResult.rows.length === 0) {
        return res.status(404).json({
          status: 'error',
          message: 'Company not found'
        });
      }

      const allocatedResult = await pool.query(
        'SELECT COALESCE(SUM(employee_limit), 0) as total FROM branches WHERE company_id = $1 AND id <> $2',
        [companyId, branchId]
      );

      const allocated = parseInt(allocatedResult.rows[0].total, 10);
      if (allocated + employee_limit > companyResult.rows[0].employee_limit) {
        return res.status(400).json({
          status: 'error',
          message: 'Total branch employee limits exceed company employee limit'
        });
      }

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

    updates.push('updated_at = now()');

    const result = await pool.query(
      `UPDATE branches SET ${updates.join(', ')} WHERE id = $1 AND company_id = $2 RETURNING id, name, employee_limit, is_active, created_at`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Branch not found'
      });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Branch updated successfully',
      branch: result.rows[0]
    });
  } catch (error) {
    console.error('Update company branch error:', error);
    if (error.code === '23505') {
      return res.status(400).json({
        status: 'error',
        message: 'Branch name already exists'
      });
    }
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}

/**
 * Get all employees in a branch (excluding managers)
 * GET /company/branches/:branchId/employees
 * Auth: Company admin or branch manager token required
 * Returns: { status, message, employees }
 */
export async function getBranchEmployees(req, res) {
  try {
    const { branchId } = req.params;
    const companyId = req.user.id;
    const userRole = req.user.role;
    const userBranchId = req.user.branch_id;

    const branchResult = await pool.query(
      'SELECT id FROM branches WHERE id = $1 AND company_id = $2',
      [branchId, companyId]
    );

    if (branchResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Branch not found'
      });
    }

    if (userRole === 'branch_manager' && userBranchId !== branchId) {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden'
      });
    }

    const result = await pool.query(
      `SELECT u.id, u.email, u.phone, u.full_name as "fullName", u.designation, u.role, u.branch_id, u.created_at
       FROM users u
       WHERE u.company_id = $1 AND u.branch_id = $2 AND u.role != 'branch_manager'
       ORDER BY u.full_name`,
      [companyId, branchId]
    );

    return res.status(200).json({
      status: 'success',
      message: 'Branch employees retrieved successfully',
      employees: result.rows || []
    });
  } catch (error) {
    console.error('Get branch employees error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}

/**
 * Get branch employees for UI pickers (minimal data)
 * GET /company/branches/:branchId/employees/list
 * Auth: Company admin or branch manager token required
 * Returns: { status, message, employees } - for UI dropdowns
 */
export async function getBranchEmployeesList(req, res) {
  try {
    const { branchId } = req.params;
    const companyId = req.user.id;
    const userRole = req.user.role;
    const userBranchId = req.user.branch_id;

    const branchResult = await pool.query(
      'SELECT id FROM branches WHERE id = $1 AND company_id = $2',
      [branchId, companyId]
    );

    if (branchResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Branch not found'
      });
    }

    if (userRole === 'branch_manager' && userBranchId !== branchId) {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden'
      });
    }

    const result = await pool.query(
      `SELECT u.id, u.full_name as "fullName", u.email
       FROM users u
       WHERE u.company_id = $1 AND u.branch_id = $2 AND u.role = 'employee'
       ORDER BY u.full_name`,
      [companyId, branchId]
    );

    return res.status(200).json({
      status: 'success',
      message: 'Branch employees retrieved successfully',
      employees: result.rows || []
    });
  } catch (error) {
    console.error('Get branch employees list error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}

/**
 * Get Branch Managers
 * GET /company/branches/:branchId/managers
 * Auth: Company admin token required
 * Returns: { status, message, managers }
 */
export async function getBranchManagers(req, res) {
  try {
    const companyId = req.user.id;
    const { branchId } = req.params;

    const branchResult = await pool.query(
      'SELECT id FROM branches WHERE id = $1 AND company_id = $2',
      [branchId, companyId]
    );

    if (branchResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Branch not found'
      });
    }

    const managersResult = await pool.query(
      `SELECT u.id, u.email, u.phone, u.full_name as "fullName", u.role, u.created_at
       FROM users u
       WHERE u.company_id = $1 AND u.branch_id = $2 AND u.role = 'branch_manager'
       ORDER BY u.full_name`,
      [companyId, branchId]
    );

    const managerIds = managersResult.rows.map((manager) => manager.id);
    let modulesByManager = {};
    if (managerIds.length > 0) {
      const modulesResult = await pool.query(
        `SELECT manager_user_id, module_name, is_enabled, can_view, can_modify, can_update
         FROM branch_manager_modules
         WHERE manager_user_id = ANY($1::uuid[])
         ORDER BY module_name`,
        [managerIds]
      );

      modulesByManager = modulesResult.rows.reduce((acc, row) => {
        if (!acc[row.manager_user_id]) acc[row.manager_user_id] = [];
        acc[row.manager_user_id].push({
          module_name: row.module_name,
          is_enabled: row.is_enabled,
          can_view: row.can_view,
          can_modify: row.can_modify,
          can_update: row.can_update
        });
        return acc;
      }, {});
    }

    const managers = managersResult.rows.map((manager) => ({
      ...manager,
      modules: modulesByManager[manager.id] || []
    }));

    return res.status(200).json({
      status: 'success',
      message: 'Branch managers retrieved successfully',
      managers
    });
  } catch (error) {
    console.error('Get branch managers error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}

/**
 * Create Branch Manager
 * POST /company/branches/:branchId/managers
 * Auth: Company admin token required
 * Body: { email, phone, fullName, password, modules }
 * Returns: { status, message, manager }
 */
export async function createBranchManager(req, res) {
  try {
    const companyId = req.user.id;
    const { branchId } = req.params;
    const { email, phone, fullName, password, modules = [] } = req.body;

    if (!email && !phone) {
      return res.status(400).json({
        status: 'error',
        message: 'Email or phone is required'
      });
    }

    if (!Array.isArray(modules)) {
      return res.status(400).json({
        status: 'error',
        message: 'modules must be an array'
      });
    }

    const branchResult = await pool.query(
      'SELECT id, employee_limit, is_active FROM branches WHERE id = $1 AND company_id = $2',
      [branchId, companyId]
    );

    if (branchResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Branch not found'
      });
    }

    const branch = branchResult.rows[0];
    if (!branch.is_active) {
      return res.status(400).json({
        status: 'error',
        message: 'Branch is inactive'
      });
    }

    if (branch.employee_limit <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Branch employee limit is not set'
      });
    }

    const branchCountResult = await pool.query(
      'SELECT COUNT(*) FROM users WHERE branch_id = $1',
      [branchId]
    );

    const branchCount = parseInt(branchCountResult.rows[0].count, 10);
    if (branchCount >= branch.employee_limit) {
      return res.status(400).json({
        status: 'error',
        message: `Branch employee limit (${branch.employee_limit}) reached`
      });
    }

    const emailLower = email ? email.toLowerCase() : null;
    const phoneLower = phone ? phone.toLowerCase() : null;
    const passwordHash = password
      ? await bcrypt.hash(password, 8)
      : await bcrypt.hash(Math.random().toString(36).substring(2, 15), 8);

    const enabledModulesResult = await pool.query(
      'SELECT module_name FROM company_modules WHERE company_id = $1 AND is_enabled = TRUE',
      [companyId]
    );

    const enabledModules = new Set(enabledModulesResult.rows.map((row) => row.module_name));
    const invalidModules = modules.filter((moduleName) => !enabledModules.has(moduleName));
    if (invalidModules.length > 0) {
      return res.status(400).json({
        status: 'error',
        message: `Invalid or disabled modules: ${invalidModules.join(', ')}`
      });
    }

    // Generate employee code for branch manager
    const employeeCodeResult = await pool.query(
      'SELECT generate_employee_code($1::UUID) as employee_code',
      [companyId]
    );
    const employeeCode = employeeCodeResult.rows[0].employee_code;
    
    const result = await pool.query(
      'INSERT INTO users (company_id, branch_id, email, phone, full_name, password_hash, role, employee_code) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, email, phone, full_name, role, branch_id, employee_code, created_at',
      [companyId, branchId, emailLower, phoneLower, fullName, passwordHash, 'branch_manager', employeeCode]
    );

    const manager = result.rows[0];

    if (modules.length > 0) {
      for (const moduleName of modules) {
        await pool.query(
          'INSERT INTO branch_manager_modules (branch_id, manager_user_id, module_name, is_enabled) VALUES ($1, $2, $3, $4)',
          [branchId, manager.id, moduleName, true]
        );
      }
    }

    return res.status(201).json({
      status: 'success',
      message: 'Branch manager created successfully',
      manager: {
        ...manager,
        modules: modules.map((moduleName) => ({ module_name: moduleName, is_enabled: true }))
      }
    });
  } catch (error) {
    console.error('Create branch manager error:', error);
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

/**
 * Get Branch Attendance Summary
 * GET /company/branches/:branchId/reports/attendance
 * Auth: Company admin or branch manager token required
 * Returns: { status, message, summary }
 */
export async function getBranchAttendanceSummary(req, res) {
  try {
    const { branchId } = req.params;
    const companyId = req.user.id;
    const userRole = req.user.role;
    const userBranchId = req.user.branch_id;

    const branchResult = await pool.query(
      'SELECT id FROM branches WHERE id = $1 AND company_id = $2',
      [branchId, companyId]
    );

    if (branchResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Branch not found'
      });
    }

    if (userRole === 'branch_manager' && userBranchId !== branchId) {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden'
      });
    }

    const dateParam = req.query.date || new Date().toISOString().split('T')[0];

    const result = await pool.query(
      `SELECT 
        COUNT(DISTINCT CASE WHEN status = 'present' THEN user_id END) as presentCount,
        COUNT(DISTINCT CASE WHEN status = 'absent' THEN user_id END) as absentCount,
        COUNT(DISTINCT CASE WHEN status = 'leave' THEN user_id END) as leaveCount,
        COUNT(DISTINCT user_id) as totalEmployees
       FROM attendance
       WHERE company_id = $1 AND date = $2
       AND user_id IN (SELECT id FROM users WHERE branch_id = $3 AND role = 'employee')`,
      [companyId, dateParam, branchId]
    );

    const summary = result.rows[0] || {
      presentcount: 0,
      absentcount: 0,
      leavecount: 0,
      totalemployees: 0
    };

    return res.status(200).json({
      status: 'success',
      message: 'Attendance summary retrieved successfully',
      summary: {
        date: dateParam,
        present: parseInt(summary.presentcount) || 0,
        absent: parseInt(summary.absentcount) || 0,
        leave: parseInt(summary.leavecount) || 0,
        total: parseInt(summary.totalemployees) || 0
      }
    });
  } catch (error) {
    console.error('Get branch attendance summary error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}

/**
 * Get Branch Leave Summary
 * GET /company/branches/:branchId/reports/leave
 * Auth: Company admin or branch manager token required
 * Returns: { status, message, summary }
 */
export async function getBranchLeaveSummary(req, res) {
  try {
    const { branchId } = req.params;
    const companyId = req.user.id;
    const userRole = req.user.role;
    const userBranchId = req.user.branch_id;

    const branchResult = await pool.query(
      'SELECT id FROM branches WHERE id = $1 AND company_id = $2',
      [branchId, companyId]
    );

    if (branchResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Branch not found'
      });
    }

    if (userRole === 'branch_manager' && userBranchId !== branchId) {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden'
      });
    }

    const result = await pool.query(
      `SELECT 
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendingCount,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approvedCount,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejectedCount,
        COUNT(*) as totalRequests
       FROM leave_requests
       WHERE company_id = $1 AND user_id IN (
         SELECT id FROM users WHERE branch_id = $2 AND role = 'employee'
       )`,
      [companyId, branchId]
    );

    const summary = result.rows[0] || {
      pendingcount: 0,
      approvedcount: 0,
      rejectedcount: 0,
      totalrequests: 0
    };

    return res.status(200).json({
      status: 'success',
      message: 'Leave summary retrieved successfully',
      summary: {
        pending: parseInt(summary.pendingcount) || 0,
        approved: parseInt(summary.approvedcount) || 0,
        rejected: parseInt(summary.rejectedcount) || 0,
        total: parseInt(summary.totalrequests) || 0
      }
    });
  } catch (error) {
    console.error('Get branch leave summary error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}

/**
 * Get Branch Employee Summary
 * GET /company/branches/:branchId/reports/employees
 * Auth: Company admin or branch manager token required
 * Returns: { status, message, summary }
 */
export async function getBranchEmployeeSummary(req, res) {
  try {
    const { branchId } = req.params;
    const companyId = req.user.id;
    const userRole = req.user.role;
    const userBranchId = req.user.branch_id;

    const branchResult = await pool.query(
      'SELECT id, employee_limit FROM branches WHERE id = $1 AND company_id = $2',
      [branchId, companyId]
    );

    if (branchResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Branch not found'
      });
    }

    if (userRole === 'branch_manager' && userBranchId !== branchId) {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden'
      });
    }

    const branch = branchResult.rows[0];

    const result = await pool.query(
      `SELECT 
        role,
        COUNT(*) as count
       FROM users
       WHERE company_id = $1 AND branch_id = $2
       GROUP BY role`,
      [companyId, branchId]
    );

    const roleCounts = {};
    let totalEmployees = 0;

    result.rows.forEach(row => {
      roleCounts[row.role] = row.count;
      if (row.role === 'employee') {
        totalEmployees = row.count;
      }
    });

    return res.status(200).json({
      status: 'success',
      message: 'Employee summary retrieved successfully',
      summary: {
        totalEmployees: totalEmployees,
        employeeLimit: branch.employee_limit,
        utilisationPercentage: branch.employee_limit > 0 
          ? Math.round((totalEmployees / branch.employee_limit) * 100) 
          : 0,
        byRole: roleCounts
      }
    });
  } catch (error) {
    console.error('Get branch employee summary error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}

/**
 * Get Employee Module Access
 * GET /company/employees/:employeeId/modules
 * Auth: Company admin token required
 * Returns: { status, message, modules }
 */
export async function getEmployeeModuleAccess(req, res) {
  try {
    const companyId = req.user.id;
    const { employeeId } = req.params;

    // Verify employee belongs to company
    const employeeResult = await pool.query(
      'SELECT id, full_name FROM users WHERE id = $1 AND company_id = $2',
      [employeeId, companyId]
    );

    if (employeeResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Employee not found'
      });
    }

    // Get employee's module access
    const result = await pool.query(
      'SELECT module_name, access_level, is_enabled FROM employee_module_access WHERE employee_id = $1',
      [employeeId]
    );

    return res.status(200).json({
      status: 'success',
      message: 'Employee module access retrieved successfully',
      employee: employeeResult.rows[0],
      modules: result.rows
    });
  } catch (error) {
    console.error('Get employee module access error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}

/**
 * Set Employee Module Access
 * POST /company/employees/:employeeId/modules
 * Auth: Company admin token required
 * Body: { module_name, access_level ('view' or 'modify') }
 * Returns: { status, message, access }
 */
export async function setEmployeeModuleAccess(req, res) {
  try {
    const companyId = req.user.id;
    const { employeeId } = req.params;
    const { module_name, access_level } = req.body;

    if (!module_name || !access_level) {
      return res.status(400).json({
        status: 'error',
        message: 'module_name and access_level are required'
      });
    }

    if (!['view', 'modify'].includes(access_level)) {
      return res.status(400).json({
        status: 'error',
        message: 'access_level must be either "view" or "modify"'
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

    // Verify module is enabled for company
    const moduleResult = await pool.query(
      'SELECT is_enabled FROM company_modules WHERE company_id = $1 AND module_name = $2',
      [companyId, module_name]
    );

    if (moduleResult.rows.length === 0 || !moduleResult.rows[0].is_enabled) {
      return res.status(400).json({
        status: 'error',
        message: 'Module is not enabled for this company'
      });
    }

    // Insert or update employee module access
    const result = await pool.query(
      `INSERT INTO employee_module_access (employee_id, module_name, access_level, is_enabled)
       VALUES ($1, $2, $3, true)
       ON CONFLICT (employee_id, module_name)
       DO UPDATE SET access_level = $3, is_enabled = true, updated_at = now()
       RETURNING id, employee_id, module_name, access_level, is_enabled`,
      [employeeId, module_name, access_level]
    );

    return res.status(200).json({
      status: 'success',
      message: 'Employee module access set successfully',
      access: result.rows[0]
    });
  } catch (error) {
    console.error('Set employee module access error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}

/**
 * Remove Employee Module Access
 * DELETE /company/employees/:employeeId/modules/:moduleName
 * Auth: Company admin token required
 * Returns: { status, message }
 */
export async function removeEmployeeModuleAccess(req, res) {
  try {
    const companyId = req.user.id;
    const { employeeId, moduleName } = req.params;

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

    // Delete the module access
    await pool.query(
      'DELETE FROM employee_module_access WHERE employee_id = $1 AND module_name = $2',
      [employeeId, moduleName]
    );

    return res.status(200).json({
      status: 'success',
      message: 'Employee module access removed successfully'
    });
  } catch (error) {
    console.error('Remove employee module access error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}

/**
 * Update Employee Module Access (bulk update)
 * PUT /company/employees/:employeeId/modules
 * Auth: Company admin token required
 * Body: { modules: [{ module_name, access_level }] }
 * Returns: { status, message }
 */
export async function updateEmployeeModuleAccess(req, res) {
  try {
    const companyId = req.user.id;
    const { employeeId } = req.params;
    const { modules } = req.body;

    if (!Array.isArray(modules)) {
      return res.status(400).json({
        status: 'error',
        message: 'modules must be an array'
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

    // Get enabled company modules
    const companyModulesResult = await pool.query(
      'SELECT module_name FROM company_modules WHERE company_id = $1 AND is_enabled = true',
      [companyId]
    );
    const enabledModules = companyModulesResult.rows.map(r => r.module_name);

    // Delete existing module access
    await pool.query(
      'DELETE FROM employee_module_access WHERE employee_id = $1',
      [employeeId]
    );

    // Insert new module access
    const insertPromises = modules
      .filter(m => enabledModules.includes(m.module_name) && ['view', 'modify'].includes(m.access_level))
      .map(m => 
        pool.query(
          `INSERT INTO employee_module_access (employee_id, module_name, access_level, is_enabled)
           VALUES ($1, $2, $3, true)`,
          [employeeId, m.module_name, m.access_level]
        )
      );

    await Promise.all(insertPromises);

    return res.status(200).json({
      status: 'success',
      message: 'Employee module access updated successfully'
    });
  } catch (error) {
    console.error('Update employee module access error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}

/**
 * Get Branch Manager Module Permissions
 * GET /company/branches/:branchId/managers/:managerId/modules
 * Auth: Company admin token required
 * Returns: { status, message, modules }
 */
export async function getBranchManagerModulePermissions(req, res) {
  try {
    const companyId = req.user.id;
    const userRole = req.user.role;
    const userId = req.user.user_id; // For branch managers
    const userBranchId = req.user.branch_id; // Branch from token
    const { branchId, managerId } = req.params;

    console.log('=== getBranchManagerModulePermissions ===');
    console.log('User Info:', {
      userRole,
      userId,
      userBranchId,
      companyId
    });
    console.log('Request Params:', {
      branchId,
      managerId
    });

    // Authorization check
    if (userRole === 'branch_manager') {
      // For branch managers: must be requesting their own modules
      if (!userId) {
        console.error('ERROR: Branch manager token missing user_id');
        return res.status(403).json({
          status: 'error',
          message: 'Invalid token: missing user_id'
        });
      }
      
      const managerIdStr = String(managerId).trim();
      const userIdStr = String(userId).trim();
      const matches = managerIdStr === userIdStr;
      
      console.log('Manager Authorization:', {
        managerIdParam: managerIdStr,
        userIdFromToken: userIdStr,
        matches
      });
      
      if (!matches) {
        console.warn('DENIED: Manager attempting to access different manager module');
        return res.status(403).json({
          status: 'error',
          message: 'You can only access your own module permissions'
        });
      }
    } else if (userRole !== 'company_admin') {
      console.warn('Invalid role:', userRole);
      return res.status(403).json({
        status: 'error',
        message: 'Invalid user role'
      });
    }
    
    console.log('Authorization PASSED');

    // Verify branch exists and belongs to company
    const branchResult = await pool.query(
      'SELECT id FROM branches WHERE id = $1 AND company_id = $2',
      [branchId, companyId]
    );

    if (branchResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Branch not found'
      });
    }

    // Verify manager exists and belongs to branch
    const managerResult = await pool.query(
      `SELECT id, full_name FROM users 
       WHERE id = $1 AND branch_id = $2 AND role IN ('branch_manager', 'manager')`,
      [managerId, branchId]
    );

    if (managerResult.rows.length === 0) {
      console.warn('Manager not found or not a manager role:', { managerId, branchId });
      return res.status(404).json({
        status: 'error',
        message: 'Manager not found in this branch'
      });
    }

    // Get manager's module permissions
    const result = await pool.query(
      `SELECT module_name, is_enabled, can_view, can_modify, can_update
       FROM branch_manager_modules 
       WHERE manager_user_id = $1
       ORDER BY module_name`,
      [managerId]
    );

    console.log('Module permissions retrieved successfully for manager:', managerId, 'Modules count:', result.rows.length);

    return res.status(200).json({
      status: 'success',
      message: 'Module permissions retrieved successfully',
      manager: managerResult.rows[0],
      modules: result.rows || []
    });
  } catch (error) {
    console.error('Get manager module permissions error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}

/**
 * Get all branches accessible to a manager
 * GET /company/managers/:managerId/branches
 * Auth: Company admin or branch manager token required
 * Returns: { status, branches: [{ id, name, is_primary }] }
 */
export async function getManagerAccessibleBranches(req, res) {
  try {
    const userRole = req.user.role;
    const userId = req.user.user_id;
    const userBranchId = req.user.branch_id;
    const { managerId } = req.params;

    console.log('=== getManagerAccessibleBranches ===');
    console.log('User Info:', { userRole, userId, userBranchId });
    console.log('Request:', { managerId });

    // Authorization: branch managers can only fetch their own branches
    if (userRole === 'branch_manager') {
      const managerIdStr = String(managerId).trim();
      const userIdStr = String(userId).trim();
      if (managerIdStr !== userIdStr) {
        console.warn('Manager attempting to access different manager branches');
        return res.status(403).json({
          status: 'error',
          message: 'You can only access your own branches'
        });
      }
    } else if (userRole !== 'company_admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Invalid user role'
      });
    }

    // First check manager_branches table for explicit assignments
    let branchesResult = await pool.query(
      `SELECT 
        b.id, 
        b.name,
        b.is_active,
        mb.is_primary
       FROM branches b
       LEFT JOIN manager_branches mb ON b.id = mb.branch_id AND mb.manager_user_id = $1
       WHERE mb.manager_user_id = $1
       ORDER BY mb.is_primary DESC, b.name`,
      [managerId]
    );

    // If no manager_branches entries, fall back to the user's assigned branch
    if (branchesResult.rows.length === 0) {
      branchesResult = await pool.query(
        `SELECT 
          b.id, 
          b.name,
          b.is_active,
          TRUE as is_primary
         FROM branches b
         INNER JOIN users u ON u.branch_id = b.id
         WHERE u.id = $1 AND b.is_active = TRUE`,
        [managerId]
      );
    }

    console.log('Accessible branches found:', branchesResult.rows.length);

    return res.status(200).json({
      status: 'success',
      message: 'Accessible branches retrieved successfully',
      branches: branchesResult.rows || []
    });
  } catch (error) {
    console.error('Get manager accessible branches error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}

/**
 * Update Branch Manager Module Permission
 * PUT /company/branches/:branchId/managers/:managerId/modules/:moduleName
 * Auth: Company admin token required
 * Body: { can_view, can_modify, can_update }
 * Returns: { status, message, module }
 */
export async function updateBranchManagerModulePermission(req, res) {
  try {
    const companyId = req.user.id;
    const { branchId, managerId, moduleName } = req.params;
    const { can_view = true, can_modify = false, can_update = false } = req.body;

    // Verify branch exists
    const branchResult = await pool.query(
      'SELECT id FROM branches WHERE id = $1 AND company_id = $2',
      [branchId, companyId]
    );

    if (branchResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Branch not found'
      });
    }

    // Verify manager exists and belongs to branch
    const managerResult = await pool.query(
      'SELECT id FROM users WHERE id = $1 AND branch_id = $2 AND role = $3',
      [managerId, branchId, 'branch_manager']
    );

    if (managerResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Manager not found in this branch'
      });
    }

    // Check if module assignment exists
    const moduleResult = await pool.query(
      'SELECT id FROM branch_manager_modules WHERE manager_user_id = $1 AND module_name = $2',
      [managerId, moduleName]
    );

    if (moduleResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Module not assigned to this manager'
      });
    }

    // Update permissions
    const result = await pool.query(
      `UPDATE branch_manager_modules 
       SET can_view = $1, can_modify = $2, can_update = $3
       WHERE manager_user_id = $4 AND module_name = $5
       RETURNING module_name, is_enabled, can_view, can_modify, can_update`,
      [can_view, can_modify, can_update, managerId, moduleName]
    );

    return res.status(200).json({
      status: 'success',
      message: 'Module permission updated successfully',
      module: result.rows[0]
    });
  } catch (error) {
    console.error('Update manager module permission error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}

/**
 * Assign Module to Branch Manager
 * POST /company/branches/:branchId/managers/:managerId/modules
 * Auth: Company admin token required
 * Body: { module_name, can_view, can_modify, can_update }
 * Returns: { status, message, module }
 */
export async function assignModuleToBranchManager(req, res) {
  try {
    const companyId = req.user.id;
    const { branchId, managerId } = req.params;
    const { module_name, can_view = true, can_modify = false, can_update = false } = req.body;

    if (!module_name) {
      return res.status(400).json({
        status: 'error',
        message: 'module_name is required'
      });
    }

    // Verify branch exists
    const branchResult = await pool.query(
      'SELECT id FROM branches WHERE id = $1 AND company_id = $2',
      [branchId, companyId]
    );

    if (branchResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Branch not found'
      });
    }

    // Verify manager exists and belongs to branch
    const managerResult = await pool.query(
      'SELECT id FROM users WHERE id = $1 AND branch_id = $2 AND role = $3',
      [managerId, branchId, 'branch_manager']
    );

    if (managerResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Manager not found in this branch'
      });
    }

    // Verify module is enabled for company
    const moduleResult = await pool.query(
      'SELECT module_name FROM company_modules WHERE company_id = $1 AND module_name = $2 AND is_enabled = TRUE',
      [companyId, module_name]
    );

    if (moduleResult.rows.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Module is not enabled for this company'
      });
    }

    // Insert or update module assignment with permissions
    const result = await pool.query(
      `INSERT INTO branch_manager_modules (branch_id, manager_user_id, module_name, is_enabled, can_view, can_modify, can_update)
       VALUES ($1, $2, $3, true, $4, $5, $6)
       ON CONFLICT (manager_user_id, module_name)
       DO UPDATE SET is_enabled = true, can_view = $4, can_modify = $5, can_update = $6
       RETURNING module_name, is_enabled, can_view, can_modify, can_update`,
      [branchId, managerId, module_name, can_view, can_modify, can_update]
    );

    return res.status(201).json({
      status: 'success',
      message: 'Module assigned to manager successfully',
      module: result.rows[0]
    });
  } catch (error) {
    console.error('Assign module to manager error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}

/**
 * Remove Module from Branch Manager
 * DELETE /company/branches/:branchId/managers/:managerId/modules/:moduleName
 * Auth: Company admin token required
 * Returns: { status, message }
 */
export async function removeModuleFromBranchManager(req, res) {
  try {
    const companyId = req.user.id;
    const { branchId, managerId, moduleName } = req.params;

    // Verify branch exists
    const branchResult = await pool.query(
      'SELECT id FROM branches WHERE id = $1 AND company_id = $2',
      [branchId, companyId]
    );

    if (branchResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Branch not found'
      });
    }

    // Verify manager exists
    const managerResult = await pool.query(
      'SELECT id FROM users WHERE id = $1 AND branch_id = $2 AND role = $3',
      [managerId, branchId, 'branch_manager']
    );

    if (managerResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Manager not found in this branch'
      });
    }

    // Delete module assignment
    await pool.query(
      'DELETE FROM branch_manager_modules WHERE manager_user_id = $1 AND module_name = $2',
      [managerId, moduleName]
    );

    return res.status(200).json({
      status: 'success',
      message: 'Module removed from manager successfully'
    });
  } catch (error) {
    console.error('Remove module from manager error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}

/**
 * Get Branch Module Access
 * GET /company/branches/:branchId/modules
 * Auth: Company admin or branch manager token required
 * Returns: { status, message, modules }
 */
export async function getBranchModules(req, res) {
  try {
    const { branchId } = req.params;
    const userRole = req.user.role;
    
    let branchResult;
    
    if (userRole === 'company_admin') {
      const companyId = req.user.id;
      // Verify branch exists and belongs to company
      branchResult = await pool.query(
        'SELECT id, name, company_id FROM branches WHERE id = $1 AND company_id = $2',
        [branchId, companyId]
      );
    } else if (userRole === 'branch_manager') {
      // Verify branch exists and matches manager's branch
      branchResult = await pool.query(
        'SELECT id, name, company_id FROM branches WHERE id = $1',
        [branchId]
      );
      
      // Verify the branch manager belongs to this branch
      if (branchResult.rows.length > 0 && req.user.branch_id !== branchId) {
        return res.status(403).json({
          status: 'error',
          message: 'Access denied: You can only view modules for your own branch'
        });
      }
    }

    if (branchResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Branch not found'
      });
    }

    // Get branch module permissions
    const result = await pool.query(
      `SELECT module_name, can_view, can_edit, can_delete, is_enabled
       FROM branch_modules 
       WHERE branch_id = $1
       ORDER BY module_name`,
      [branchId]
    );

    return res.status(200).json({
      status: 'success',
      message: 'Branch modules retrieved successfully',
      branch: branchResult.rows[0],
      modules: result.rows || []
    });
  } catch (error) {
    console.error('Get branch modules error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}

/**
 * Set Branch Module Access (bulk update)
 * POST /company/branches/:branchId/modules
 * Auth: Company admin token required
 * Body: { modules: [{ module_name, can_view, can_edit, can_delete }] }
 * Returns: { status, message, modules }
 */
export async function setBranchModules(req, res) {
  try {
    const companyId = req.user.id;
    const { branchId } = req.params;
    const { modules } = req.body;

    if (!modules || !Array.isArray(modules)) {
      return res.status(400).json({
        status: 'error',
        message: 'modules array is required'
      });
    }

    // Verify branch exists and belongs to company
    const branchResult = await pool.query(
      'SELECT id FROM branches WHERE id = $1 AND company_id = $2',
      [branchId, companyId]
    );

    if (branchResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Branch not found'
      });
    }

    // Begin transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Delete existing modules for this branch
      await client.query('DELETE FROM branch_modules WHERE branch_id = $1', [branchId]);

      // Insert new modules
      const insertedModules = [];
      for (const module of modules) {
        const { module_name, can_view = false, can_edit = false, can_delete = false } = module;
        
        // Only insert if at least one permission is enabled
        if (can_view || can_edit || can_delete) {
          const result = await client.query(
            `INSERT INTO branch_modules (branch_id, module_name, can_view, can_edit, can_delete, is_enabled)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING module_name, can_view, can_edit, can_delete, is_enabled`,
            [branchId, module_name, can_view, can_edit, can_delete, true]
          );
          insertedModules.push(result.rows[0]);
        }
      }

      await client.query('COMMIT');

      return res.status(200).json({
        status: 'success',
        message: 'Branch module access updated successfully',
        modules: insertedModules
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Set branch modules error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}
