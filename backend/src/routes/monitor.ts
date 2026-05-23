import { Router } from 'express';
import {
  createMonitor,
  listMonitors,
  getMonitor,
  updateMonitor,
  deleteMonitor,
  forceCheck,
  createMonitorSchema,
  updateMonitorSchema,
} from '../controllers/monitor.js';
import { requireAuth } from '../middlewares/auth.js';
import { validateBody } from '../middlewares/validation.js';

const router = Router();

router.use(requireAuth);

router.post('/', validateBody(createMonitorSchema), createMonitor);
router.get('/', listMonitors);
router.get('/:id', getMonitor);
router.patch('/:id', validateBody(updateMonitorSchema), updateMonitor);
router.delete('/:id', deleteMonitor);
router.post('/:id/check', forceCheck);

export default router;
