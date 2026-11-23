import React, { useState } from 'react';
import { crossDeviceAuthService } from '../services/crossDeviceAuthService';
import { googleAuthInvitationService } from '../services/googleAuthInvitationService';
import { Camera, AlertCircle, Eye, EyeOff, Lock, User, ArrowRight, ShieldCheck } from 'lucide-react';

export const StudioLoginPage: React.FC = () => {
  const [loginId, setLoginId] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [googleLoading, setGoogleLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanId = loginId.trim();
    if (!cleanId) {
      setError('Please enter your Login ID or Username.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      const res = await crossDeviceAuthService.login(cleanId, password);
      if (res.success && res.targetRoute) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('studio_os_auth_changed'));
          window.dispatchEvent(new Event('studio_data_updated'));
          window.location.hash = res.targetRoute;
        }
      } else {
        setError(res.error || 'Invalid Login ID or password.');
      }
    } catch (err: any) {
      setError(err?.message || 'An error occurred during sign in.');
    } finally {
      setLoading(false);
    }
  };

  const handleContinueWithGoogle = async () => {
    setError(null);
    setGoogleLoading(true);

    try {
      const res = await googleAuthInvitationService.loginWithGoogle();
      if (res.success && res.targetRoute) {
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('studio_os_auth_changed'));
          window.dispatchEvent(new Event('studio_data_updated'));
          window.location.hash = res.targetRoute;
        }
      } else {
        setError(res.error || 'Authentication failed. Please verify your Google account.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to authenticate with Google.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-zinc-50 flex flex-col justify-center items-center p-4 selection:bg-orange-100 selection:text-orange-900 font-sans">
      <div className="w-full max-w-md bg-white border border-zinc-200/90 rounded-3xl p-6 sm:p-10 shadow-xl shadow-zinc-200/50 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -top-14 -right-14 w-40 h-40 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Studio OS Logo & Header */}
        <div className="flex flex-col items-center text-center mb-7">
          <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 text-white flex items-center justify-center shadow-md shadow-zinc-400/20 mb-3.5">
            <Camera className="w-8 h-8 text-orange-400 stroke-[2.2]" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 tracking-tight font-display">
            Welcome to Studio OS
          </h1>
          <p className="text-xs text-zinc-500 mt-1 max-w-xs font-medium">
            Photography & Cinematography Studio Operating System
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed font-medium">{error}</div>
          </div>
        )}

        {/* Experience 1: Studio Owner & Staff Login */}
        <form onSubmit={handlePasswordSignIn} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1.5 uppercase tracking-wider">
              Login ID / Username
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                autoCapitalize="none"
                autoCorrect="off"
                value={loginId}
                onChange={e => setLoginId(e.target.value)}
                placeholder="Enter your Login ID (e.g. aarav_patel)"
                className="w-full pl-10 pr-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-medium text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-400 absolute left-3.5 top-3.5" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full pl-10 pr-10 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-900 placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                className="absolute right-3.5 top-3 text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="w-full min-h-[46px] py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] disabled:opacity-60"
          >
            <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Clean Divider: Platform Administrator */}
        <div className="relative flex py-6 items-center">
          <div className="flex-grow border-t border-zinc-200"></div>
          <span className="flex-shrink mx-3 text-xs uppercase tracking-wider text-zinc-400 font-bold flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
            Platform Administrator
          </span>
          <div className="flex-grow border-t border-zinc-200"></div>
        </div>

        {/* Experience 2: Platform Administrator Login */}
        <div>
          <button
            type="button"
            onClick={handleContinueWithGoogle}
            disabled={googleLoading || loading}
            className="w-full min-h-[48px] py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-50 text-zinc-800 font-bold text-xs border border-zinc-300 shadow-xs hover:shadow transition-all flex items-center justify-center gap-3 cursor-pointer touch-manipulation active:scale-[0.99] disabled:opacity-60"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{googleLoading ? 'Connecting to Google...' : 'Continue with Google'}</span>
          </button>
          <p className="text-xs text-zinc-400 text-center mt-2">
            Restricted to authorized Master Admin (<span className="font-mono">jarsaniya.abhay@gmail.com</span>)
          </p>
        </div>

        {/* Minimal Footer */}
        <div className="mt-8 pt-4 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-400">
          <span>Enterprise Cloud 2026</span>
          <span className="font-medium text-zinc-400">Multi-Tenant Isolated</span>
        </div>
      </div>
    </div>
  );
};
