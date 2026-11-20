import React, { useState } from 'react';
import { useMasterAdmin } from '../../context/MasterAdminContext';
import { realAccountProvisionService, ProvisionStudioResult } from '../../services/realAccountProvisionService';
import { 
  Building2, 
  ArrowLeft, 
  ShieldCheck, 
  Copy, 
  Check, 
  Sparkles,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Lock,
  Layers,
  Send,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  Share2
} from 'lucide-react';

const generateDefaultPassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let rand = '';
  for (let i = 0; i < 6; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const num = Math.floor(100 + Math.random() * 900);
  return `Studio#${rand}${num}!`;
};

export const MasterStudioCreatePage: React.FC = () => {
  const { setMasterRoute, setSelectedStudioId, triggerRefresh } = useMasterAdmin();

  const [formData, setFormData] = useState({
    name: '',
    ownerName: '',
    ownerMobile: '',
    ownerEmail: '',
    initialPassword: generateDefaultPassword(),
    address: '',
    city: 'Ahmedabad',
    state: 'Gujarat',
    subscriptionPlan: 'plan_standard_500',
    subscriptionStatus: 'active' as 'active' | 'trial' | 'pending',
    logoUrl: '',
    gstNumber: '',
    website: '',
    description: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [createdResult, setCreatedResult] = useState<ProvisionStudioResult | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [copiedCredentials, setCopiedCredentials] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

  const handleGenerateNewPassword = () => {
    setFormData(prev => ({ ...prev, initialPassword: generateDefaultPassword() }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = (formData.ownerEmail || '').trim().toLowerCase();
    if (!formData.name.trim() || !formData.ownerName.trim() || !formData.ownerMobile.trim() || !cleanEmail) {
      setErrorMessage('Please fill in all required fields: Studio Name, Owner Name, Phone and Owner Gmail.');
      return;
    }

    if (!cleanEmail.endsWith('@gmail.com') && !cleanEmail.endsWith('@googlemail.com')) {
      setErrorMessage(`Studio Owner must use a valid Gmail address (ending in @gmail.com). Entered: "${formData.ownerEmail}"`);
      return;
    }

    if (formData.initialPassword && formData.initialPassword.trim().length < 8) {
      setErrorMessage('Initial Password must be at least 8 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await realAccountProvisionService.provisionStudioAndOwner(formData, 'Master Admin');
      setCreatedResult(res);
      triggerRefresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create studio account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copySetupLink = () => {
    if (!createdResult?.setupLink) return;
    navigator.clipboard.writeText(createdResult.setupLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const copyInitialPassword = () => {
    const pwd = createdResult?.initialPassword || formData.initialPassword;
    if (!pwd) return;
    navigator.clipboard.writeText(pwd);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 3000);
  };

  const copyAllCredentials = () => {
    if (!createdResult) return;
    const pwd = createdResult.initialPassword || formData.initialPassword;
    const loginUrl = `${window.location.origin}/#/login`;
    const text = `Studio OS — Studio Owner Login Credentials:
----------------------------------------
Studio: ${createdResult.studio.name} (${createdResult.studio.id})
Owner: ${createdResult.ownerEmployee.name}
Login URL: ${loginUrl}
Email / Username: ${createdResult.ownerEmail}
Initial Password: ${pwd}

Please log in at the link above using your registered Gmail address and password.`;

    navigator.clipboard.writeText(text);
    setCopiedCredentials(true);
    setTimeout(() => setCopiedCredentials(false), 3000);
  };

  const handleResendLink = async () => {
    if (!createdResult) return;
    setResending(true);
    setResendStatus(null);
    try {
      const res = await realAccountProvisionService.resendSetupLink(
        createdResult.ownerEmail,
        'studio_owner',
        createdResult.studio.id
      );
      if (res.success) {
        setResendStatus(`Setup link successfully resent to ${createdResult.ownerEmail}!`);
        setTimeout(() => setResendStatus(null), 4000);
      } else {
        alert(res.error || 'Failed to resend setup link.');
      }
    } catch (e: any) {
      alert(e.message || 'Error resending setup link.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="w-full space-y-4 sm:space-y-6 pb-20 font-sans">
      {/* Back button and Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMasterRoute('studios')}
          className="min-w-[44px] min-h-[44px] p-2.5 rounded-xl bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition-colors flex items-center justify-center cursor-pointer"
          aria-label="Back to studios directory"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-orange-50 text-orange-700 border border-orange-200">
              Master Provisioning
            </span>
            <span className="text-xs text-zinc-500 font-medium">Real Firebase Auth & Direct Owner Access</span>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 font-display tracking-tight mt-1">
            Provision New Photography Studio
          </h1>
        </div>
      </div>

      {/* Success Summary Panel */}
      {createdResult ? (
        <div className="bg-white border border-emerald-500/40 rounded-3xl p-6 sm:p-8 shadow-xl space-y-5 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200 shrink-0">
              <Check className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-zinc-900 font-display">Studio Record & Owner Account Created!</h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Ready for Immediate Login
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Real Firebase Authentication account created for {createdResult.ownerEmail}. The Studio Owner can log in immediately.
              </p>
            </div>
          </div>

          {resendStatus && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{resendStatus}</span>
            </div>
          )}

          {/* Account Details & Initial Password Grid */}
          <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200/80">
              <span className="font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-orange-600" />
                <span>Owner Credentials & Login Details</span>
              </span>
              <button
                type="button"
                onClick={copyAllCredentials}
                className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all"
              >
                {copiedCredentials ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCredentials ? 'Copied Full Summary!' : 'Copy All Credentials'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-zinc-700">
              <div>
                <span className="text-zinc-400 font-medium block">Studio ID:</span>
                <strong className="text-zinc-900 font-mono">{createdResult.studio.id}</strong>
              </div>
              <div>
                <span className="text-zinc-400 font-medium block">Studio Name:</span>
                <strong className="text-zinc-900">{createdResult.studio.name}</strong>
              </div>
              <div>
                <span className="text-zinc-400 font-medium block">Studio Owner:</span>
                <strong className="text-zinc-800">{createdResult.ownerEmployee.name}</strong>
              </div>
              <div>
                <span className="text-zinc-400 font-medium block">Owner Gmail (Login ID):</span>
                <strong className="text-orange-700 font-mono font-bold">{createdResult.ownerEmail}</strong>
              </div>
              <div>
                <span className="text-zinc-400 font-medium block">Initial Password:</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {createdResult.initialPassword || formData.initialPassword}
                  </span>
                  <button
                    type="button"
                    onClick={copyInitialPassword}
                    className="p-1 rounded hover:bg-zinc-200 text-zinc-600 transition-colors"
                    title="Copy Password"
                  >
                    {copiedPassword ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div>
                <span className="text-zinc-400 font-medium block">Firebase Auth UID:</span>
                <span className="font-mono text-zinc-600 truncate block">{createdResult.authUid}</span>
              </div>
            </div>

            <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200/80 text-emerald-900 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Immediate Login Ready:</strong> Owner can sign in right now at <strong>/login</strong> using their Gmail and initial password.
                </span>
              </div>
              <a
                href={`${window.location.origin}/#/login`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shrink-0 inline-flex items-center gap-1"
              >
                <span>Open Login</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Secure Setup & Reset Link Box */}
          <div className="p-4 rounded-2xl bg-orange-50/50 border border-orange-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-orange-950 uppercase tracking-wider">
                Password Setup & Recovery Link (Valid 7 Days)
              </span>
              <span className="text-xs text-orange-800">Email dispatched to Gmail</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={createdResult.setupLink}
                className="flex-1 px-3 py-2.5 rounded-xl bg-white border border-orange-200 font-mono text-xs text-zinc-800 select-all focus:outline-none"
              />
              <button
                type="button"
                onClick={copySetupLink}
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer touch-manipulation active:scale-95 transition-all shadow-xs shrink-0"
              >
                {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
            <p className="text-xs text-zinc-500">
              The owner can also open this link anytime if they prefer to choose their own custom password.
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-100">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResendLink}
                disabled={resending}
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-700 font-bold text-xs flex items-center gap-2 cursor-pointer transition-colors"
              >
                <RefreshCw className={`w-4 h-4 text-zinc-500 ${resending ? 'animate-spin' : ''}`} />
                <span>{resending ? 'Resending...' : 'Resend Email Link'}</span>
              </button>

              <a
                href={createdResult.setupLink}
                target="_blank"
                rel="noreferrer"
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs flex items-center gap-2 transition-colors"
              >
                <ExternalLink className="w-4 h-4 text-zinc-600" />
                <span>Open Setup Link</span>
              </a>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setCreatedResult(null);
                  setFormData({
                    name: '',
                    ownerName: '',
                    ownerMobile: '',
                    ownerEmail: '',
                    initialPassword: generateDefaultPassword(),
                    address: '',
                    city: 'Ahmedabad',
                    state: 'Gujarat',
                    subscriptionPlan: 'plan_standard_500',
                    subscriptionStatus: 'active',
                    logoUrl: '',
                    gstNumber: '',
                    website: '',
                    description: ''
                  });
                }}
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-700 font-bold text-xs cursor-pointer"
              >
                + Add Another Studio
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedStudioId(createdResult.studio.id);
                  setMasterRoute('studio-detail');
                }}
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs cursor-pointer shadow-xs"
              >
                View Studio Details →
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Create Studio Form */
        <form onSubmit={handleSubmit} className="bg-white border border-zinc-200 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section 1: Studio Business Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-100">
              <Building2 className="w-4 h-4 text-orange-600" />
              <h3 className="font-bold text-sm text-zinc-900 uppercase tracking-wider">
                1. Studio Profile & Business Information
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Studio Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Royal Frames Studio"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Studio City <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ahmedabad, Surat, Rajkot"
                  value={formData.city}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Studio Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 402 Crystal Plaza, C.G. Road"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  GST Number (Optional)
                </label>
                <input
                  type="text"
                  placeholder="24AAAAA0000A1Z5"
                  value={formData.gstNumber}
                  onChange={e => setFormData({ ...formData, gstNumber: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Website (Optional)
                </label>
                <input
                  type="url"
                  placeholder="https://royalframes.in"
                  value={formData.website}
                  onChange={e => setFormData({ ...formData, website: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Studio Owner Identity & Authentication */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-zinc-100">
              <ShieldCheck className="w-4 h-4 text-orange-600" />
              <h3 className="font-bold text-sm text-zinc-900 uppercase tracking-wider">
                2. Studio Owner Account & Initial Password
              </h3>
            </div>

            <div className="p-3.5 rounded-xl bg-orange-50/40 border border-orange-200/80 text-xs text-zinc-600 space-y-1">
              <strong className="text-orange-950 font-bold block">Instant Login & Account Provisioning:</strong>
              <p>
                A real Firebase Authentication account will be created with the owner's Gmail and the Initial Password set below. The Studio Owner can log in immediately at /login. A password setup link is also sent to their Gmail for convenience.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Owner Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aarav Patel"
                  value={formData.ownerName}
                  onChange={e => setFormData({ ...formData, ownerName: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Owner Gmail Address (Login ID) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    required
                    placeholder="owner@gmail.com"
                    value={formData.ownerEmail}
                    onChange={e => setFormData({ ...formData, ownerEmail: e.target.value })}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
                <p className="text-xs text-zinc-500 mt-1">Must be an active Gmail address ending in @gmail.com</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-zinc-700">
                    Initial Password <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleGenerateNewPassword}
                    className="text-xs font-bold text-orange-600 hover:text-orange-700 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <KeyRound className="w-3 h-3" />
                    <span>Auto Generate</span>
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    placeholder="Initial password for owner"
                    value={formData.initialPassword}
                    onChange={e => setFormData({ ...formData, initialPassword: e.target.value })}
                    className="w-full pl-9 pr-10 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-mono text-zinc-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600 p-0.5"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-zinc-500 mt-1">Min 8 characters. Owner uses this password to log in immediately.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Owner Phone Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                  <input
                    type="tel"
                    required
                    placeholder="+91 98980 12345"
                    value={formData.ownerMobile}
                    onChange={e => setFormData({ ...formData, ownerMobile: e.target.value })}
                    className="w-full pl-9 pr-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Subscription Plan
                </label>
                <select
                  value={formData.subscriptionPlan}
                  onChange={e => setFormData({ ...formData, subscriptionPlan: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
                >
                  <option value="plan_starter_250">Starter (₹250/mo)</option>
                  <option value="plan_standard_500">Standard Production (₹500/mo)</option>
                  <option value="plan_enterprise_1200">Enterprise Multi-Crew (₹1,200/mo)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Studio Status
                </label>
                <select
                  value={formData.subscriptionStatus}
                  onChange={e => setFormData({ ...formData, subscriptionStatus: e.target.value as any })}
                  className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
                >
                  <option value="active">Active (Immediate Full Access)</option>
                  <option value="trial">14-Day Free Trial</option>
                  <option value="pending">Pending Setup</option>
                </select>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100">
            <button
              type="button"
              onClick={() => setMasterRoute('studios')}
              className="min-h-[46px] px-5 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[46px] px-6 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 via-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs tracking-tight shadow-md shadow-orange-500/25 transition-all flex items-center gap-2 cursor-pointer touch-manipulation active:scale-[0.98]"
            >
              {isSubmitting ? (
                <span>Provisioning Studio & Auth...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-white" />
                  <span>Save Studio & Set Initial Password</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
