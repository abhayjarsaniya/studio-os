import React, { useState, useEffect } from 'react';
import { realAccountProvisionService, SetupTokenRecord } from '../../services/realAccountProvisionService';
import { Camera, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';

export const PasswordSetupPage: React.FC = () => {
  const [token, setToken] = useState<string>('');
  const [emailParam, setEmailParam] = useState<string>('');
  const [tokenRecord, setTokenRecord] = useState<SetupTokenRecord | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Parse token and email from window.location.hash or query params
  useEffect(() => {
    const parseUrl = () => {
      let rawQuery = '';
      if (window.location.hash.includes('?')) {
        rawQuery = window.location.hash.split('?')[1];
      } else if (window.location.search) {
        rawQuery = window.location.search.substring(1);
      }

      const params = new URLSearchParams(rawQuery);
      const parsedToken = params.get('token') || params.get('oobCode') || '';
      const parsedEmail = params.get('email') || '';

      setToken(parsedToken);
      setEmailParam(parsedEmail);

      if (!parsedToken) {
        setTokenError('Activation link is incomplete or missing a valid token. Please check your invitation email.');
        return;
      }

      const verifyRes = realAccountProvisionService.verifySetupToken(parsedToken, parsedEmail);
      if (!verifyRes.valid || !verifyRes.record) {
        setTokenError(verifyRes.error || 'This setup link is invalid or has already been used.');
      } else {
        setTokenRecord(verifyRes.record);
        setTokenError(null);
      }
    };

    parseUrl();
    window.addEventListener('hashchange', parseUrl);
    return () => window.removeEventListener('hashchange', parseUrl);
  }, []);

  // Password Strength Indicators
  const hasMinLength = password.length >= 8;
  const hasNumber = /[0-9]/.test(password);
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);
  const isMatch = password && password === confirmPassword;
  const isFormValid = hasMinLength && hasNumber && hasLetter && isMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isFormValid) {
      if (!hasMinLength) {
        setErrorMessage('Password must be at least 8 characters long.');
        return;
      }
      if (!hasLetter || !hasNumber) {
        setErrorMessage('Password must contain both letters and numbers.');
        return;
      }
      if (!isMatch) {
        setErrorMessage('Passwords do not match.');
        return;
      }
    }

    setLoading(true);
    try {
      const email = tokenRecord?.email || emailParam;
      const res = await realAccountProvisionService.completeInitialPasswordSetup(token, email, password);

      if (res.success) {
        setSuccess(true);
      } else {
        setErrorMessage(res.error || 'Failed to complete password setup. Please try again.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during password setup.');
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToLogin = () => {
    window.location.hash = '#/studio/login';
  };

  return (
    <div className="min-h-screen w-full bg-zinc-50 flex flex-col justify-center items-center p-4 selection:bg-zinc-200 font-sans">
      <div className="w-full max-w-md bg-white border border-zinc-200/90 rounded-3xl p-6 sm:p-8 shadow-xl shadow-zinc-200/50 relative overflow-hidden">
        {/* Decorative ambient background */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 text-white flex items-center justify-center shadow-md shadow-zinc-400/20 mb-3.5">
            <Camera className="w-7 h-7 text-orange-400 stroke-[2.2]" />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-orange-600 mb-1">
            Studio OS Onboarding
          </span>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight font-display">
            Set Your Password
          </h1>
          <p className="text-xs text-zinc-500 mt-1 max-w-xs">
            {tokenRecord?.studioName ? `Activate your account for ${tokenRecord.studioName}` : 'Activate your account and initialize your Studio Dashboard'}
          </p>
        </div>

        {/* Success State */}
        {success ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900">Account Successfully Activated!</h2>
              <p className="text-xs text-zinc-600 mt-1">
                Your password has been securely saved. You can now log in using your registered email address:
              </p>
              <div className="mt-2 py-1.5 px-3 bg-zinc-100 rounded-lg text-xs font-bold text-zinc-800 inline-block font-mono">
                {tokenRecord?.email || emailParam}
              </div>
            </div>

            <button
              onClick={handleProceedToLogin}
              className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-gradient-to-r from-orange-500 via-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-sm tracking-tight shadow-md shadow-orange-500/25 transition-all cursor-pointer touch-manipulation active:scale-[0.98] flex items-center justify-center gap-2 mt-4"
            >
              <span>Continue to Studio OS Login</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : tokenError ? (
          /* Error State (Invalid/Expired token) */
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900">Setup Link Expired or Invalid</h2>
              <p className="text-xs text-rose-700 mt-2 px-2">
                {tokenError}
              </p>
            </div>
            <div className="pt-2">
              <button
                onClick={() => window.location.hash = '#/studio/login'}
                className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs tracking-tight transition-all cursor-pointer touch-manipulation"
              >
                Back to Login Page
              </button>
            </div>
          </div>
        ) : (
          /* Password Setup Form */
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Account Details Banner */}
            <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-xs space-y-1">
              <div className="text-zinc-400 font-medium text-xs uppercase tracking-wider">Account Identity</div>
              <div className="font-bold text-zinc-800 truncate font-mono">
                {tokenRecord?.email || emailParam}
              </div>
              <div className="text-zinc-500 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Role: {tokenRecord?.role === 'studio_owner' ? 'Studio Owner' : 'Crew Employee'}</span>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {errorMessage}
              </div>
            )}

            {/* New Password */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Create a strong password (min 8 chars)"
                  className="w-full pl-9 pr-10 py-2.5 bg-white border border-zinc-300 rounded-xl text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                  required
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-600 p-0.5 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                  className="w-full pl-9 pr-3 py-2.5 bg-white border border-zinc-300 rounded-xl text-xs text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                  required
                />
              </div>
            </div>

            {/* Real-Time Password Strength Badges */}
            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl space-y-1.5 text-xs">
              <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">Security Criteria</div>
              <div className="grid grid-cols-2 gap-1.5 text-xs">
                <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-700 font-semibold' : 'text-zinc-400'}`}>
                  <CheckCircle2 className={`w-3.5 h-3.5 ${hasMinLength ? 'text-emerald-600' : 'text-zinc-300'}`} />
                  <span>8+ characters</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-700 font-semibold' : 'text-zinc-400'}`}>
                  <CheckCircle2 className={`w-3.5 h-3.5 ${hasNumber ? 'text-emerald-600' : 'text-zinc-300'}`} />
                  <span>Includes a number</span>
                </div>
                <div className={`flex items-center gap-1.5 ${hasLetter ? 'text-emerald-700 font-semibold' : 'text-zinc-400'}`}>
                  <CheckCircle2 className={`w-3.5 h-3.5 ${hasLetter ? 'text-emerald-600' : 'text-zinc-300'}`} />
                  <span>Includes letters</span>
                </div>
                <div className={`flex items-center gap-1.5 ${isMatch ? 'text-emerald-700 font-semibold' : 'text-zinc-400'}`}>
                  <CheckCircle2 className={`w-3.5 h-3.5 ${isMatch ? 'text-emerald-600' : 'text-zinc-300'}`} />
                  <span>Passwords match</span>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || !isFormValid}
              className={`w-full min-h-[48px] px-4 py-3 rounded-xl font-bold text-sm tracking-tight shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer touch-manipulation active:scale-[0.98] ${
                isFormValid && !loading
                  ? 'bg-gradient-to-r from-orange-500 via-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-orange-500/25'
                  : 'bg-zinc-200 text-zinc-400 cursor-not-allowed shadow-none'
              }`}
            >
              {loading ? (
                <span>Activating Account...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Activate Account & Complete Setup</span>
                </>
              )}
            </button>

            <div className="text-center pt-2">
              <a
                href="#/studio/login"
                className="text-xs text-zinc-500 hover:text-zinc-800 transition-colors"
              >
                Already set your password? <span className="font-bold underline">Sign In</span>
              </a>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
