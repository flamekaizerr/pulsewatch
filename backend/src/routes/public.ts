import { Router } from 'express';
import { getPublicStatus, runScheduledChecks, getDashboardStats } from '../controllers/public.js';
import { requireAuth } from '../middlewares/auth.js';

const router = Router();

router.get('/status', getPublicStatus);
router.post('/internal/run-checks', runScheduledChecks);
router.get('/dashboard/stats', requireAuth, getDashboardStats);

export default router;
