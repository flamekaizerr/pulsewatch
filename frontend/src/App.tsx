import { useEffect, useState } from 'react';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import { Activity, LogOut, LayoutDashboard } from 'lucide-react';
import { api } from './services/api.js';
import { User } from '@shared/types.js';
import Login from './pages/Login.tsx';
import Dashboard from './pages/Dashboard.tsx';
import MonitorDetail from './pages/MonitorDetail.tsx';
import StatusPage from './pages/StatusPage.tsx';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const checkAuth = async () => {
    try {
      const res = await api.get('/auth/me');
      setUser(res.data.user);
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
      setUser(null);
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-darkBg text-slate-100">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-emerald-500"></div>
      </div>
    );
  }

  const isPublicStatusPage = location.pathname === '/status';

  return (
    <div className="flex flex-col min-h-screen bg-darkBg text-slate-100 font-sans">
      {/* Navigation Header */}
      {!isPublicStatusPage && (
        <header className="border-b border-darkBorder bg-darkCard/80 backdrop-blur-md sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center space-x-2">
              <Activity className="h-6 w-6 text-emerald-400" />
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
                PulseWatch
              </span>
            </Link>

            <nav className="flex items-center space-x-4">
              <Link to="/status" className="text-sm font-medium text-slate-300 hover:text-slate-100 transition-colors">
                Public Status
              </Link>
              {user ? (
                <>
                  <Link to="/dashboard" className="flex items-center space-x-1 text-sm font-medium text-slate-300 hover:text-slate-100 transition-colors">
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                  <div className="h-4 w-px bg-darkBorder"></div>
                  <span className="text-xs text-slate-400 font-mono hidden md:inline">
                    {user.email}
                  </span>
                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-1 text-xs font-semibold text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-1.5 rounded-lg border border-rose-500/20 transition-all"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-darkBg px-4 py-2 rounded-lg font-medium transition-all shadow-md hover:shadow-emerald-500/20"
                  >
                    Admin Sign In
                  </Link>
                </>
              )}
            </nav>
          </div>
        </header>
      )}

      {/* Main Page Area */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Routes>
          <Route path="/" element={user ? <Dashboard /> : <Login setUser={setUser} />} />
          <Route path="/login" element={<Login setUser={setUser} />} />
          <Route path="/dashboard" element={user ? <Dashboard /> : <Login setUser={setUser} />} />
          <Route path="/monitors/:id" element={user ? <MonitorDetail /> : <Login setUser={setUser} />} />
          <Route path="/status" element={<StatusPage />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="border-t border-darkBorder/60 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between space-y-2 sm:space-y-0">
          <p>© 2026 PulseWatch. Built for Khalid's Engineering Portfolio.</p>
          <div className="flex space-x-4">
            <Link to="/status" className="hover:text-slate-400 transition-colors">Public Page</Link>
            <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-slate-400 transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
