import { Router } from 'express';
import * as masterController from './master.controller.js';
import * as licenseController from './license.controller.js';
import { verifyMasterToken } from '../../middleware/auth.js';

const router = Router();

/**
 * Master Authentication & Company Management Routes
 */

// Public routes
router.post('/login', masterController.masterLogin);

// License Validation (no auth required, used by auth system)
router.post('/licenses/validate', licenseController.validateLicense);

// Protected routes (require master token)
router.post('/change-password', verifyMasterToken, masterController.changeMasterPassword);
router.post('/companies', verifyMasterToken, masterController.createCompany);
router.get('/companies', verifyMasterToken, masterController.getAllCompanies);
router.get('/companies/:companyId', verifyMasterToken, masterController.getCompanyDetails);
router.get('/companies/:companyId/users', verifyMasterToken, masterController.getCompanyUsers);
router.put('/companies/:companyId', verifyMasterToken, masterController.updateCompany);
router.put('/companies/:companyId/modules/:moduleName', verifyMasterToken, masterController.toggleCompanyModule);
router.post('/companies/:companyId/reset-password', verifyMasterToken, masterController.resetCompanyPassword);
router.post('/users/:userId/reset-password', verifyMasterToken, masterController.resetUserPassword);

// License Management Routes
router.get('/licenses', verifyMasterToken, licenseController.getAllLicenses);
router.get('/licenses/company/:companyId', verifyMasterToken, licenseController.getLicenseByCompany);
router.put('/licenses/:licenseId', verifyMasterToken, licenseController.updateLicense);
router.post('/licenses/:licenseId/renew', verifyMasterToken, licenseController.renewLicense);
router.post('/licenses/cron/update-remaining-days', verifyMasterToken, licenseController.updateRemainingDays);

export default router;
