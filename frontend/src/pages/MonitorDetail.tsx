import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Play, Trash2, Edit2, CheckCircle2, AlertOctagon, Bell, BellOff, X } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { api } from '../services/api.js';
import { getSocket, connectSocket, disconnectSocket } from '../services/socket.js';
import { Monitor, PingLog, MonitorStatus } from '@shared/types.js';

export default function MonitorDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [monitor, setMonitor] = useState<Monitor | null>(null);
  const [logs, setLogs] = useState<PingLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  
  // Edit State
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editInterval, setEditInterval] = useState(15);
  const [editTimeout, setEditTimeout] = useState(5000);
  const [editDiscordAlerts, setEditDiscordAlerts] = useState(false);
  const [editError, setEditError] = useState('');

  const fetchMonitor = async () => {
    try {
      const res = await api.get(`/monitors/${id}`);
      setMonitor(res.data.monitor);
      setLogs(res.data.monitor.pingLogs || []);
      
      // Initialize edit fields
      setEditName(res.data.monitor.name);
      setEditUrl(res.data.monitor.url);
      setEditInterval(res.data.monitor.intervalMinutes);
      setEditTimeout(res.data.monitor.timeoutMs);
      setEditDiscordAlerts(res.data.monitor.discordAlerts);
    } catch (err) {
      console.error('Failed to load monitor details:', err);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitor();

    // Connect to WebSocket room for this monitor
    connectSocket();
    const socket = getSocket();
    
    socket.emit('join_monitor', id);

    // Listen for live pings specific to this monitor
    socket.on('ping_log', (newLog: PingLog) => {
      // Prepend to logs list
      setLogs((prev) => [newLog, ...prev.slice(0, 49)]); // Maintain top 50 logs

      // Update monitor status
      setMonitor((prev) => {
        if (!prev) return null;
        let newStatus: MonitorStatus = 'UP';
        if (newLog.status === -1 || newLog.status === -2 || newLog.status >= 500) {
          newStatus = 'DOWN';
        } else if (newLog.status >= 400 && newLog.status < 500) {
          newStatus = 'DEGRADED';
        }

        return {
          ...prev,
          status: newStatus,
          lastCheckedAt: newLog.createdAt,
        };
      });
    });

    return () => {
      socket.emit('leave_monitor', id);
      socket.off('ping_log');
      disconnectSocket();
    };
  }, [id]);

  const handleForceCheck = async () => {
    setChecking(true);
    try {
      await api.post(`/monitors/${id}/check`);
      // Visual feedback happens automatically via WebSockets log injection,
      // but we fetch monitor data as fallback
      await fetchMonitor();
    } catch (err) {
      alert('Manual check failed');
    } finally {
      setChecking(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this monitor?')) return;
    try {
      await api.delete(`/monitors/${id}`);
      navigate('/dashboard');
    } catch (err) {
      alert('Delete failed');
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError('');
    try {
      const res = await api.patch(`/monitors/${id}`, {
        name: editName,
        url: editUrl,
        intervalMinutes: Number(editInterval),
        timeoutMs: Number(editTimeout),
        discordAlerts: editDiscordAlerts,
      });
      setMonitor(res.data.monitor);
      setEditing(false);
    } catch (err: any) {
      setEditError(err.response?.data?.message || 'Failed to update monitor. Ensure URL includes http/https.');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <RefreshCw className="animate-spin h-8 w-8 text-emerald-500" />
      </div>
    );
  }

  if (!monitor) return null;

  // Format Recharts data (reverse to show chronological order)
  const chartData = [...logs]
    .reverse()
    .map((log) => ({
      time: new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      latency: log.status < 0 ? 0 : log.responseTimeMs, // Don't chart error pings
      status: log.status,
    }));

  return (
    <div className="space-y-8">
      {/* Detail Header navigation */}
      <div className="flex items-center justify-between">
        <Link
          to="/dashboard"
          className="flex items-center space-x-1.5 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Dashboard</span>
        </Link>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setEditing(!editing)}
            className="flex items-center space-x-1 text-xs font-semibold text-slate-300 hover:text-slate-100 bg-slate-500/10 border border-darkBorder px-3.5 py-2 rounded-lg transition-all cursor-pointer"
          >
            <Edit2 className="h-3.5 w-3.5" />
            <span>Edit settings</span>
          </button>
          <button
            onClick={handleForceCheck}
            disabled={checking}
            className="flex items-center space-x-1 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-darkBg px-3.5 py-2 rounded-lg transition-all disabled:opacity-50 cursor-pointer"
          >
            <Play className="h-3.5 w-3.5" />
            <span>{checking ? 'Checking...' : 'Check Now'}</span>
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center space-x-1 text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 px-3.5 py-2 rounded-lg transition-all cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Settings Edit Form Modal/Panel */}
      {editing && (
        <div className="bg-darkCard border border-darkBorder rounded-xl p-6 relative">
          <button onClick={() => setEditing(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-200">
            <X className="h-5 w-5" />
          </button>
          <h3 className="text-md font-bold mb-4">Edit Target Configurations</h3>
          
          {editError && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs p-3 rounded-lg mb-4">
              {editError}
            </div>
          )}

          <form onSubmit={handleSaveEdit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Friendly Name</label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full bg-darkBg border border-darkBorder rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Endpoint Target URL</label>
              <input
                type="url"
                required
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
                className="w-full bg-darkBg border border-darkBorder rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Check Interval</label>
              <select
                value={editInterval}
                onChange={(e) => setEditInterval(Number(e.target.value))}
                className="w-full bg-darkBg border border-darkBorder rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none"
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
                required
                value={editTimeout}
                onChange={(e) => setEditTimeout(Number(e.target.value))}
                className="w-full bg-darkBg border border-darkBorder rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none"
              />
            </div>
            <div className="flex items-center justify-between md:col-span-2 border-t border-darkBorder pt-4">
              <span className="text-xs font-semibold text-slate-400 uppercase">Discord Notifications Alerts</span>
              <button
                type="button"
                onClick={() => setEditDiscordAlerts(!editDiscordAlerts)}
                className={`flex items-center space-x-1 px-4 py-2 rounded-lg border text-xs font-semibold cursor-pointer ${
                  editDiscordAlerts
                    ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                    : 'bg-slate-500/5 border-darkBorder text-slate-500'
                }`}
              >
                {editDiscordAlerts ? <Bell className="h-3.5 w-3.5" /> : <BellOff className="h-3.5 w-3.5" />}
                <span>{editDiscordAlerts ? 'Active' : 'Muted'}</span>
              </button>
            </div>
            <div className="md:col-span-2 flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="px-4 py-2 bg-darkBg border border-darkBorder rounded-lg text-xs font-semibold text-slate-300 hover:text-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-darkBg rounded-lg text-xs font-bold cursor-pointer"
              >
                Save configurations
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Status Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-darkCard border border-darkBorder rounded-xl p-6 flex items-start space-x-4">
          <div
            className={`p-3 rounded-lg ${
              monitor.status === 'UP'
                ? 'bg-emerald-500/10 text-emerald-400'
                : monitor.status === 'DOWN'
                ? 'bg-rose-500/10 text-rose-400'
                : 'bg-yellow-500/10 text-yellow-400'
            }`}
          >
            {monitor.status === 'UP' ? <CheckCircle2 className="h-6 w-6" /> : <AlertOctagon className="h-6 w-6" />}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Availability Status</p>
            <p className="text-xl font-bold mt-1 text-slate-100">{monitor.status}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">
              {monitor.lastCheckedAt
                ? `Last check: ${new Date(monitor.lastCheckedAt).toLocaleString()}`
                : 'Never checked yet'}
            </p>
          </div>
        </div>

        <div className="bg-darkCard border border-darkBorder rounded-xl p-6">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Average Response Time</p>
          <p className="text-xl font-bold mt-1 text-emerald-400">
            {chartData.length > 0
              ? Math.round(chartData.reduce((acc, curr) => acc + curr.latency, 0) / chartData.length)
              : 0}{' '}
            ms
          </p>
          <p className="text-[10px] text-slate-500 mt-1">Calculated from the last {chartData.length} records</p>
        </div>

        <div className="bg-darkCard border border-darkBorder rounded-xl p-6">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Monitor URL</p>
          <p className="text-sm font-bold mt-1 text-slate-300 truncate">{monitor.url}</p>
          <p className="text-[10px] text-slate-500 mt-1.5 font-mono">
            Check Rate: every {monitor.intervalMinutes}m
          </p>
        </div>
      </div>

      {/* Latency History Chart */}
      <div className="bg-darkCard border border-darkBorder rounded-xl p-6">
        <h3 className="text-md font-bold mb-6 flex items-center justify-between">
          <span>Latency History (ms)</span>
          <span className="text-xs text-slate-400 font-mono">Real-time WebSocket Feed</span>
        </h3>
        <div className="h-72 w-full">
          {chartData.length === 0 ? (
            <div className="flex justify-center items-center h-full text-slate-500 text-xs">
              No ping measurements recorded yet. Click "Check Now" above to trigger a test.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid stroke="#334155" strokeDasharray="3 3" />
                <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} unit="ms" />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', borderRadius: '8px' }}
                  labelStyle={{ color: '#94a3b8', fontSize: '11px', fontWeight: 'bold' }}
                />
                <Line
                  type="monotone"
                  dataKey="latency"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ r: 3, stroke: '#0f172a', strokeWidth: 1 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Ping Logs List */}
      <div className="bg-darkCard border border-darkBorder rounded-xl p-6">
        <h3 className="text-md font-bold mb-4 border-b border-darkBorder pb-3">Uptime Response Logs</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="text-slate-400 border-b border-darkBorder uppercase font-semibold">
                <th className="py-2.5">Time</th>
                <th className="py-2.5">Response Time</th>
                <th className="py-2.5">Status Code</th>
                <th className="py-2.5">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-darkBorder/60">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-darkBg/30 transition-colors">
                  <td className="py-3 text-slate-300 font-mono">{new Date(log.createdAt).toLocaleString()}</td>
                  <td className="py-3 text-slate-300 font-mono">
                    {log.status < 0 ? '—' : `${log.responseTimeMs} ms`}
                  </td>
                  <td className="py-3 font-mono">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.status >= 200 && log.status < 400
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-rose-500/10 text-rose-400'
                      }`}
                    >
                      {log.status === -1 ? 'CONN_FAIL' : log.status === -2 ? 'TIMEOUT' : log.status}
                    </span>
                  </td>
                  <td className="py-3 text-slate-400">
                    {log.status >= 200 && log.status < 400 ? (
                      <span className="text-emerald-400/90 font-semibold">Healthy</span>
                    ) : (
                      <span className="text-rose-400 text-xs">{log.errorMsg || `Error HTTP status ${log.status}`}</span>
                    )}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500">
                    No ping logs captured yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
