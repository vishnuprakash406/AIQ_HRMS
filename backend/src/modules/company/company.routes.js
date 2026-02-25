import { Router } from 'express';
import * as companyController from './company.controller.js';
import * as geofenceController from './company.geofence.js';
import { verifyCompanyOrBranchManagerToken, verifyCompanyToken } from '../../middleware/auth.js';

const router = Router();

/**
 * Company Admin Routes
 */

// Public route
router.post('/login', companyController.companyLogin);
router.get('/public/branches', companyController.getPublicCompanyBranches);

// Protected routes (require company admin token)
router.post('/change-password', verifyCompanyToken, companyController.changeCompanyPassword);
router.get('/info', verifyCompanyToken, companyController.getCompanyInfo);
router.get('/branches', verifyCompanyOrBranchManagerToken, companyController.getCompanyBranches);
router.post('/branches', verifyCompanyToken, companyController.createCompanyBranch);
router.put('/branches/:branchId', verifyCompanyToken, companyController.updateCompanyBranch);
router.get('/branches/:branchId/modules', verifyCompanyOrBranchManagerToken, companyController.getBranchModules);
router.post('/branches/:branchId/modules', verifyCompanyToken, companyController.setBranchModules);
router.get('/branches/:branchId/managers', verifyCompanyToken, companyController.getBranchManagers);
router.post('/branches/:branchId/managers', verifyCompanyToken, companyController.createBranchManager);
router.get('/branches/:branchId/managers/:managerId/modules', verifyCompanyOrBranchManagerToken, companyController.getBranchManagerModulePermissions);
router.get('/managers/:managerId/branches', verifyCompanyOrBranchManagerToken, companyController.getManagerAccessibleBranches);
router.post('/branches/:branchId/managers/:managerId/modules', verifyCompanyToken, companyController.assignModuleToBranchManager);
router.put('/branches/:branchId/managers/:managerId/modules/:moduleName', verifyCompanyToken, companyController.updateBranchManagerModulePermission);
router.delete('/branches/:branchId/managers/:managerId/modules/:moduleName', verifyCompanyToken, companyController.removeModuleFromBranchManager);
router.get('/branches/:branchId/employees', verifyCompanyOrBranchManagerToken, companyController.getBranchEmployees);
router.get('/branches/:branchId/employees/list', verifyCompanyOrBranchManagerToken, companyController.getBranchEmployeesList);
router.get('/branches/:branchId/reports/attendance', verifyCompanyOrBranchManagerToken, companyController.getBranchAttendanceSummary);
router.get('/branches/:branchId/reports/leave', verifyCompanyOrBranchManagerToken, companyController.getBranchLeaveSummary);
router.get('/branches/:branchId/reports/employees', verifyCompanyOrBranchManagerToken, companyController.getBranchEmployeeSummary);
router.get('/employees', verifyCompanyToken, companyController.getCompanyEmployees);
router.post('/employees', verifyCompanyToken, companyController.createCompanyEmployee);

// More specific employee routes before general :employeeId routes
router.get('/employees/:employeeId/modules', verifyCompanyToken, companyController.getEmployeeModuleAccess);
router.post('/employees/:employeeId/modules', verifyCompanyToken, companyController.setEmployeeModuleAccess);
router.put('/employees/:employeeId/modules', verifyCompanyToken, companyController.updateEmployeeModuleAccess);
router.delete('/employees/:employeeId/modules/:moduleName', verifyCompanyToken, companyController.removeEmployeeModuleAccess);

// General employee routes
router.put('/employees/:employeeId', verifyCompanyToken, companyController.updateCompanyEmployee);
router.delete('/employees/:employeeId', verifyCompanyToken, companyController.deleteCompanyEmployee);
router.put('/employees/:employeeId/attendance-mode', verifyCompanyToken, companyController.updateCompanyEmployeeAttendanceMode);
router.post('/employees/:employeeId/reset-password', verifyCompanyToken, companyController.resetCompanyEmployeePassword);

router.get('/modules', verifyCompanyToken, companyController.getCompanyModules);
router.put('/modules/:moduleName', verifyCompanyToken, companyController.toggleModule);

// Geofence routes
router.post('/employees/:employeeId/geofence', verifyCompanyToken, geofenceController.assignEmployeeGeofence);
router.get('/employees/:employeeId/geofence', verifyCompanyToken, geofenceController.getEmployeeGeofences);
router.delete('/employees/:employeeId/geofence/:geofenceZoneId', verifyCompanyToken, geofenceController.removeEmployeeGeofence);

export default router;
