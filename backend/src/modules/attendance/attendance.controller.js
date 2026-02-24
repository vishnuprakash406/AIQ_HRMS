import { pool } from '../../db/pool.js';

// Haversine formula to calculate distance between two coordinates (in meters)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Check if employee is inside any geofence zone
async function validateGeofenceLocation(latitude, longitude) {
  try {
    const result = await pool.query(
      'SELECT id, name, latitude, longitude, radius_meters FROM geofence_zones WHERE is_active = true'
    );
    
    const zones = result.rows;
    for (const zone of zones) {
      const distance = calculateDistance(
        latitude,
        longitude,
        parseFloat(zone.latitude),
        parseFloat(zone.longitude)
      );
      
      if (distance <= parseFloat(zone.radius_meters)) {
        return { status: 'inside', zone_id: zone.id, zone_name: zone.name, distance };
      }
    }
    
    return { status: 'outside', zone_id: null, zone_name: null, distance: null };
  } catch (err) {
    console.error('Geofence validation error:', err);
    return { status: 'unchecked', zone_id: null, zone_name: null, distance: null };
  }
}

export async function checkIn(req, res) {
  try {
    const { latitude, longitude } = req.body;
    const userEmail = req.user.sub; // From auth middleware (email)
    
    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'latitude and longitude are required' });
    }
    
    // Get user UUID from email
    const userResult = await pool.query(
      'SELECT id FROM users WHERE LOWER(email) = $1 OR LOWER(phone) = $1',
      [userEmail.toLowerCase()]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const userId = userResult.rows[0].id;
    
    // Validate geofence
    const geofenceCheck = await validateGeofenceLocation(parseFloat(latitude), parseFloat(longitude));
    
    // Check if already checked in
    const existingCheckIn = await pool.query(
      'SELECT id FROM attendance_logs WHERE user_id = $1 AND check_out IS NULL AND DATE(check_in) = CURRENT_DATE',
      [userId]
    );
    
    if (existingCheckIn.rows.length > 0) {
      return res.status(400).json({ message: 'Already checked in. Please check out first.' });
    }
    
    const result = await pool.query(
      `INSERT INTO attendance_logs (user_id, check_in, check_in_lat, check_in_lng, check_in_geofence_status)
       VALUES ($1, NOW(), $2, $3, $4)
       RETURNING id, check_in, check_in_lat, check_in_lng, check_in_geofence_status`,
      [userId, latitude, longitude, geofenceCheck.status]
    );
    
    const attendance = result.rows[0];
    return res.json({
      message: 'Checked in successfully',
      attendance,
      geofence: geofenceCheck
    });
  } catch (err) {
    console.error('Check-in error:', err);
    return res.status(500).json({ message: 'Error checking in' });
  }
}

