import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, LogIn, UserPlus } from 'lucide-react';
import { api } from '../services/api.js';
import { User } from '@shared/types.js';

interface LoginProps {
  setUser: (user: User) => void;
}

export default function Login({ setUser }: LoginProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const endpoint = isRegister ? '/auth/register' : '/auth/login';

    try {
      const res = await api.post(endpoint, { email, password });
      setUser(res.data.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/demo-login');
      setUser(res.data.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError('Demo login failed. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto my-12 bg-darkCard border border-darkBorder rounded-2xl p-8 shadow-xl">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center p-3 bg-emerald-500/10 rounded-xl mb-3 text-emerald-400 border border-emerald-500/20">
          <ShieldCheck className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">
          {isRegister ? 'Create Admin Account' : 'Admin Sign In'}
        </h2>
        <p className="text-xs text-slate-400 mt-1.5">
          Access PulseWatch configuration and live statistics.
        </p>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="admin@pulsewatch.com"
            className="w-full bg-darkBg border border-darkBorder focus:border-emerald-500/50 rounded-lg px-4 py-2.5 text-slate-200 placeholder-slate-600 focus:outline-none transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            className="w-full bg-darkBg border border-darkBorder focus:border-emerald-500/50 rounded-lg px-4 py-2.5 text-slate-200 placeholder-slate-600 focus:outline-none transition-colors"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center space-x-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-darkBg font-semibold py-2.5 rounded-lg transition-colors shadow-lg shadow-emerald-500/10 cursor-pointer"
        >
          {isRegister ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
          <span>{loading ? 'Authenticating...' : isRegister ? 'Register Admin' : 'Sign In'}</span>
        </button>
      </form>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-darkBorder"></div>
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-darkCard px-3 text-slate-500 font-semibold tracking-wider">Or Quick Onboard</span>
        </div>
      </div>

      <button
        onClick={handleDemoLogin}
        disabled={loading}
        className="w-full flex items-center justify-center space-x-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold py-2.5 rounded-lg transition-all cursor-pointer"
      >
        <span>⚡ Demo Guest Login</span>
      </button>

      <div className="text-center mt-6 text-xs text-slate-400">
        {isRegister ? (
          <button onClick={() => setIsRegister(false)} className="text-emerald-400 hover:underline">
            Already have an account? Sign In
          </button>
        ) : (
          <button onClick={() => setIsRegister(true)} className="text-emerald-400 hover:underline">
            Don't have an account? Register Admin
          </button>
        )}
      </div>
    </div>
  );
}
