import { Router } from 'express';
import { register, login, logout, getMe, demoLogin, registerSchema, loginSchema } from '../controllers/auth';
import { requireAuth } from '../middlewares/auth';
import { validateBody } from '../middlewares/validation';

const router = Router();

router.post('/register', validateBody(registerSchema), register);
router.post('/login', validateBody(loginSchema), login);
router.post('/logout', logout);
router.get('/me', requireAuth, getMe);
router.post('/demo-login', demoLogin);

export default router;
