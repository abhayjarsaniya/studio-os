import React, { useState } from 'react';
import { firebaseAuthService } from '../services/firebaseAuthService';
import { unifiedAuthService } from '../services/unifiedAuthService';
import { Lock, Mail, ArrowRight, ShieldCheck, Camera, Eye, EyeOff } from 'lucide-react';
import { ForgotPasswordModal } from '../components/auth/ForgotPasswordModal';

export const StudioLoginPage: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // First-time password change modal state
  const [changePassModal, setChangePassModal] = useState<{
    isOpen: boolean;
    accountId: string;
    targetRoute: string;
    newPass: string;
    confirmPass: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const cleanEmail = identifier.trim().toLowerCase();
      // Authenticate via firebaseAuthService with unifiedAuthService.login verification
      let res = await firebaseAuthService.login(cleanEmail, password);
      if (!res.success) {
        const fallback = unifiedAuthService.login(cleanEmail, password);
        if (fallback.success && fallback.session) {
          res = { 
            success: true, 
            session: fallback.session, 
            account: fallback.session.account as any 
          };
        }
      }
      if (res.success && res.session) {
        const account = res.session.account;
        const studioId = account.studioId || 'studio_shreeji_films';

        localStorage.setItem('studio_os_session_token', res.session.token);

        if (account.accountType === 'MASTER_ADMIN') {
          localStorage.setItem('studio_os_master_token', res.session.token);
          localStorage.setItem('studio_os_user_role', 'platform_master_admin');
        } else if (account.accountType === 'STUDIO_OWNER') {
          localStorage.setItem('studio_os_user_role', 'owner');
          localStorage.setItem('studio_os_active_studio_id_v2', studioId);
        } else {
          localStorage.setItem('studio_os_user_role', 'employee');
          localStorage.setItem('studio_os_active_studio_id_v2', studioId);
        }

        if (account.mustChangePassword) {
          setChangePassModal({
            isOpen: true,
            accountId: account.id,
            targetRoute: (res.session as any)?.targetRoute || '#/app/dashboard',
            newPass: '',
            confirmPass: ''
          });
          return;
        }

        window.location.hash = (res.session as any)?.targetRoute || (account.accountType === 'MASTER_ADMIN' ? '#/master/dashboard' : '#/app/dashboard');
      } else {
        setError(res.error || 'Invalid email or password.');
      }
    } catch (err: any) {
      setError(err?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChangeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!changePassModal) return;
    if (changePassModal.newPass.length < 6) {
      alert('Password must be at least 6 characters long.');
      return;
    }
    if (changePassModal.newPass !== changePassModal.confirmPass) {
      alert('Passwords do not match.');
      return;
    }

    try {
      unifiedAuthService.changePassword(changePassModal.accountId, changePassModal.newPass);
      alert('Password successfully updated! Redirecting...');
      const route = changePassModal.targetRoute;
      setChangePassModal(null);
      window.location.hash = route;
    } catch (err: any) {
      alert(err.message || 'Failed to update password');
    }
  };

  return (
    <div className="min-h-screen w-full bg-zinc-50 flex flex-col justify-center items-center p-4 selection:bg-zinc-200">
      <div className="w-full max-w-md bg-white border border-zinc-200/90 rounded-3xl p-6 sm:p-8 shadow-xl shadow-zinc-200/50 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Clean Logo & Welcome Header */}
        <div className="flex flex-col items-center text-center mb-7">
          <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 text-white flex items-center justify-center shadow-md shadow-zinc-400/20 mb-3.5">
            <Camera className="w-7 h-7 text-orange-400 stroke-[2.2]" />
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight font-display">
            Welcome to Studio OS
          </h1>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs text-center font-medium">
            {error}
          </div>
        )}

        {/* Single Common Login Form for Everyone */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email Address */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-3.5" />
              <input
                type="text"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                placeholder="Enter your registered email address"
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-zinc-300 rounded-xl text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-colors"
                required
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password with Show/Hide toggle */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-3.5" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full pl-9 pr-10 py-2.5 bg-white border border-zinc-300 rounded-xl text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 transition-colors"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-600 transition-colors p-0.5 cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Forgot Password */}
          <div className="flex justify-end -mt-1">
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer"
            >
              Forgot Password?
            </button>
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full min-h-[48px] py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all mt-2 cursor-pointer disabled:opacity-50 touch-manipulation"
          >
            <span>{loading ? 'Signing In...' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Mandatory First-Time Password Change Modal */}
      {changePassModal?.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-zinc-200 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-zinc-100">
              <ShieldCheck className="w-5 h-5 text-orange-500" />
              <h3 className="text-sm font-bold text-zinc-900">Set New Password</h3>
            </div>
            <p className="text-xs text-zinc-600">
              Please set a new password for your account to continue.
            </p>

            <form onSubmit={handlePasswordChangeSubmit} className="space-y-3 pt-2">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={changePassModal.newPass}
                  onChange={e => setChangePassModal(prev => prev ? { ...prev, newPass: e.target.value } : null)}
                  placeholder="Min 6 characters"
                  className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-xl text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={changePassModal.confirmPass}
                  onChange={e => setChangePassModal(prev => prev ? { ...prev, confirmPass: e.target.value } : null)}
                  placeholder="Re-enter password"
                  className="w-full px-3 py-2 bg-white border border-zinc-300 rounded-xl text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="submit"
                  className="px-5 min-h-[44px] py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs cursor-pointer touch-manipulation"
                >
                  Save Password & Continue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Forgot Password Modal */}
      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
        portalTitle="Studio OS"
        defaultEmail={identifier.includes('@') ? identifier : ''}
      />
    </div>
  );
};
