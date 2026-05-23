import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, Play, Activity, CheckCircle2, AlertOctagon, RefreshCw, Bell, BellOff, ArrowRight } from 'lucide-react';
import { api } from '../services/api.js';
import { getSocket, connectSocket, disconnectSocket } from '../services/socket.js';
import { Monitor, DashboardStats, MonitorStatus } from '@shared/types.js';

export default function Dashboard() {
  const [monitors, setMonitors] = useState<Monitor[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [cronRunning, setCronRunning] = useState(false);
  const [cronResult, setCronResult] = useState<string | null>(null);

  // Add Monitor Form State
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [intervalMinutes, setIntervalMinutes] = useState(15);
  const [timeoutMs, setTimeoutMs] = useState(5000);
  const [discordAlerts, setDiscordAlerts] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const [monitorsRes, statsRes] = await Promise.all([
        api.get('/monitors'),
        api.get('/dashboard/stats'),
      ]);
      setMonitors(monitorsRes.data.monitors);
      setStats(statsRes.data);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Setup Socket.io real-time connection
    connectSocket();
    const socket = getSocket();

    // Listen for live global ping logs
    socket.on('global_ping_log', (data: { monitorId: string; log: any }) => {
      // Re-calculate local monitor status/time
      setMonitors((prev) =>
        prev.map((m) => {
          if (m.id === data.monitorId) {
            let newStatus: MonitorStatus = 'UP';
            if (data.log.status === -1 || data.log.status === -2 || data.log.status >= 500) {
              newStatus = 'DOWN';
            } else if (data.log.status >= 400 && data.log.status < 500) {
              newStatus = 'DEGRADED';
            }

            return {
              ...m,
              status: newStatus,
              lastCheckedAt: data.log.createdAt,
            };
          }
          return m;
        })
      );

      // Re-fetch aggregate stats to keep metrics accurate
      api.get('/dashboard/stats').then((res) => setStats(res.data)).catch(() => {});
    });

    // Listen for state change broadcasts
    socket.on('status_change', (data: { monitorId: string; status: MonitorStatus }) => {
      setMonitors((prev) =>
        prev.map((m) => (m.id === data.monitorId ? { ...m, status: data.status } : m))
      );
    });

    return () => {
      socket.off('global_ping_log');
      socket.off('status_change');
      disconnectSocket();
    };
  }, []);

  const handleAddMonitor = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    try {
      const res = await api.post('/monitors', {
        name,
        url,
        intervalMinutes: Number(intervalMinutes),
        timeoutMs: Number(timeoutMs),
        discordAlerts,
      });

      setMonitors((prev) => [res.data.monitor, ...prev]);
      setName('');
      setUrl('');
      setIntervalMinutes(15);
      setTimeoutMs(5000);
      setDiscordAlerts(false);

      // Update stats counters
      const statsRes = await api.get('/dashboard/stats');
      setStats(statsRes.data);
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to create monitor. Ensure URL includes http/https.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMonitor = async (id: string) => {
    if (!confirm('Are you sure you want to delete this monitor and all its history?')) return;

    try {
      await api.delete(`/monitors/${id}`);
      setMonitors((prev) => prev.filter((m) => m.id !== id));

      // Refresh stats
      const statsRes = await api.get('/dashboard/stats');
      setStats(statsRes.data);
    } catch (err) {
      alert('Failed to delete monitor');
    }
  };

  const handleForceCheck = async (id: string) => {
    try {
      await api.post(`/monitors/${id}/check`);
      // Visual feedback: Socket.io handles list updating automatically.
      // But we can trigger a soft fetch to double-check
      fetchData();
    } catch (err) {
      alert('Failed to execute forced check');
    }
  };

  const handleRunAllCron = async () => {
    setCronRunning(true);
    setCronResult(null);
    try {
      // Calls local cron endpoint with dev secret
      const res = await api.post(
        '/internal/run-checks',
        {},
        {
          headers: {
            'x-cron-secret': 'dev_cron_secret_change_later',
          },
        }
      );
      setCronResult(
        `Checked ${res.data.monitorsChecked} monitors. Logs written: ${res.data.logsWritten}. Logs pruned: ${res.data.logsPruned}.`
      );
      fetchData();
    } catch (err: any) {
      setCronResult(`Error running cron: ${err.response?.data?.message || err.message}`);
    } finally {
      setCronRunning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <RefreshCw className="animate-spin h-8 w-8 text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Overview Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-darkCard border border-darkBorder rounded-2xl p-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Monitor Dashboard</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time latency charts and operational endpoints logs.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleRunAllCron}
            disabled={cronRunning}
            className="flex items-center space-x-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-darkBg text-xs font-bold px-4 py-2.5 rounded-lg transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${cronRunning ? 'animate-spin' : ''}`} />
            <span>{cronRunning ? 'Checking...' : 'Run Scheduled Cron Checks'}</span>
          </button>
        </div>
      </div>

      {cronResult && (
        <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs px-4 py-3 rounded-lg flex items-center justify-between">
          <span><strong>Cron Run Result:</strong> {cronResult}</span>
          <button onClick={() => setCronResult(null)} className="text-slate-400 hover:text-slate-200">Dismiss</button>
        </div>
      )}

      {/* Aggregate Stats Row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-darkCard border border-darkBorder rounded-xl p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Targets</p>
            <p className="text-2xl font-bold mt-1 text-slate-100">{stats.totalMonitors}</p>
          </div>
          <div className="bg-darkCard border border-darkBorder rounded-xl p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Operational</p>
            <p className="text-2xl font-bold mt-1 text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="h-5 w-5" />
              {stats.upCount}
            </p>
          </div>
          <div className="bg-darkCard border border-darkBorder rounded-xl p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Down / Degraded</p>
            <p className="text-2xl font-bold mt-1 text-rose-400 flex items-center gap-1.5">
              <AlertOctagon className="h-5 w-5" />
              {stats.downCount + stats.degradedCount}
            </p>
          </div>
          <div className="bg-darkCard border border-darkBorder rounded-xl p-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Average Uptime</p>
            <p className="text-2xl font-bold mt-1 text-teal-300">{stats.averageUptimePercent}%</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Create Monitor Card */}
        <div className="bg-darkCard border border-darkBorder rounded-xl p-6 h-fit">
          <h2 className="text-lg font-bold flex items-center gap-2 mb-4 border-b border-darkBorder pb-3">
            <Plus className="h-5 w-5 text-emerald-400" /> Add New Monitor
          </h2>

          {formError && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3 rounded-lg mb-4">
              {formError}
            </div>
          )}

          <form onSubmit={handleAddMonitor} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Friendly Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Google Homepage"
                className="w-full bg-darkBg border border-darkBorder focus:border-emerald-500/40 rounded-lg px-3.5 py-2 text-sm text-slate-200 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Target Endpoint URL</label>
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://google.com"
                className="w-full bg-darkBg border border-darkBorder focus:border-emerald-500/40 rounded-lg px-3.5 py-2 text-sm text-slate-200 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Interval (Mins)</label>
                <select
                  value={intervalMinutes}
                  onChange={(e) => setIntervalMinutes(Number(e.target.value))}
                  className="w-full bg-darkBg border border-darkBorder focus:border-emerald-500/40 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none"
                >
                  <option value={1}>1 Min</option>
                  <option value={5}>5 Mins</option>
                  <option value={15}>15 Mins</option>
                  <option value={30}>30 Mins</option>
                  <option value={60}>1 Hour</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Timeout (ms)</label>
                <input
                  type="number"
                  min={500}
                  max={30000}
                  required
                  value={timeoutMs}
                  onChange={(e) => setTimeoutMs(Number(e.target.value))}
                  className="w-full bg-darkBg border border-darkBorder focus:border-emerald-500/40 rounded-lg px-3.5 py-2 text-sm text-slate-200 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-darkBorder pt-4">
              <span className="text-xs font-semibold text-slate-400 uppercase">Discord Alerts</span>
              <button
                type="button"
                onClick={() => setDiscordAlerts(!discordAlerts)}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                  discordAlerts
                    ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                    : 'bg-slate-500/5 border-darkBorder text-slate-500'
                }`}
              >
                {discordAlerts ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
                <span>{discordAlerts ? 'Enabled' : 'Disabled'}</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center space-x-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-darkBg font-bold py-2.5 rounded-lg transition-colors cursor-pointer"
            >
              <span>{submitting ? 'Creating...' : 'Create Target'}</span>
            </button>
          </form>
        </div>

        {/* Right Side: Active Targets List */}
        <div className="lg:col-span-2 bg-darkCard border border-darkBorder rounded-xl p-6">
          <h2 className="text-lg font-bold mb-4 border-b border-darkBorder pb-3 flex items-center justify-between">
            <span>Monitored Endpoints</span>
            <span className="text-xs bg-darkBg border border-darkBorder px-2.5 py-1 rounded-full text-slate-400 font-mono font-semibold">
              {monitors.length} Targets
            </span>
          </h2>

          {monitors.length === 0 ? (
            <div className="text-center py-20 text-slate-500 space-y-2">
              <Activity className="h-10 w-10 mx-auto text-slate-600 animate-pulse" />
              <p>No endpoints configured for monitoring yet.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {monitors.map((m) => (
                <div
                  key={m.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-darkBorder bg-darkBg/50 hover:bg-darkBg/80 transition-all"
                >
                  <div className="flex items-start space-x-3.5">
                    {/* Status Circle Indicator */}
                    <div
                      className={`h-3 w-3 rounded-full mt-1.5 animate-pulse ${
                        m.status === 'UP'
                          ? 'bg-emerald-400 glow-green'
                          : m.status === 'DOWN'
                          ? 'bg-rose-500 glow-red'
                          : m.status === 'DEGRADED'
                          ? 'bg-yellow-400 glow-yellow'
                          : 'bg-slate-500'
                      }`}
                    ></div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-bold text-slate-200">{m.name}</h3>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            m.status === 'UP'
                              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                              : m.status === 'DOWN'
                              ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                              : m.status === 'DEGRADED'
                              ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                              : 'bg-slate-500/10 border-darkBorder text-slate-400'
                          }`}
                        >
                          {m.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 truncate max-w-sm mt-0.5">{m.url}</p>
                      <div className="flex items-center space-x-3 text-[10px] text-slate-500 font-mono mt-1">
                        <span>Int: {m.intervalMinutes}m</span>
                        <span>•</span>
                        <span>Timeout: {m.timeoutMs}ms</span>
                        {m.lastCheckedAt && (
                          <>
                            <span>•</span>
                            <span>Last check: {new Date(m.lastCheckedAt).toLocaleTimeString()}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Buttons */}
                  <div className="flex items-center space-x-2 sm:self-center">
                    <button
                      onClick={() => handleForceCheck(m.id)}
                      title="Run check now"
                      className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg border border-transparent hover:border-emerald-500/20 transition-all cursor-pointer"
                    >
                      <Play className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteMonitor(m.id)}
                      title="Delete target"
                      className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg border border-transparent hover:border-rose-500/20 transition-all cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <Link
                      to={`/monitors/${m.id}`}
                      className="flex items-center space-x-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/10 hover:border-emerald-500/20 px-3 py-2 rounded-lg transition-all"
                    >
                      <span>Details</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
