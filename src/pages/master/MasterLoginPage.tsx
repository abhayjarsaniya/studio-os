import React, { useState } from 'react';
import { useMasterAdmin } from '../../context/MasterAdminContext';
import { unifiedAuthService } from '../../services/unifiedAuthService';
import { Crown, Lock, Mail, ArrowRight, Eye, EyeOff } from 'lucide-react';

export const MasterLoginPage: React.FC = () => {
  const { setMasterRoute } = useMasterAdmin();
  const [email, setEmail] = useState('masteradmin@studioos.internal');
  const [password, setPassword] = useState('MasterAdmin@2026');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = unifiedAuthService.loginMasterAdmin(email, password);
    if (res.success && res.session) {
      localStorage.setItem('studio_os_master_token', res.session.token);
      setMasterRoute('dashboard');
    } else {
      setError(res.error || 'Invalid Master Admin credentials');
    }
  };

  return (
    <div className="min-h-screen w-full bg-zinc-50 flex flex-col justify-center items-center p-4 selection:bg-amber-100 selection:text-amber-900">
      <div className="w-full max-w-md bg-white border border-zinc-200/90 rounded-3xl p-6 sm:p-8 shadow-xl shadow-zinc-200/50 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-rose-500/20 mb-4">
            <Crown className="w-8 h-8" />
          </div>
          <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200/80 mb-2">
            Level 1 Master Authority
          </span>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight font-display">Studio OS Master Console</h1>
          <p className="text-xs text-zinc-500 mt-1">Platform Owner & Multi-Studio Global Management</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Email / Username</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-3.5" />
              <input
                type="text"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter your email or username"
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-zinc-300 rounded-xl text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-colors"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Security Key / Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-3.5" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full pl-9 pr-10 py-2.5 bg-white border border-zinc-300 rounded-xl text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-colors"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-600 transition-colors p-0.5"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full min-h-[48px] py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all mt-2 cursor-pointer"
          >
            <span>Sign In to Studio OS Master Console</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-zinc-100 text-center text-[11px] text-zinc-400">
          Studio OS Multi-Studio Master Platform • Level 1 Access Only
        </div>
      </div>
    </div>
  );
};
