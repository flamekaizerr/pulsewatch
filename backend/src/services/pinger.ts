import { prisma } from '../config/database';
import { cache } from '../config/redis';
import { broadcastPingLog, broadcastStatusChange } from './socket';
import { sendStatusAlert } from './alerter';
import type { Monitor, MonitorStatus, PingLog } from '@shared/types';

type RunDueUptimeChecksOptions = {
  userId?: string;
  retentionDays?: number;
};

export type RunDueUptimeChecksResult = {
  monitorsChecked: number;
  logsWritten: number;
  logsPruned: number;
  timestamp: string;
};

export const runUptimeCheck = async (dbMonitor: any): Promise<PingLog> => {
  const start = Date.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), dbMonitor.timeoutMs);

  let statusCode = -1; // -1 represents connection error
  let errorMsg: string | null = null;
  let responseTimeMs = 0;

  try {
    const res = await fetch(dbMonitor.url, {
      method: 'GET',
      signal: controller.signal,
      headers: { 'User-Agent': 'PulseWatch/1.0 (Uptime Monitoring)' },
    });

    clearTimeout(timeoutId);
    responseTimeMs = Date.now() - start;
    statusCode = res.status;
  } catch (err: any) {
    clearTimeout(timeoutId);
    responseTimeMs = Date.now() - start;

    if (err.name === 'AbortError') {
      statusCode = -2; // -2 represents timeout
      errorMsg = `Connection timed out after ${dbMonitor.timeoutMs}ms`;
    } else {
      statusCode = -1;
      errorMsg = err.message || 'Network connection failed';
    }
  }

  // Determine status from status code
  let newStatus: MonitorStatus = 'UP';
  if (statusCode === -1 || statusCode === -2 || statusCode >= 500) {
    newStatus = 'DOWN';
  } else if (statusCode >= 400 && statusCode < 500) {
    newStatus = 'DEGRADED';
  }

  const oldStatus = dbMonitor.status as MonitorStatus;

  // Save log entry to database
  const createdLog = await prisma.pingLog.create({
    data: {
      monitorId: dbMonitor.id,
      status: statusCode,
      responseTimeMs,
      errorMsg,
    },
  });

  // Update monitor status & lastCheckedAt
  const updatedMonitor = await prisma.monitor.update({
    where: { id: dbMonitor.id },
    data: {
      status: newStatus,
      lastCheckedAt: new Date(),
    },
  });

  // Cast model format to match Shared Types
  const sharedMonitor: Monitor = {
    ...updatedMonitor,
    status: updatedMonitor.status as MonitorStatus,
    createdAt: updatedMonitor.createdAt.toISOString(),
    updatedAt: updatedMonitor.updatedAt.toISOString(),
    lastCheckedAt: updatedMonitor.lastCheckedAt ? updatedMonitor.lastCheckedAt.toISOString() : null,
  };

  const sharedLog: PingLog = {
    ...createdLog,
    createdAt: createdLog.createdAt.toISOString(),
  };

  // Broadcast ping log and status change via WebSockets
  broadcastPingLog(dbMonitor.id, sharedLog);

  if (oldStatus !== newStatus) {
    broadcastStatusChange(dbMonitor.id, newStatus);
    
    // Invalidate Redis cache for public status page if status changes
    await cache.del('public_status_page');

    // Trigger alert dispatch
    await sendStatusAlert(sharedMonitor, oldStatus, newStatus);
  }

  return sharedLog;
};

export const runDueUptimeChecks = async (
  options: RunDueUptimeChecksOptions = {}
): Promise<RunDueUptimeChecksResult> => {
  const activeMonitors = await prisma.monitor.findMany({
    where: {
      isActive: true,
      ...(options.userId ? { userId: options.userId } : {}),
    },
  });

  const now = new Date();
  const dueMonitors = activeMonitors.filter((monitor: any) => {
    if (!monitor.lastCheckedAt) return true;
    const nextCheckTime = new Date(monitor.lastCheckedAt.getTime() + monitor.intervalMinutes * 60 * 1000);
    return now >= nextCheckTime;
  });

  const results = await Promise.all(dueMonitors.map((monitor: any) => runUptimeCheck(monitor)));
  const prunedCount = await pruneOldPingLogs(options.retentionDays ?? 30);

  return {
    monitorsChecked: dueMonitors.length,
    logsWritten: results.length,
    logsPruned: prunedCount,
    timestamp: now.toISOString(),
  };
};

// Clean logs older than 30 days (default retention)
export const pruneOldPingLogs = async (retentionDays = 30): Promise<number> => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  try {
    const { count } = await prisma.pingLog.deleteMany({
      where: {
        createdAt: { lt: cutoffDate },
      },
    });
    return count;
  } catch (err) {
    console.error('Error pruning old ping logs:', err);
    return 0;
  }
};
