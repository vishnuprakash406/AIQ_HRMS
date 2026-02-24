import { Router } from 'express';
import { verifyMasterToken } from '../../middleware/auth.js';
import {
  getAllLicenses,
  getLicenseByCompany,
  updateLicense,
  updateRemainingDays,
  validateLicense,
  renewLicense
} from './license.controller.js';

const router = Router();

/**
 * License Routes
 * All routes require master authentication except validateLicense
 */

// Get all licenses
router.get('/licenses', verifyMasterToken, getAllLicenses);

// Get license by company
router.get('/licenses/company/:companyId', verifyMasterToken, getLicenseByCompany);

// Update license duration
router.put('/licenses/:licenseId', verifyMasterToken, updateLicense);

// Renew license
router.post('/licenses/:licenseId/renew', verifyMasterToken, renewLicense);

// Update remaining days (cron job)
router.post('/licenses/cron/update-remaining-days', verifyMasterToken, updateRemainingDays);

// Validate license (for auth system, no auth required)
router.post('/licenses/validate', validateLicense);

export default router;
