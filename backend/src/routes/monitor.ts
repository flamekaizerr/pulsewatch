import { Router } from 'express';
import {
  createMonitor,
  listMonitors,
  getMonitor,
  updateMonitor,
  deleteMonitor,
  forceCheck,
  forceCheckAll,
  createMonitorSchema,
  updateMonitorSchema,
} from '../controllers/monitor';
import { requireAuth } from '../middlewares/auth';
import { validateBody } from '../middlewares/validation';

const router = Router();

router.use(requireAuth);

router.post('/', validateBody(createMonitorSchema), createMonitor);
router.get('/', listMonitors);
router.post('/check-all', forceCheckAll);
router.get('/:id', getMonitor);
router.patch('/:id', validateBody(updateMonitorSchema), updateMonitor);
router.delete('/:id', deleteMonitor);
router.post('/:id/check', forceCheck);

export default router;
