import { Router } from 'express';
import { getPublicStatus, runScheduledChecks, getDashboardStats } from '../controllers/public';
import { requireAuth } from '../middlewares/auth';

const router = Router();

router.get('/status', getPublicStatus);
router.post('/internal/run-checks', runScheduledChecks);
router.get('/dashboard/stats', requireAuth, getDashboardStats);

export default router;
