import React, { useState } from 'react';
import { useMasterAdmin } from '../../context/MasterAdminContext';
import { unifiedAuthService } from '../../services/unifiedAuthService';
import { firebaseAuthService } from '../../services/firebaseAuthService';
import { Crown, Lock, Mail, ArrowRight, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { ForgotPasswordModal } from '../../components/auth/ForgotPasswordModal';

export const MasterLoginPage: React.FC = () => {
  const { setMasterRoute } = useMasterAdmin();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  // First-time password change modal state
  const [changePassModal, setChangePassModal] = useState<{
    isOpen: boolean;
    accountId: string;
    newPass: string;
    confirmPass: string;
  } | null>(null);

  const handleGoogleLogin = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      const res = await firebaseAuthService.loginMasterAdminWithGoogle();
      if (res.success && res.role === 'platform_master_admin') {
        setMasterRoute('dashboard');
        window.location.hash = '#/master/dashboard';
      } else if (res.success) {
        setError(`Access Denied: Google account "${res.user?.email}" is not authorized as a Master Admin.`);
      } else {
        setError(res.error || 'Google sign-in failed.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to authenticate with Google.');
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    let res = await firebaseAuthService.login(email, password, 'MASTER_ADMIN');
    if (!res.success) {
      const fallback = unifiedAuthService.loginMasterAdmin(email, password);
      if (fallback.success && fallback.session) {
        res = { success: true, session: fallback.session, account: fallback.session.account as any };
      }
    }
    if (res.success && res.session) {
      localStorage.setItem('studio_os_master_token', res.session.token);
      localStorage.setItem('studio_os_session_token', res.session.token);
      localStorage.setItem('studio_os_user_role', 'platform_master_admin');

      if (res.session.account.mustChangePassword) {
        setChangePassModal({
          isOpen: true,
          accountId: res.session.account.id,
          newPass: '',
          confirmPass: ''
        });
        return;
      }

      setMasterRoute('dashboard');
      window.location.hash = '#/master/dashboard';
    } else {
      setError(res.error || 'Invalid Master Admin credentials');
    }
  };

  const handlePasswordChangeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!changePassModal) return;
    if (changePassModal.newPass.length < 12) {
      alert('Password must be at least 12 characters long.');
      return;
    }
    const hasUpper = /[A-Z]/.test(changePassModal.newPass);
    const hasLower = /[a-z]/.test(changePassModal.newPass);
    const hasDigit = /[0-9]/.test(changePassModal.newPass);
    const hasSymbol = /[!@#$%&*]/.test(changePassModal.newPass);
    if (!hasUpper || !hasLower || !hasDigit || !hasSymbol) {
      alert('Password must include uppercase, lowercase, numbers, and symbols (!@#$%&*).');
      return;
    }
    if (changePassModal.newPass !== changePassModal.confirmPass) {
      alert('Passwords do not match.');
      return;
    }

    try {
      unifiedAuthService.changePassword(changePassModal.accountId, changePassModal.newPass);
      alert('Password successfully updated! Redirecting to Master Console...');
      setChangePassModal(null);
      setMasterRoute('dashboard');
      window.location.hash = '#/master/dashboard';
    } catch (err: any) {
      alert(err.message || 'Failed to update password');
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
          <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200/80 mb-2">
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

        {/* Google One-Tap Sign In for Master Admin */}
        <div className="mb-6 space-y-3">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
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
            <span>{googleLoading ? 'Connecting Google Account...' : 'Continue with Google (Master Admin)'}</span>
          </button>

          <div className="relative flex items-center justify-center my-2">
            <div className="border-t border-zinc-200 w-full" />
            <span className="bg-white px-2 text-xs uppercase font-bold text-zinc-400 absolute">
              Or with master credentials
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Registered Master Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-3.5" />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="e.g. jarsaniya.abhay@gmail.com"
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

          <div className="flex justify-end -mt-1">
            <button
              type="button"
              onClick={() => setShowForgotPassword(true)}
              className="text-xs font-medium text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer"
            >
              Forgot Password?
            </button>
          </div>

          <button
            type="submit"
            className="w-full min-h-[48px] py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all mt-2 cursor-pointer active:scale-95"
          >
            <span>Sign In to Studio OS Master Console</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-zinc-100 flex flex-col items-center gap-2.5 text-xs text-zinc-500">
          <div className="flex items-center gap-3">
            <a
              href="#/studio/login"
              className="text-zinc-600 hover:text-zinc-900 font-semibold underline underline-offset-2 transition-colors cursor-pointer"
            >
              Studio Owner Login
            </a>
            <span className="text-zinc-300">•</span>
            <a
              href="#/employee/login"
              className="text-zinc-600 hover:text-zinc-900 font-semibold underline underline-offset-2 transition-colors cursor-pointer"
            >
              Employee Portal
            </a>
          </div>
          <span className="text-xs text-zinc-400">Studio OS Multi-Studio Master Platform • Level 1 Access Only</span>
        </div>
      </div>

      {/* Mandatory First-Time Password Change Modal */}
      {changePassModal?.isOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-zinc-100 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900">First-Time Login Security</h3>
                <p className="text-xs text-zinc-500">Please establish your permanent secure password</p>
              </div>
            </div>

            <div className="p-3 bg-amber-50/80 border border-amber-200/60 rounded-xl text-xs text-amber-800 leading-relaxed">
              <strong>Requirement:</strong> At least 12 characters, including uppercase, lowercase, numbers, and symbols (!@#$%&*).
            </div>

            <form onSubmit={handlePasswordChangeSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">New Secure Password</label>
                <input
                  type="password"
                  value={changePassModal.newPass}
                  onChange={e => setChangePassModal({ ...changePassModal, newPass: e.target.value })}
                  placeholder="Min. 12 characters with symbols"
                  className="w-full px-3 py-2.5 bg-white border border-zinc-300 rounded-xl text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={changePassModal.confirmPass}
                  onChange={e => setChangePassModal({ ...changePassModal, confirmPass: e.target.value })}
                  placeholder="Re-type new password"
                  className="w-full px-3 py-2.5 bg-white border border-zinc-300 rounded-xl text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900"
                  required
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setChangePassModal(null);
                    setMasterRoute('dashboard');
                    window.location.hash = '#/master/dashboard';
                  }}
                  className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  Skip for Now
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer shadow-sm"
                >
                  Save & Continue
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
        portalTitle="Master Admin"
        defaultEmail={email.includes('@') ? email : 'masteradmin@studioos.internal'}
      />
    </div>
  );
};
