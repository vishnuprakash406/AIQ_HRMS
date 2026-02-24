import { Router } from 'express';
import { requestOtp, verifyOtp, adminLogin, refreshToken, loginPassword, resetPasswordWithOtp, createEmployee, resetEmployeePassword, getAllEmployees, updateAttendanceMode } from './auth.controller.js';
import { requireFields } from '../../middleware/validate.js';
import { authenticate, requireRole } from '../../middleware/auth.js';

const router = Router();

router.post('/request-otp', requestOtp);
router.post('/verify-otp', requireFields(['otp']), verifyOtp);
router.post('/admin-login', requireFields(['email', 'password']), adminLogin);
router.post('/refresh', requireFields(['refresh']), refreshToken);
router.post('/login-password', requireFields(['username', 'password']), loginPassword);
router.post('/reset-password-otp', requireFields(['username', 'otp', 'newPassword']), resetPasswordWithOtp);
router.post('/create-employee', authenticate, requireRole(['admin']), requireFields(['email', 'phone', 'fullName']), createEmployee);
router.post('/reset-employee-password', authenticate, requireRole(['admin']), requireFields(['userId', 'newPassword']), resetEmployeePassword);
router.put('/employees/:userId/attendance-mode', authenticate, requireRole(['admin']), requireFields(['attendanceMode']), updateAttendanceMode);
router.get('/employees', authenticate, requireRole(['admin']), getAllEmployees);

export default router;
