import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';

const router = Router();

router.get('/faqs', (req, res) => {
  // TODO: return FAQ list.
  return res.json({ faqs: [] });
});

router.post('/contact', authenticate, (req, res) => {
  // TODO: create support ticket.
  return res.json({ message: 'Ticket submitted' });
});

export default router;
