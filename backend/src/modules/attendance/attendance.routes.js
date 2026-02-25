import { Router } from 'express';
import { authenticate, requireRole, requireBranchModule } from '../../middleware/auth.js';
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
router.post('/checkin', authenticate, requireBranchModule('attendance'), requireFields(['latitude', 'longitude']), checkIn);
router.post('/checkout', authenticate, requireBranchModule('attendance'), requireFields(['latitude', 'longitude']), checkOut);
router.get('/status/:employeeId', authenticate, requireBranchModule('attendance'), getAttendanceStatus);
router.get('/history/:employeeId', authenticate, requireBranchModule('attendance'), getAttendanceHistory);

// Admin endpoints for geofence management
router.get('/geofence/zones', authenticate, requireRole(['admin', 'company_admin', 'branch_manager']), requireBranchModule('geofencing'), getGeofenceZones);
router.post('/geofence/zones', authenticate, requireRole(['admin', 'company_admin', 'branch_manager']), requireBranchModule('geofencing'), requireFields(['name', 'latitude', 'longitude', 'radius_meters']), createGeofenceZone);
router.put('/geofence/zones/:id', authenticate, requireRole(['admin', 'company_admin', 'branch_manager']), requireBranchModule('geofencing'), updateGeofenceZone);
router.delete('/geofence/zones/:id', authenticate, requireRole(['admin', 'company_admin', 'branch_manager']), requireBranchModule('geofencing'), deleteGeofenceZone);

export default router;
