import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { prisma } from '../src/config/database.js';

// Mock the Prisma Client methods
vi.mock('../src/config/database.js', () => {
  return {
    prisma: {
      user: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      monitor: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        findFirst: vi.fn(),
      },
      pingLog: {
        create: vi.fn(),
        deleteMany: vi.fn(),
      },
    },
  };
});

describe('PulseWatch API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return 200 OK and health status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should return 400 Bad Request on invalid payloads', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'not-an-email', password: '' });
      
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Validation failed');
    });

    it('should fail if user does not exist', async () => {
      // Mock db lookup to return null
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@test.com', password: 'password123' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Invalid email or password');
    });
  });

  describe('POST /api/internal/run-checks', () => {
    it('should return 401 Unauthorized if x-cron-secret is missing or wrong', async () => {
      const res = await request(app)
        .post('/api/internal/run-checks')
        .set('x-cron-secret', 'wrong_secret');

      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Unauthorized: Invalid cron secret key');
    });

    it('should run scheduled checks successfully when authenticated', async () => {
      // Mock prisma.monitor.findMany to return mock monitor list
      const mockMonitor = {
        id: 'monitor-1',
        name: 'Test Monitor',
        url: 'https://example.com',
        status: 'UP',
        intervalMinutes: 15,
        timeoutMs: 5000,
        isActive: true,
        userId: 'user-1',
        discordAlerts: false,
        lastCheckedAt: new Date(Date.now() - 30 * 60 * 1000), // Checked 30m ago, due
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      vi.mocked(prisma.monitor.findMany).mockResolvedValue([mockMonitor]);
      
      // Mock prisma.pingLog.create
      vi.mocked(prisma.pingLog.create).mockResolvedValue({
        id: 'log-1',
        monitorId: 'monitor-1',
        status: 200,
        responseTimeMs: 150,
        errorMsg: null,
        createdAt: new Date(),
      });

      // Mock prisma.monitor.update
      vi.mocked(prisma.monitor.update).mockResolvedValue(mockMonitor);

      // Mock prune
      vi.mocked(prisma.pingLog.deleteMany).mockResolvedValue({ count: 5 });

      // Run endpoint (using default dev secret)
      const res = await request(app)
        .post('/api/internal/run-checks')
        .set('x-cron-secret', 'dev_cron_secret_change_later');

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Uptime cron check run completed');
      expect(res.body.monitorsChecked).toBe(1);
    });
  });
});
