import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { requireFields } from '../../middleware/validate.js';
import {
  checkIn,
  checkOut,
  getAttendanceStatus,
  getAttendanceHistory,
  getGeofenceZones,
  createGeofenceZone,
  updateGeofenceZone,
  deleteGeofenceZone
} from './attendance.controller.js';

const router = Router();

// Employee endpoints
router.post('/checkin', authenticate, requireFields(['latitude', 'longitude']), checkIn);
router.post('/checkout', authenticate, requireFields(['latitude', 'longitude']), checkOut);
router.get('/status/:employeeId', authenticate, getAttendanceStatus);
router.get('/history/:employeeId', authenticate, getAttendanceHistory);

// Admin endpoints for geofence management
router.get('/geofence/zones', authenticate, getGeofenceZones);
router.post('/geofence/zones', authenticate, requireRole(['admin']), requireFields(['name', 'latitude', 'longitude', 'radius_meters']), createGeofenceZone);
router.put('/geofence/zones/:id', authenticate, requireRole(['admin']), updateGeofenceZone);
router.delete('/geofence/zones/:id', authenticate, requireRole(['admin']), deleteGeofenceZone);

export default router;
