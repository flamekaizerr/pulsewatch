export type MonitorStatus = 'UP' | 'DOWN' | 'DEGRADED' | 'PENDING';

export interface User {
  id: string;
  email: string;
  createdAt: string;
}

export interface Monitor {
  id: string;
  name: string;
  url: string;
  status: MonitorStatus;
  intervalMinutes: number;
  timeoutMs: number;
  isActive: boolean;
  userId: string;
  discordAlerts: boolean;
  createdAt: string;
  updatedAt: string;
  pingLogs?: PingLog[];
  lastCheckedAt?: string | null;
}

export interface PingLog {
  id: string;
  monitorId: string;
  status: number; // HTTP status code or error indicator (e.g. -1 for connection error, -2 for timeout)
  responseTimeMs: number;
  errorMsg?: string | null;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  message: string;
}

export interface DashboardStats {
  totalMonitors: number;
  upCount: number;
  downCount: number;
  degradedCount: number;
  pendingCount: number;
  averageUptimePercent: number;
}