export async function checkOut(req, res) {
  try {
    const { latitude, longitude } = req.body;
    const userEmail = req.user.sub; // From auth middleware (email)
    
    if (!latitude || !longitude) {
      return res.status(400).json({ message: 'latitude and longitude are required' });
    }
    
    // Get user UUID from email
    const userResult = await pool.query(
      'SELECT id FROM users WHERE LOWER(email) = $1 OR LOWER(phone) = $1',
      [userEmail.toLowerCase()]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const userId = userResult.rows[0].id;
    
    // Validate geofence
    const geofenceCheck = await validateGeofenceLocation(parseFloat(latitude), parseFloat(longitude));
    
    // Find today's check-in
    const checkInRecord = await pool.query(
      'SELECT id FROM attendance_logs WHERE user_id = $1 AND check_out IS NULL AND DATE(check_in) = CURRENT_DATE',
      [userId]
    );
    
    if (checkInRecord.rows.length === 0) {
      return res.status(400).json({ message: 'No active check-in found. Please check in first.' });
    }
    
    const attendanceId = checkInRecord.rows[0].id;
    
    const result = await pool.query(
      `UPDATE attendance_logs 
       SET check_out = NOW(), check_out_lat = $2, check_out_lng = $3, check_out_geofence_status = $4
       WHERE id = $1
       RETURNING id, check_in, check_out, check_in_lat, check_in_lng, check_out_lat, check_out_lng, 
                 check_in_geofence_status, check_out_geofence_status`,
      [attendanceId, latitude, longitude, geofenceCheck.status]
    );
    
    const attendance = result.rows[0];
    const checkInTime = new Date(attendance.check_in);
    const checkOutTime = new Date(attendance.check_out);
    const durationMinutes = Math.round((checkOutTime - checkInTime) / 60000);
    
    return res.json({
      message: 'Checked out successfully',
      attendance,
      geofence: geofenceCheck,
      duration: { minutes: durationMinutes, hours: (durationMinutes / 60).toFixed(2) }
    });
  } catch (err) {
    console.error('Check-out error:', err);
    return res.status(500).json({ message: 'Error checking out' });
  }
}

export async function getAttendanceStatus(req, res) {
  try {
    const { employeeId } = req.params; // This is actually email
    
    console.log(`[Attendance Status] Request for employee: ${employeeId}`);
    
    // Get user UUID from email
    const userResult = await pool.query(
      'SELECT id FROM users WHERE LOWER(email) = $1 OR LOWER(phone) = $1',
      [employeeId.toLowerCase()]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const userId = userResult.rows[0].id;
    console.log(`[Attendance Status] Found user UUID: ${userId}`);
    
    // Get today's attendance
    const todayResult = await pool.query(
      `SELECT id, check_in, check_out, check_in_lat, check_in_lng, check_out_lat, check_out_lng,
               check_in_geofence_status, check_out_geofence_status
       FROM attendance_logs 
       WHERE user_id = $1 AND DATE(check_in) = CURRENT_DATE
       ORDER BY check_in DESC LIMIT 1`,
      [userId]
    );
    
    const today = todayResult.rows[0] || null;
    
    // Get attendance statistics (last 7 days)
    const statsResult = await pool.query(
      `SELECT COUNT(*) as total_days,
               SUM(CASE WHEN check_out IS NOT NULL THEN 1 ELSE 0 END) as complete_days,
               SUM(CASE WHEN check_in_geofence_status = 'inside' THEN 1 ELSE 0 END) as inside_checkins,
               SUM(CASE WHEN check_in_geofence_status = 'outside' THEN 1 ELSE 0 END) as outside_checkins
       FROM attendance_logs 
       WHERE user_id = $1 AND check_in >= NOW() - INTERVAL '7 days'`,
      [userId]
    );
    
    const stats = statsResult.rows[0] || { total_days: 0, complete_days: 0, inside_checkins: 0, outside_checkins: 0 };
    
    return res.json({
      today,
      stats: {
        totalDays: parseInt(stats.total_days) || 0,
        completeDays: parseInt(stats.complete_days) || 0,
        insideCheckins: parseInt(stats.inside_checkins) || 0,
        outsideCheckins: parseInt(stats.outside_checkins) || 0
      }
    });
  } catch (err) {
    console.error('[Attendance Status] Error:', err);
    return res.status(500).json({ message: 'Error fetching attendance status', error: err.message });
  }
}

export async function getAttendanceHistory(req, res) {
  try {
    const { employeeId } = req.params; // This is actually email
    const { days = 30 } = req.query;
    
    // Get user UUID from email
    const userResult = await pool.query(
      'SELECT id FROM users WHERE LOWER(email) = $1 OR LOWER(phone) = $1',
      [employeeId.toLowerCase()]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const userId = userResult.rows[0].id;
    
    const result = await pool.query(
      `SELECT id, check_in, check_out, check_in_lat, check_in_lng, check_out_lat, check_out_lng,
               check_in_geofence_status, check_out_geofence_status, created_at
       FROM attendance_logs 
       WHERE user_id = $1 AND check_in >= NOW() - INTERVAL '${parseInt(days)} days'
       ORDER BY check_in DESC`,
      [userId]
    );
    
    return res.json({ records: result.rows });
  } catch (err) {
    console.error('Get attendance history error:', err);
    return res.status(500).json({ message: 'Error fetching attendance history' });
  }
}

// Admin endpoints for geofence management
export async function getGeofenceZones(req, res) {
  try {
    const result = await pool.query(
      'SELECT id, name, latitude, longitude, radius_meters, description, is_active, created_at FROM geofence_zones ORDER BY name'
    );
    return res.json({ zones: result.rows });
  } catch (err) {
    console.error('Get geofence zones error:', err);
    return res.status(500).json({ message: 'Error fetching geofence zones' });
  }
}

export async function createGeofenceZone(req, res) {
  try {
    const { name, latitude, longitude, radius_meters, description } = req.body;
    
    if (!name || !latitude || !longitude || !radius_meters) {
      return res.status(400).json({ message: 'name, latitude, longitude, and radius_meters are required' });
    }
    
    const result = await pool.query(
      `INSERT INTO geofence_zones (name, latitude, longitude, radius_meters, description)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, latitude, longitude, radius_meters, description, is_active, created_at`,
      [name, latitude, longitude, radius_meters, description || null]
    );
    
    return res.json({ message: 'Geofence zone created', zone: result.rows[0] });
  } catch (err) {
    console.error('Create geofence zone error:', err);
    return res.status(500).json({ message: 'Error creating geofence zone' });
  }
}

export async function updateGeofenceZone(req, res) {
  try {
    const { id } = req.params;
    const { name, latitude, longitude, radius_meters, description, is_active } = req.body;
    
    const result = await pool.query(
      `UPDATE geofence_zones 
       SET name = COALESCE($1, name),
           latitude = COALESCE($2, latitude),
           longitude = COALESCE($3, longitude),
           radius_meters = COALESCE($4, radius_meters),
           description = COALESCE($5, description),
           is_active = COALESCE($6, is_active),
           updated_at = NOW()
       WHERE id = $7
       RETURNING id, name, latitude, longitude, radius_meters, description, is_active, created_at`,
      [name, latitude, longitude, radius_meters, description, is_active, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Geofence zone not found' });
    }
    
    return res.json({ message: 'Geofence zone updated', zone: result.rows[0] });
  } catch (err) {
    console.error('Update geofence zone error:', err);
    return res.status(500).json({ message: 'Error updating geofence zone' });
  }
}

export async function deleteGeofenceZone(req, res) {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      'DELETE FROM geofence_zones WHERE id = $1 RETURNING id',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Geofence zone not found' });
    }
    
    return res.json({ message: 'Geofence zone deleted' });
  } catch (err) {
    console.error('Delete geofence zone error:', err);
    return res.status(500).json({ message: 'Error deleting geofence zone' });
  }
}
