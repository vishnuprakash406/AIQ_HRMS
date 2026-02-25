/**
 * Add employee geofence zone assignment
 */
export async function assignEmployeeGeofence(req, res) {
  try {
    const { employeeId, geofenceZoneId } = req.body;
    const companyId = req.user?.company_id;

    if (!employeeId || !geofenceZoneId) {
      return res.status(400).json({
        status: 'error',
        message: 'employeeId and geofenceZoneId are required'
      });
    }

    // Verify both employee and zone belong to company
    if (companyId) {
      const [empCheck, zoneCheck] = await Promise.all([
        pool.query('SELECT id FROM users WHERE id = $1 AND company_id = $2', [employeeId, companyId]),
        pool.query('SELECT id FROM geofence_zones WHERE id = $1 AND company_id = $2', [geofenceZoneId, companyId])
      ]);

      if (empCheck.rows.length === 0 || zoneCheck.rows.length === 0) {
        return res.status(403).json({
          status: 'error',
          message: 'Employee or geofence zone not found or does not belong to your company'
        });
      }
    }

    const result = await pool.query(
      `INSERT INTO employee_geofence_zones (user_id, geofence_zone_id, is_primary)
       VALUES ($1, $2, true)
       ON CONFLICT (user_id, geofence_zone_id) DO UPDATE SET is_primary = true
       RETURNING user_id, geofence_zone_id, is_primary`,
      [employeeId, geofenceZoneId]
    );

    return res.status(200).json({
      status: 'success',
      message: 'Employee assigned to geofence zone',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Assign employee geofence error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}

/**
 * Get employee's assigned geofence zones
 */
export async function getEmployeeGeofences(req, res) {
  try {
    const { employeeId } = req.params;
    const companyId = req.user?.company_id;

    // Verify employee belongs to company
    if (companyId) {
      const empCheck = await pool.query('SELECT id FROM users WHERE id = $1 AND company_id = $2', [employeeId, companyId]);
      if (empCheck.rows.length === 0) {
        return res.status(403).json({
          status: 'error',
          message: 'Employee not found or does not belong to your company'
        });
      }
    }

    const result = await pool.query(
      `SELECT gz.id, gz.name, gz.latitude, gz.longitude, gz.radius_meters, 
              gz.description, gz.is_active, egz.is_primary
       FROM geofence_zones gz
       LEFT JOIN employee_geofence_zones egz ON gz.id = egz.geofence_zone_id AND egz.user_id = $1
       WHERE gz.company_id IS NULL OR gz.company_id = $2
       ORDER BY egz.is_primary DESC, gz.name`,
      [employeeId, companyId]
    );

    return res.status(200).json({
      status: 'success',
      message: 'Employee geofence zones retrieved',
      data: result.rows
    });
  } catch (error) {
    console.error('Get employee geofences error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}

/**
 * Remove employee from geofence zone
 */
export async function removeEmployeeGeofence(req, res) {
  try {
    const { employeeId, geofenceZoneId } = req.params;
    const companyId = req.user?.company_id;

    // Verify zone belongs to company
    if (companyId) {
      const zoneCheck = await pool.query('SELECT id FROM geofence_zones WHERE id = $1 AND company_id = $2', [geofenceZoneId, companyId]);
      if (zoneCheck.rows.length === 0) {
        return res.status(403).json({
          status: 'error',
          message: 'Zone does not belong to your company'
        });
      }
    }

    const result = await pool.query(
      'DELETE FROM employee_geofence_zones WHERE user_id = $1 AND geofence_zone_id = $2 RETURNING user_id',
      [employeeId, geofenceZoneId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: 'Assignment not found'
      });
    }

    return res.status(200).json({
      status: 'success',
      message: 'Employee removed from geofence zone'
    });
  } catch (error) {
    console.error('Remove employee geofence error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
}
