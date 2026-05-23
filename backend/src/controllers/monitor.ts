import { Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/database.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { runUptimeCheck } from '../services/pinger.js';

export const createMonitorSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  url: z.string().url('Invalid monitor target URL (must include http/https)'),
  intervalMinutes: z.number().min(1).max(1440).default(15),
  timeoutMs: z.number().min(500).max(30000).default(5000),
  discordAlerts: z.boolean().default(false),
});

export const updateMonitorSchema = createMonitorSchema.partial();

export const createMonitor = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const monitor = await prisma.monitor.create({
      data: {
        ...req.body,
        userId: req.user.id,
      },
    });

    return res.status(201).json({
      message: 'Monitor created successfully',
      monitor,
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Internal server error' });
  }
};

export const listMonitors = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  try {
    const monitors = await prisma.monitor.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json({ monitors });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Internal server error' });
  }
};

export const getMonitor = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  const { id } = req.params;

  try {
    const monitor = await prisma.monitor.findUnique({
      where: { id },
      include: {
        pingLogs: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    if (!monitor) {
      return res.status(404).json({ message: 'Monitor not found' });
    }

    if (monitor.userId !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    return res.status(200).json({ monitor });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Internal server error' });
  }
};

export const updateMonitor = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  const { id } = req.params;

  try {
    const monitor = await prisma.monitor.findUnique({ where: { id } });

    if (!monitor) {
      return res.status(404).json({ message: 'Monitor not found' });
    }

    if (monitor.userId !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const updated = await prisma.monitor.update({
      where: { id },
      data: req.body,
    });

    return res.status(200).json({
      message: 'Monitor updated successfully',
      monitor: updated,
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Internal server error' });
  }
};

export const deleteMonitor = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  const { id } = req.params;

  try {
    const monitor = await prisma.monitor.findUnique({ where: { id } });

    if (!monitor) {
      return res.status(404).json({ message: 'Monitor not found' });
    }

    if (monitor.userId !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    await prisma.monitor.delete({ where: { id } });

    return res.status(200).json({ message: 'Monitor deleted successfully' });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Internal server error' });
  }
};

export const forceCheck = async (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });

  const { id } = req.params;

  try {
    const monitor = await prisma.monitor.findUnique({ where: { id } });

    if (!monitor) {
      return res.status(404).json({ message: 'Monitor not found' });
    }

    if (monitor.userId !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // Force checking immediately
    const log = await runUptimeCheck(monitor);

    return res.status(200).json({
      message: 'Uptime check executed successfully',
      log,
      status: monitor.status,
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Internal server error' });
  }
};
