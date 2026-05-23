import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, ShieldCheck, AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';
import { api } from '../services/api.js';
import { MonitorStatus } from '@shared/types.js';

interface PublicMonitor {
  id: string;
  name: string;
  url: string;
  status: MonitorStatus;
  lastCheckedAt: string | null;
  uptimePercent: number;
  history: {
    status: number;
    createdAt: string;
  }[];
}

interface PublicStatusData {
  systemOperational: boolean;
  monitors: PublicMonitor[];
  updatedAt: string;
}

export default function StatusPage() {
  const [data, setData] = useState<PublicStatusData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      const res = await api.get('/status');
      setData(res.data);
    } catch (err) {
      console.error('Failed to fetch public status page data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Auto-poll status page details every 60 seconds
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20 bg-darkBg text-slate-100 min-h-screen">
        <RefreshCw className="animate-spin h-8 w-8 text-emerald-500" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-xl mx-auto my-20 text-center space-y-4">
        <AlertTriangle className="h-12 w-12 mx-auto text-rose-500 animate-bounce" />
        <h2 className="text-xl font-bold">Failed to load system status</h2>
        <p className="text-sm text-slate-400">Please verify that the backend API is up and running.</p>
        <button onClick={fetchStatus} className="px-4 py-2 bg-emerald-500 text-darkBg text-xs font-semibold rounded-lg">
          Try Again
        </button>
      </div>
    );
  }

  const allOperational = data.monitors.every((m) => m.status === 'UP');
  const someDegraded = data.monitors.some((m) => m.status === 'DEGRADED');

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-6">
      {/* Brand title */}
      <div className="flex items-center justify-between border-b border-darkBorder pb-4">
        <div className="flex items-center space-x-2">
          <Activity className="h-6 w-6 text-emerald-400" />
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
            PulseWatch Status
          </span>
        </div>
        <Link
          to="/"
          className="flex items-center space-x-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Dashboard Sign In</span>
        </Link>
      </div>

      {/* Global Status Banner */}
      <div
        className={`flex items-center space-x-4 border rounded-2xl p-6 ${
          allOperational
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            : someDegraded
            ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
            : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
        }`}
      >
        <div className="p-3 rounded-full bg-current/10">
          {allOperational ? <ShieldCheck className="h-8 w-8" /> : <AlertTriangle className="h-8 w-8" />}
        </div>
        <div>
          <h2 className="text-lg font-bold">
            {allOperational
              ? 'All Systems Operational'
              : someDegraded
              ? 'Partial Systems Degradation'
              : 'Some Systems Outages Detected'}
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Automatic checks verify endpoints every 15 minutes. Last updated:{' '}
            {new Date(data.updatedAt).toLocaleTimeString()}
          </p>
        </div>
      </div>

      {/* Public Monitors Availability list */}
      <div className="bg-darkCard border border-darkBorder rounded-2xl p-6 space-y-6">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 border-b border-darkBorder/60 pb-3">
          Endpoints availability logs
        </h3>

        <div className="space-y-6">
          {data.monitors.map((m) => {
            // Build the 90-day status bar list
            const historyCount = m.history.length;
            const emptyBarsCount = Math.max(90 - historyCount, 0);
            
            // Build bars representation
            const bars: string[] = [];
            // Fill initial blank history blocks (grey)
            for (let i = 0; i < emptyBarsCount; i++) {
              bars.push('bg-slate-700/30');
            }
            // Fill actual logs
            m.history.forEach((h) => {
              if (h.status >= 200 && h.status < 400) {
                bars.push('bg-emerald-500 hover:bg-emerald-400');
              } else if (h.status >= 400 && h.status < 500) {
                bars.push('bg-yellow-400 hover:bg-yellow-300');
              } else {
                bars.push('bg-rose-500 hover:bg-rose-400');
              }
            });

            return (
              <div key={m.id} className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div
                      className={`h-2.5 w-2.5 rounded-full ${
                        m.status === 'UP'
                          ? 'bg-emerald-400 glow-green'
                          : m.status === 'DOWN'
                          ? 'bg-rose-500 glow-red'
                          : m.status === 'DEGRADED'
                          ? 'bg-yellow-400 glow-yellow'
                          : 'bg-slate-500'
                      }`}
                    ></div>
                    <span className="font-bold text-sm text-slate-200">{m.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono hidden sm:inline truncate max-w-xs">{m.url}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs font-mono font-semibold">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] ${
                        m.status === 'UP'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : m.status === 'DOWN'
                          ? 'bg-rose-500/10 text-rose-400'
                          : 'bg-yellow-500/10 text-yellow-400'
                      }`}
                    >
                      {m.status}
                    </span>
                    <span className="text-teal-300">{m.uptimePercent}% Uptime</span>
                  </div>
                </div>

                {/* Uptime Status History Grid Block (90 bars) */}
                <div className="flex items-center space-x-[2px] h-6">
                  {bars.map((barClass, idx) => (
                    <div
                      key={idx}
                      className={`flex-grow h-4 rounded-sm transition-colors ${barClass}`}
                      title={
                        idx >= emptyBarsCount
                          ? `Ping #${idx - emptyBarsCount + 1}: Status ${m.history[idx - emptyBarsCount].status}`
                          : 'No data'
                      }
                    ></div>
                  ))}
                </div>

                <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono border-b border-darkBorder/40 pb-4">
                  <span>90 pings ago</span>
                  <span>Today</span>
                </div>
              </div>
            );
          })}

          {data.monitors.length === 0 && (
            <div className="text-center py-8 text-slate-500 text-xs">
              No monitors are currently active in public status views.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
