import { Router } from 'express';
import * as companyController from './company.controller.js';
import { verifyCompanyToken } from '../../middleware/auth.js';

const router = Router();

/**
 * Company Admin Routes
 */

// Public route
router.post('/login', companyController.companyLogin);

// Protected routes (require company admin token)router.post('/change-password', verifyCompanyToken, companyController.changeCompanyPassword);router.get('/info', verifyCompanyToken, companyController.getCompanyInfo);
router.get('/employees', verifyCompanyToken, companyController.getCompanyEmployees);
router.post('/employees', verifyCompanyToken, companyController.createCompanyEmployee);
router.put('/employees/:employeeId/attendance-mode', verifyCompanyToken, companyController.updateCompanyEmployeeAttendanceMode);
router.post('/employees/:employeeId/reset-password', verifyCompanyToken, companyController.resetCompanyEmployeePassword);
router.get('/modules', verifyCompanyToken, companyController.getCompanyModules);
router.put('/modules/:moduleName', verifyCompanyToken, companyController.toggleModule);

export default router;
