import React, { useState, useEffect } from 'react';
import { 
  googleAuthInvitationService, 
  StudioInvitationRecord, 
  AuthorizedStudioEmail, 
  GoogleAuthUser,
  StudioRegistrationData 
} from '../../services/googleAuthInvitationService';
import { 
  Camera, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Building2, 
  ShieldCheck, 
  ArrowRight, 
  Lock, 
  Phone, 
  MapPin, 
  Globe, 
  FileText 
} from 'lucide-react';

export const StudioRegistrationPage: React.FC = () => {
  const [token, setToken] = useState<string>('');
  const [validating, setValidating] = useState<boolean>(true);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<StudioInvitationRecord | null>(null);
  const [authorizedRecord, setAuthorizedRecord] = useState<AuthorizedStudioEmail | null>(null);

  // Authenticated Google User state
  const [googleUser, setGoogleUser] = useState<GoogleAuthUser | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState<boolean>(false);

  // Registration form state
  const [formData, setFormData] = useState<StudioRegistrationData>({
    name: '',
    ownerName: '',
    phone: '',
    address: '',
    city: 'Ahmedabad',
    state: 'Gujarat',
    pinCode: '380015',
    logoUrl: '',
    gstNumber: '',
    website: '',
    description: ''
  });

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [registrationSuccess, setRegistrationSuccess] = useState<boolean>(false);
  const [createdStudioId, setCreatedStudioId] = useState<string>('');

  useEffect(() => {
    // Extract token from URL search or hash parameters
    let rawToken = '';
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      rawToken = urlParams.get('token') || '';

      if (!rawToken && window.location.hash.includes('?')) {
        const hashQuery = window.location.hash.split('?')[1];
        const hashParams = new URLSearchParams(hashQuery);
        rawToken = hashParams.get('token') || '';
      }
    }

    setToken(rawToken);

    if (!rawToken) {
      setValidating(false);
      setValidationError('No invitation token found in the URL. Please use the exact link sent by Master Admin.');
      return;
    }

    googleAuthInvitationService
      .validateInvitationToken(rawToken)
      .then(res => {
        setValidating(false);
        if (res.valid && res.invitation) {
          setInvitation(res.invitation);
          setAuthorizedRecord(res.authorizedEmail || null);
          if (res.invitation.ownerName) {
            setFormData(prev => ({ ...prev, ownerName: res.invitation!.ownerName || '' }));
          }
        } else {
          setValidationError(res.error || 'This invitation token is invalid or has expired.');
        }
      })
      .catch(err => {
        setValidating(false);
        setValidationError(err.message || 'Error validating invitation token.');
      });
  }, []);

  const handleContinueWithGoogle = async () => {
    setAuthError(null);
    setIsSigningIn(true);
    try {
      const res = await googleAuthInvitationService.loginWithGoogle();
      if (res.user) {
        const cleanUserEmail = res.user.email.toLowerCase();
        const cleanInvitedEmail = invitation?.email.toLowerCase();

        if (cleanInvitedEmail && cleanUserEmail !== cleanInvitedEmail) {
          setAuthError(
            `Account mismatch: This invitation was authorized for "${cleanInvitedEmail}". You signed in as "${cleanUserEmail}". Please sign in with the authorized Google account.`
          );
          setIsSigningIn(false);
          return;
        }

        setGoogleUser(res.user);
        setFormData(prev => ({
          ...prev,
          ownerName: prev.ownerName || res.user?.displayName || ''
        }));

        // If it was an employee invitation, register employee immediately!
        if (invitation?.type === 'employee') {
          const empRes = await googleAuthInvitationService.registerEmployeeWithGoogle(token, res.user);
          if (empRes.success) {
            setRegistrationSuccess(true);
            setCreatedStudioId(empRes.studioId);
            setTimeout(() => {
              window.location.hash = '#/employee/dashboard';
            }, 1500);
            return;
          } else {
            setAuthError(empRes.error || 'Failed to complete employee registration.');
          }
        }
      } else {
        setAuthError(res.error || 'Google authentication was not completed.');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Error during Google sign-in.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleRegisterStudio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleUser) return;
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const res = await googleAuthInvitationService.registerStudioWithOwner(token, googleUser, formData);
      if (res.success) {
        setRegistrationSuccess(true);
        setCreatedStudioId(res.studioId);
        setTimeout(() => {
          window.location.hash = '#/app/dashboard';
        }, 1500);
      } else {
        setSubmitError(res.error || 'Failed to register studio.');
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Error during studio registration.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-zinc-50 flex flex-col justify-center items-center p-4 sm:p-6 selection:bg-orange-100 selection:text-orange-900 font-sans">
      <div className="w-full max-w-xl bg-white border border-zinc-200/90 rounded-3xl p-6 sm:p-10 shadow-xl shadow-zinc-200/50 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -top-16 -right-16 w-44 h-44 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 text-white flex items-center justify-center shadow-md shadow-zinc-400/20 mb-3">
            <Camera className="w-7 h-7 text-orange-400 stroke-[2.2]" />
          </div>
          <span className="px-3 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-orange-50 text-orange-800 border border-orange-200/80 mb-2">
            One-Time Registration Invitation
          </span>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight font-display">
            Welcome to Studio OS
          </h1>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm">
            You have received an official Master Admin authorization invitation to establish your photography studio workspace.
          </p>
        </div>

        {/* Loading State */}
        {validating && (
          <div className="py-12 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold text-zinc-600">Verifying your secure invitation token...</p>
          </div>
        )}

        {/* Validation Error State */}
        {!validating && validationError && (
          <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-rose-900">Invitation Link Invalid or Expired</h3>
            <p className="text-xs text-rose-700 leading-relaxed max-w-md mx-auto">
              {validationError}
            </p>
            <div className="pt-2">
              <a
                href="#/login"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-900 text-white text-xs font-bold rounded-xl hover:bg-zinc-800 transition-colors"
              >
                Go to Sign-In
              </a>
            </div>
          </div>
        )}

        {/* Valid Invitation, needs Google Sign In */}
        {!validating && !validationError && !googleUser && !registrationSuccess && (
          <div className="space-y-6">
            <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Authorized Account</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Ready to Activate
                </span>
              </div>
              <div className="font-mono text-sm font-bold text-zinc-900">
                {invitation?.email}
              </div>
              <p className="text-xs text-zinc-500">
                Please continue using this exact Google account. Google OAuth guarantees one-tap security with verified identity.
              </p>
            </div>

            {authError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleContinueWithGoogle}
              disabled={isSigningIn}
              className="w-full min-h-[50px] py-3 px-4 rounded-2xl bg-white hover:bg-zinc-50 text-zinc-800 font-bold text-xs sm:text-sm border border-zinc-300 shadow-sm hover:shadow transition-all flex items-center justify-center gap-3 cursor-pointer touch-manipulation active:scale-[0.99] disabled:opacity-60"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
              <span>{isSigningIn ? 'Connecting to Google...' : 'Continue with Google to Accept Invitation'}</span>
            </button>
          </div>
        )}

        {/* Step 2: Google Verified, Complete Studio Registration Form */}
        {!validating && !validationError && googleUser && !registrationSuccess && (
          <form onSubmit={handleRegisterStudio} className="space-y-5 animate-in fade-in duration-200">
            <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Verified Google Account: <strong>{googleUser.email}</strong>
                </span>
              </div>
              <span className="font-mono text-xs text-emerald-700 bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                Authorized
              </span>
            </div>

            {submitError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-zinc-100">
                <Building2 className="w-4 h-4 text-orange-600" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-900">
                  Configure Studio Profile
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">
                    Studio Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Royal Heritage Studio"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">
                    Owner Full Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aarav Patel"
                    value={formData.ownerName}
                    onChange={e => setFormData({ ...formData, ownerName: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">
                    Business Phone Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98980 12345"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">
                    Login Email (Verified Google Account)
                  </label>
                  <input
                    type="email"
                    readOnly
                    value={googleUser.email}
                    className="w-full px-3 py-2 bg-zinc-100 border border-zinc-200 rounded-xl text-zinc-500 cursor-not-allowed font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-zinc-700 font-semibold mb-1">
                    Studio Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 402 Crystal Plaza, C.G. Road"
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">
                    City <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ahmedabad"
                    value={formData.city}
                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">
                    State <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Gujarat"
                    value={formData.state}
                    onChange={e => setFormData({ ...formData, state: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">
                    GST Number (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="24AAAAA0000A1Z5"
                    value={formData.gstNumber}
                    onChange={e => setFormData({ ...formData, gstNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">
                    Website (Optional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://royalheritage.in"
                    value={formData.website}
                    onChange={e => setFormData({ ...formData, website: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full min-h-[48px] py-3 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-xs sm:text-sm tracking-tight shadow-md shadow-orange-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99] disabled:opacity-60"
              >
                {isSubmitting ? (
                  <span>Creating Studio & Linking Google ID...</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-white" />
                    <span>Create Studio & Launch Dashboard</span>
                    <ArrowRight className="w-4 h-4 text-white" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Registration Success Animation */}
        {registrationSuccess && (
          <div className="py-10 text-center space-y-4 animate-in fade-in duration-300">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-zinc-900 font-display">
              Studio Created Successfully!
            </h2>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Your Google identity has been linked to your studio. Redirecting directly to your Studio OS Dashboard...
            </p>
            <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mt-2" />
          </div>
        )}
      </div>
    </div>
  );
};
