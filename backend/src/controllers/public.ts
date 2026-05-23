import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { cache } from '../config/redis';
import { runDueUptimeChecks } from '../services/pinger';
import type { MonitorStatus } from '@shared/types';

const CRON_SECRET = process.env.CRON_SECRET || 'dev_cron_secret_change_later';

// Unauthenticated public status page stats
export const getPublicStatus = async (req: Request, res: Response) => {
  const cacheKey = 'public_status_page';

  try {
    // Attempt cache read
    const cachedData = await cache.get(cacheKey);
    if (cachedData) {
      return res.status(200).json(JSON.parse(cachedData));
    }

    // Fetch monitor details
    const monitors = await prisma.monitor.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        url: true,
        status: true,
        lastCheckedAt: true,
        pingLogs: {
          orderBy: { createdAt: 'desc' },
          take: 90, // Show last 90 pings for historical grid representation
          select: {
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Format metrics (uptime percentage, status grid)
    const formattedStatus = monitors.map((m: any) => {
      const logs = m.pingLogs;
      const totalPings = logs.length;
      const successfulPings = logs.filter((l: any) => l.status >= 200 && l.status < 400).length;
      const uptimePercent = totalPings > 0 ? Math.round((successfulPings / totalPings) * 100) : 100;

      return {
        id: m.id,
        name: m.name,
        url: m.url,
        status: m.status as MonitorStatus,
        lastCheckedAt: m.lastCheckedAt ? m.lastCheckedAt.toISOString() : null,
        uptimePercent,
        history: logs.map((l: any) => ({
          status: l.status,
          createdAt: l.createdAt.toISOString(),
        })).reverse(), // Oldest to newest
      };
    });

    const responsePayload = {
      systemOperational: monitors.every((m: any) => m.status === 'UP'),
      monitors: formattedStatus,
      updatedAt: new Date().toISOString(),
    };

    // Cache metrics for 60 seconds
    await cache.set(cacheKey, JSON.stringify(responsePayload), 60);

    return res.status(200).json(responsePayload);
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Internal server error' });
  }
};

// Secured Endpoint to trigger scheduled pings
export const runScheduledChecks = async (req: Request, res: Response) => {
  const cronSecretHeader = req.headers['x-cron-secret'];

  if (cronSecretHeader !== CRON_SECRET) {
    return res.status(401).json({ message: 'Unauthorized: Invalid cron secret key' });
  }

  try {
    const result = await runDueUptimeChecks();

    return res.status(200).json({
      message: 'Uptime cron check run completed',
      ...result,
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Internal server error' });
  }
};

// Authenticated Admin Dashboard Stats
export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const monitors = await prisma.monitor.findMany({
      include: {
        pingLogs: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
      },
    });

    const totalMonitors = monitors.length;
    const upCount = monitors.filter((m: any) => m.status === 'UP').length;
    const downCount = monitors.filter((m: any) => m.status === 'DOWN').length;
    const degradedCount = monitors.filter((m: any) => m.status === 'DEGRADED').length;
    const pendingCount = monitors.filter((m: any) => m.status === 'PENDING').length;

    // Uptime percentage across all monitors
    let totalUptimeSum = 0;
    monitors.forEach((m: any) => {
      const logs = m.pingLogs;
      if (logs.length === 0) {
        totalUptimeSum += 100;
      } else {
        const successes = logs.filter((l: any) => l.status >= 200 && l.status < 400).length;
        totalUptimeSum += (successes / logs.length) * 100;
      }
    });

    const averageUptimePercent = totalMonitors > 0 ? Math.round(totalUptimeSum / totalMonitors) : 100;

    return res.status(200).json({
      totalMonitors,
      upCount,
      downCount,
      degradedCount,
      pendingCount,
      averageUptimePercent,
    });
  } catch (err: any) {
    return res.status(500).json({ message: err.message || 'Internal server error' });
  }
};
