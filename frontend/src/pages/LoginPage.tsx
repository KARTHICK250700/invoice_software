import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

const FEATURES = [
  { icon: '🚗', label: 'Vehicle Management',   desc: 'Full service history & tracking' },
  { icon: '🧾', label: 'Invoice Generation',   desc: 'GST-compliant professional bills'  },
  { icon: '👥', label: 'Client Database',       desc: 'Smart customer profiles'           },
  { icon: '📊', label: 'Reports & Analytics',   desc: 'Revenue trends at a glance'        },
];

export default function LoginPage() {
  const [username, setUsername]         = useState('');
  const [password, setPassword]         = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading]       = useState(false);
  const [error, setError]               = useState('');

  const { login }  = useAuth();
  const navigate   = useNavigate();

  const [slowWarning, setSlowWarning] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setIsLoading(true);
    setError('');
    setSlowWarning(false);
    // Show "waking up server" message if login takes >5 seconds (Render cold start)
    const slowTimer = setTimeout(() => setSlowWarning(true), 5000);
    try {
      const ok = await login(username.trim(), password);
      clearTimeout(slowTimer);
      if (ok) navigate('/dashboard');
      else    setError('Invalid username or password. Please try again.');
    } catch {
      clearTimeout(slowTimer);
      setError('Connection failed. Please check your network and retry.');
    } finally {
      setIsLoading(false);
      setSlowWarning(false);
    }
  };

  return (
    <div className="min-h-screen flex">

      {/* ── LEFT PANEL ─────────────────────────────────────────────────────── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[520px] shrink-0 px-14 py-12"
        style={{ background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)' }}
      >
        {/* Brand */}
        <div>
          <div className="flex items-center gap-4 mb-12">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg"
              style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
            >
              OM
            </div>
            <div>
              <p className="text-white font-bold text-xl leading-tight">Om Murugan Auto</p>
              <p className="text-slate-400 text-sm mt-0.5">Service Management System</p>
            </div>
          </div>

          <h2 className="text-4xl font-extrabold text-white leading-tight mb-4">
            Run your workshop<br />
            <span style={{ color: '#f97316' }}>like a pro.</span>
          </h2>
          <p className="text-slate-400 text-base leading-relaxed max-w-sm">
            Manage invoices, track vehicles, and grow your business — all from one clean dashboard.
          </p>
        </div>

        {/* Features */}
        <div className="space-y-4 my-10">
          {FEATURES.map(f => (
            <div key={f.label} className="flex items-center gap-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                style={{ background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.25)' }}
              >
                {f.icon}
              </div>
              <div>
                <p className="text-white text-sm font-semibold">{f.label}</p>
                <p className="text-slate-500 text-xs">{f.desc}</p>
              </div>
              <CheckCircle2 className="w-4 h-4 ml-auto shrink-0" style={{ color: '#f97316' }} />
            </div>
          ))}
        </div>

        {/* Footer */}
        <p className="text-slate-600 text-xs">© {new Date().getFullYear()} Om Murugan Auto · All rights reserved</p>
      </div>

      {/* ── RIGHT PANEL ────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center bg-white px-6 py-12">

        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-3 mb-10">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-black text-sm"
            style={{ background: 'linear-gradient(135deg, #f97316, #ea580c)' }}
          >
            OM
          </div>
          <div>
            <p className="font-bold text-gray-900 leading-tight">Om Murugan Auto</p>
            <p className="text-gray-500 text-xs">Service Management</p>
          </div>
        </div>

        <div className="w-full max-w-[400px]">

          {/* Heading */}
          <div className="mb-8">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-1">Welcome back</h1>
            <p className="text-gray-500 text-sm">Sign in to your account to continue</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Cold-start warning */}
          {slowWarning && !error && (
            <div className="mb-5 flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl px-4 py-3 text-sm">
              <Loader2 className="w-4 h-4 mt-0.5 shrink-0 animate-spin" />
              <span>Server is waking up, please wait a few seconds…</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-semibold text-gray-700 mb-1.5">
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter your username"
                required
                disabled={isLoading}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm placeholder-gray-400
                           focus:outline-none focus:ring-2 focus:border-transparent transition-all disabled:opacity-50"
                style={{ ['--tw-ring-color' as any]: '#f97316' }}
                onFocus={e => e.currentTarget.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.2)'}
                onBlur={e => e.currentTarget.style.boxShadow = 'none'}
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  disabled={isLoading}
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm placeholder-gray-400
                             focus:outline-none focus:ring-2 focus:border-transparent transition-all disabled:opacity-50"
                  onFocus={e => e.currentTarget.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.2)'}
                  onBlur={e => e.currentTarget.style.boxShadow = 'none'}
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading || !username.trim() || !password}
              className="w-full py-3.5 rounded-xl text-white font-bold text-sm transition-all duration-200 flex items-center justify-center gap-2 mt-2
                         disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: isLoading || !username.trim() || !password
                  ? '#9ca3af'
                  : 'linear-gradient(135deg, #f97316, #ea580c)',
                boxShadow: isLoading || !username.trim() || !password
                  ? 'none'
                  : '0 4px 14px rgba(249,115,22,0.4)',
              }}
            >
              {isLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-7 flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-gray-400 text-xs font-medium">credentials</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* Credentials hint */}
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-5 py-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Default Login</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-gray-400 mb-1">Username</p>
                <code className="block bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono text-gray-800">
                  admin
                </code>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-1">Password</p>
                <code className="block bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono text-gray-800">
                  Avan@123
                </code>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
