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

  // First-time password change modal state
  const [changePassModal, setChangePassModal] = useState<{
    isOpen: boolean;
    accountId: string;
    newPass: string;
    confirmPass: string;
  } | null>(null);

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
