import { Router } from 'express';
import authRoutes from '../modules/auth/auth.routes.js';
import attendanceRoutes from '../modules/attendance/attendance.routes.js';
import leaveRoutes from '../modules/leave/leave.routes.js';
import leavePlanRoutes from '../modules/leavePlan/leavePlan.routes.js';
import inventoryRoutes from '../modules/inventory/inventory.routes.js';
import payrollRoutes from '../modules/payroll/payroll.routes.js';
import documentRoutes from '../modules/documents/documents.routes.js';
import onboardingRoutes from '../modules/onboarding/onboarding.routes.js';
import supportRoutes from '../modules/support/support.routes.js';
import masterRoutes from '../modules/master/master.routes.js';
import companyRoutes from '../modules/company/company.routes.js';

const router = Router();

// Multi-tenant routes
router.use('/master', masterRoutes);
router.use('/company', companyRoutes);

// Regular routes
router.use('/auth', authRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/leave', leaveRoutes);
router.use('/leave-plan', leavePlanRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/payroll', payrollRoutes);
router.use('/documents', documentRoutes);
router.use('/onboarding', onboardingRoutes);
router.use('/support', supportRoutes);

export default router;
