import pool from '../../db/pool.js';

/**
 * Get all company licenses with employee count and details
 * GET /master/licenses
 * Auth: Master JWT token required
 * Returns: Array of licenses with company details
 */
export async function getAllLicenses(req, res) {
  try {
    const result = await pool.query(`
      SELECT 
        cl.id,
        cl.company_id,
        cl.company_code,
        c.name as company_name,
        c.email,
        c.contact_number,
        cl.license_start_date,
        cl.license_duration_value,
        cl.license_duration_type,
        cl.license_end_date,
        cl.remaining_days,
        cl.is_active,
        cl.created_at,
        cl.updated_at,
        COUNT(u.id) as employee_count,
        MAX(u.created_at) as latest_employee_created,
        MAX(u.updated_at) as latest_employee_updated
      FROM company_licenses cl
      LEFT JOIN companies c ON cl.company_id = c.id
      LEFT JOIN users u ON c.id = u.company_id AND u.role = 'employee'
      GROUP BY cl.id, c.id
      ORDER BY cl.created_at DESC
    `);

    return res.status(200).json({
      status: 'success',
      message: 'Licenses retrieved successfully',
      licenses: result.rows || []
    });
  } catch (error) {
    console.error('Get all licenses error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}

/**
 * Get license details for a specific company
 * GET /master/licenses/company/:companyId
 * Auth: Master JWT token required
 * Returns: License details with employee info
 */
export async function getLicenseByCompany(req, res) {
  try {
    const { companyId } = req.params;

    const result = await pool.query(`
      SELECT 
        cl.id,
        cl.company_id,
        cl.company_code,
        c.name as company_name,
        c.email,
        c.contact_number,
        c.employee_limit,
        cl.license_start_date,
        cl.license_duration_value,
        cl.license_duration_type,
        cl.license_end_date,
        cl.remaining_days,
        cl.is_active,
        cl.created_at,
        cl.updated_at,
        COUNT(u.id) as employee_count,
        ARRAY_AGG(JSON_BUILD_OBJECT(
          'id', u.id,
          'email', u.email,
          'full_name', u.full_name,
          'role', u.role,
          'created_at', u.created_at,
          'updated_at', u.updated_at
        ) ORDER BY u.created_at DESC) FILTER (WHERE u.id IS NOT NULL) as employees
      FROM company_licenses cl
      LEFT JOIN companies c ON cl.company_id = c.id
      LEFT JOIN users u ON c.id = u.company_id AND u.role = 'employee'
      WHERE cl.company_id = $1
      GROUP BY cl.id, c.id
    `, [companyId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'License not found for this company'
      });
    }

    return res.status(200).json({
      status: 'success',
      message: 'License retrieved successfully',
      license: result.rows[0]
    });
  } catch (error) {
    console.error('Get license by company error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}

/**
 * Update company license duration and recalculate end date
 * PUT /master/licenses/:licenseId
 * Auth: Master JWT token required
 * Body: { duration_value, duration_type }
 * Returns: Updated license
 */
export async function updateLicense(req, res) {
  try {
    const { licenseId } = req.params;
    const { duration_value, duration_type } = req.body;

    if (!duration_value || !duration_type) {
      return res.status(400).json({
        status: 'error',
        message: 'duration_value and duration_type are required'
      });
    }

    if (!['months', 'years'].includes(duration_type)) {
      return res.status(400).json({
        status: 'error',
        message: 'duration_type must be either "months" or "years"'
      });
    }

    if (duration_value <= 0) {
      return res.status(400).json({
        status: 'error',
        message: 'duration_value must be greater than 0'
      });
    }

    // Calculate new end date
    let licenseEndDate;
    if (duration_type === 'years') {
      licenseEndDate = `CURRENT_TIMESTAMP + INTERVAL '${duration_value} year'`;
    } else {
      licenseEndDate = `CURRENT_TIMESTAMP + INTERVAL '${duration_value} month'`;
    }

    const result = await pool.query(`
      UPDATE company_licenses
      SET 
        license_start_date = CURRENT_TIMESTAMP,
        license_duration_value = $1,
        license_duration_type = $2,
        license_end_date = ${licenseEndDate},
        remaining_days = CEIL(EXTRACT(EPOCH FROM (${licenseEndDate} - CURRENT_TIMESTAMP)) / 86400),
        is_active = TRUE,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `, [duration_value, duration_type, licenseId]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'License not found'
      });
    }

    return res.status(200).json({
      status: 'success',
      message: 'License updated successfully',
      license: result.rows[0]
    });
  } catch (error) {
    console.error('Update license error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}

/**
 * Update remaining days for all licenses (daily cron job)
 * POST /master/licenses/cron/update-remaining-days
 * Auth: Master JWT token required
 * Returns: Updated count
 */
export async function updateRemainingDays(req, res) {
  try {
    const result = await pool.query(`
      UPDATE company_licenses
      SET 
        remaining_days = CEIL(EXTRACT(EPOCH FROM (license_end_date - CURRENT_TIMESTAMP)) / 86400),
        is_active = CASE 
          WHEN CEIL(EXTRACT(EPOCH FROM (license_end_date - CURRENT_TIMESTAMP)) / 86400) > 0 THEN TRUE
          ELSE FALSE
        END,
        updated_at = CURRENT_TIMESTAMP
      WHERE license_end_date IS NOT NULL
      RETURNING id, remaining_days, is_active
    `);

    return res.status(200).json({
      status: 'success',
      message: 'Remaining days updated for all licenses',
      updated_count: result.rows.length,
      licenses: result.rows
    });
  } catch (error) {
    console.error('Update remaining days error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}

/**
 * Check license validity for login (used by auth middleware)
 * POST /master/licenses/validate
 * Auth: Not required (called by auth system)
 * Body: { company_code }
 * Returns: { is_valid, remaining_days, message }
 */
export async function validateLicense(req, res) {
  try {
    const { company_code } = req.body;

    if (!company_code) {
      return res.status(400).json({
        status: 'error',
        message: 'company_code is required'
      });
    }

    const result = await pool.query(`
      SELECT 
        is_active,
        license_end_date,
        remaining_days,
        CEIL(EXTRACT(EPOCH FROM (license_end_date - CURRENT_TIMESTAMP)) / 86400) as calculated_remaining_days
      FROM company_licenses
      WHERE company_code = $1
    `, [company_code]);

    if (result.rows.length === 0) {
      return res.status(200).json({
        is_valid: false,
        remaining_days: 0,
        message: 'License not found'
      });
    }

    const license = result.rows[0];

    // Check if license is active and has remaining days
    if (!license.is_active || license.calculated_remaining_days <= 0) {
      return res.status(200).json({
        is_valid: false,
        remaining_days: Math.max(0, license.calculated_remaining_days),
        message: 'License has expired'
      });
    }

    return res.status(200).json({
      is_valid: true,
      remaining_days: license.calculated_remaining_days,
      message: 'License is valid'
    });
  } catch (error) {
    console.error('Validate license error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}

/**
 * Renew company license
 * POST /master/licenses/:licenseId/renew
 * Auth: Master JWT token required
 * Body: { duration_value, duration_type }
 * Returns: Renewed license
 */
export async function renewLicense(req, res) {
  try {
    const { licenseId } = req.params;
    const { duration_value, duration_type } = req.body;

    if (!duration_value || !duration_type) {
      return res.status(400).json({
        status: 'error',
        message: 'duration_value and duration_type are required'
      });
    }

    if (!['months', 'years'].includes(duration_type)) {
      return res.status(400).json({
        status: 'error',
        message: 'duration_type must be either "months" or "years"'
      });
    }

    // Get current license to extend from end_date (not from now)
    const currentLicense = await pool.query(
      'SELECT license_end_date FROM company_licenses WHERE id = $1',
      [licenseId]
    );

    if (currentLicense.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'License not found'
      });
    }

    const baseDate = currentLicense.rows[0].license_end_date || new Date();
    let newEndDate;

    if (duration_type === 'years') {
      newEndDate = `'${baseDate}'::TIMESTAMP + INTERVAL '${duration_value} year'`;
    } else {
      newEndDate = `'${baseDate}'::TIMESTAMP + INTERVAL '${duration_value} month'`;
    }

    const result = await pool.query(`
      UPDATE company_licenses
      SET 
        license_end_date = ${newEndDate},
        remaining_days = CEIL(EXTRACT(EPOCH FROM (${newEndDate} - CURRENT_TIMESTAMP)) / 86400),
        is_active = TRUE,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [licenseId]);

    return res.status(200).json({
      status: 'success',
      message: 'License renewed successfully',
      license: result.rows[0]
    });
  } catch (error) {
    console.error('Renew license error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}
