import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { isOriginAllowed } from './config/cors';
import authRoutes from './routes/auth';
import monitorRoutes from './routes/monitor';
import publicRoutes from './routes/public';

const app = express();

app.use(cors({
  origin: (origin, callback) => {
    return callback(null, isOriginAllowed(origin));
  },
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

// Direct Health Endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Bind API Routes
app.use('/api/auth', authRoutes);
app.use('/api/monitors', monitorRoutes);
app.use('/api', publicRoutes);

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    message: err.message || 'An unexpected server error occurred',
  });
});

export default app;
