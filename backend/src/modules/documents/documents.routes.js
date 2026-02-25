import { Router } from 'express';
import { authenticate, requireRole, requireBranchModule } from '../../middleware/auth.js';

const router = Router();

router.get('/policies', authenticate, requireBranchModule('documents'), (req, res) => {
  // TODO: list policy documents with signed URLs.
  return res.json({ policies: [] });
});

router.post('/policies', authenticate, requireRole(['admin']), (req, res) => {
  // TODO: upload policy metadata; create signed URL for file upload to object storage.
  return res.json({ message: 'Policy created' });
});

router.get('/user', authenticate, requireBranchModule('documents'), (req, res) => {
  // TODO: list user-specific uploaded documents.
  return res.json({ documents: [] });
});

export default router;
