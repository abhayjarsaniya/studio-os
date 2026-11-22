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
  MapPin,
  Lock,
  Layers,
  ExternalLink,
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  UserCheck
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
    loginId: '',
    initialPassword: '',
    confirmPassword: '',
    status: 'active' as 'active' | 'trial' | 'inactive' | 'suspended',
    phone: '',
    address: '',
    city: 'Ahmedabad',
    state: 'Gujarat',
    subscriptionPlan: 'plan_standard_500',
    description: '',
    gstNumber: '',
    website: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [createdResult, setCreatedResult] = useState<ProvisionStudioResult | null>(null);
  const [copiedCredentials, setCopiedCredentials] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGeneratePassword = () => {
    const pwd = generateDefaultPassword();
    setFormData(prev => ({
      ...prev,
      initialPassword: pwd,
      confirmPassword: pwd
    }));
  };

  const handleOwnerNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setFormData(prev => {
      // Auto-suggest loginId if not customized yet
      const shouldAutoSlug = !prev.loginId || prev.loginId === prev.ownerName.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const suggestedLoginId = shouldAutoSlug 
        ? newName.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 16)
        : prev.loginId;
      return {
        ...prev,
        ownerName: newName,
        loginId: suggestedLoginId
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const studioName = formData.name.trim();
    const ownerName = formData.ownerName.trim();
    const loginId = formData.loginId.trim().toLowerCase();
    const password = formData.initialPassword.trim();
    const confirmPassword = formData.confirmPassword.trim();

    if (!studioName) {
      setErrorMessage('Studio Name is required.');
      return;
    }
    if (!ownerName) {
      setErrorMessage('Studio Owner Name is required.');
      return;
    }
    if (!loginId) {
      setErrorMessage('Login ID / Username is required.');
      return;
    }
    if (loginId.length < 3) {
      setErrorMessage('Login ID must be at least 3 characters long.');
      return;
    }
    if (/\s/.test(loginId)) {
      setErrorMessage('Login ID cannot contain spaces. Use letters, numbers, or underscores.');
      return;
    }
    if (!password) {
      setErrorMessage('Initial Password is required.');
      return;
    }
    if (password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Initial Password and Confirm Password do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await realAccountProvisionService.provisionStudioAndOwner({
        name: studioName,
        ownerName,
        loginId,
        initialPassword: password,
        confirmPassword,
        status: formData.status,
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        subscriptionPlan: formData.subscriptionPlan,
        description: formData.description.trim(),
        gstNumber: formData.gstNumber.trim(),
        website: formData.website.trim()
      }, 'Master Admin');

      setCreatedResult(res);
      triggerRefresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create studio account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyAllCredentials = () => {
    if (!createdResult) return;
    const pwd = createdResult.initialPassword || formData.initialPassword;
    const loginId = createdResult.loginId || createdResult.username || formData.loginId;
    const loginUrl = `${window.location.origin}/#/login`;
    const text = `Studio OS — Studio Owner Login Credentials:
----------------------------------------
Studio: ${createdResult.studio.name} (${createdResult.studio.id})
Owner: ${createdResult.ownerEmployee.name}
Login URL: ${loginUrl}
Login ID: ${loginId}
Password: ${pwd}

The Studio Owner can sign in immediately at the URL above.`;

    navigator.clipboard.writeText(text);
    setCopiedCredentials(true);
    setTimeout(() => setCopiedCredentials(false), 3000);
  };

  const copyPasswordOnly = () => {
    const pwd = createdResult?.initialPassword || formData.initialPassword;
    if (!pwd) return;
    navigator.clipboard.writeText(pwd);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 3000);
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
            <span className="text-xs text-zinc-500 font-medium">Direct Credentials & Immediate Login Access</span>
          </div>
          <h1 className="text-2xl font-bold text-zinc-900 font-display tracking-tight mt-1">
            Create New Studio & Owner Credentials
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
                <h2 className="text-lg font-bold text-zinc-900 font-display">Studio & Owner Credentials Created Successfully!</h2>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Active & Ready for Login
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                The studio owner can log in immediately with their Login ID and Password. No email verification or registration needed.
              </p>
            </div>
          </div>

          {/* Credentials Display Card */}
          <div className="p-5 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Studio Owner Login Credentials
              </span>
              <button
                type="button"
                onClick={copyAllCredentials}
                className="px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
              >
                {copiedCredentials ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCredentials ? 'Copied to Clipboard!' : 'Copy Login Details'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-zinc-400 font-medium block">Studio Name:</span>
                <strong className="text-zinc-900 text-sm">{createdResult.studio.name}</strong>
              </div>
              <div>
                <span className="text-zinc-400 font-medium block">Studio Owner:</span>
                <strong className="text-zinc-800 text-sm">{createdResult.ownerEmployee.name}</strong>
              </div>
              <div>
                <span className="text-zinc-400 font-medium block">Login ID / Username:</span>
                <strong className="text-orange-600 font-mono text-sm font-bold bg-orange-50 px-2 py-0.5 rounded border border-orange-200 inline-block mt-0.5">
                  {createdResult.loginId || createdResult.username || formData.loginId}
                </strong>
              </div>
              <div>
                <span className="text-zinc-400 font-medium block">Initial Password:</span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200 text-sm">
                    {createdResult.initialPassword || formData.initialPassword}
                  </span>
                  <button
                    type="button"
                    onClick={copyPasswordOnly}
                    className="p-1.5 rounded hover:bg-zinc-200 text-zinc-600 transition-colors cursor-pointer"
                    title="Copy Password"
                  >
                    {copiedPassword ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200/80 text-emerald-900 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Immediate Login Ready:</strong> Owner can sign in right now at <strong>/login</strong> using Login ID <strong>{createdResult.loginId || formData.loginId}</strong> and their password.
                </span>
              </div>
              <a
                href={`${window.location.origin}/#/login`}
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shrink-0 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Open Login</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-100">
            <button
              type="button"
              onClick={() => {
                setCreatedResult(null);
                setFormData({
                  name: '',
                  ownerName: '',
                  loginId: '',
                  initialPassword: '',
                  confirmPassword: '',
                  status: 'active',
                  phone: '',
                  address: '',
                  city: 'Ahmedabad',
                  state: 'Gujarat',
                  subscriptionPlan: 'plan_standard_500',
                  description: '',
                  gstNumber: '',
                  website: ''
                });
              }}
              className="min-h-[44px] px-5 py-2.5 rounded-xl bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-700 font-bold text-xs cursor-pointer transition-colors"
            >
              + Create Another Studio
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectedStudioId(createdResult.studio.id);
                setMasterRoute('studio-detail');
              }}
              className="min-h-[44px] px-6 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs cursor-pointer transition-colors shadow-md flex items-center gap-2"
            >
              <span>View Studio Details</span>
              <ArrowLeft className="w-4 h-4 rotate-180" />
            </button>
          </div>
        </div>
      ) : (
        /* Create Form */
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <div className="font-medium leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {/* Section 1: Studio Identity & Profile */}
          <div className="bg-white border border-zinc-200/90 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
            <div className="flex items-center gap-3 pb-4 border-b border-zinc-100">
              <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center font-bold">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-zinc-900 font-display">1. Studio Profile & Identity</h2>
                <p className="text-xs text-zinc-500">Brand details for invoices, calendar, and public studio branding</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                  Studio Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Royal Frames Photography"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                  Studio Phone / Contact
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={e => setFormData(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+91 98250 11223"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all font-medium"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                  Studio Address
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={e => setFormData(f => ({ ...f, address: e.target.value }))}
                  placeholder="e.g. 301, Titanium One, SG Highway, Bodakdev"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                  City
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={e => setFormData(f => ({ ...f, city: e.target.value }))}
                  placeholder="e.g. Ahmedabad"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                  State
                </label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={e => setFormData(f => ({ ...f, state: e.target.value }))}
                  placeholder="Gujarat"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                  Studio Status <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.status}
                  onChange={e => setFormData(f => ({ ...f, status: e.target.value as any }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all font-medium"
                >
                  <option value="active">Active (Immediate Login Enabled)</option>
                  <option value="trial">14-Day Free Trial</option>
                  <option value="inactive">Inactive / Deactivated</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                  Subscription Plan
                </label>
                <select
                  value={formData.subscriptionPlan}
                  onChange={e => setFormData(f => ({ ...f, subscriptionPlan: e.target.value }))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all font-medium"
                >
                  <option value="plan_standard_500">Studio OS Starter (₹500 / month)</option>
                  <option value="plan_quarterly_pro">Studio OS Pro (₹1,500 / quarter)</option>
                  <option value="plan_annual_enterprise">Studio OS Enterprise (₹5,000 / year)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Studio Owner Login Credentials */}
          <div className="bg-white border border-zinc-200/90 rounded-3xl p-6 sm:p-8 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center font-bold">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-zinc-900 font-display">2. Studio Owner Login Credentials</h2>
                  <p className="text-xs text-zinc-500">Create the owner's username and password directly. No registration required.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleGeneratePassword}
                className="px-3.5 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <KeyRound className="w-4 h-4 text-orange-600" />
                <span>Auto-Generate Password</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                  Studio Owner Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.ownerName}
                  onChange={handleOwnerNameChange}
                  placeholder="e.g. Aarav Patel"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                  Login ID / Username <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.loginId}
                  onChange={e => setFormData(f => ({ ...f, loginId: e.target.value.toLowerCase().replace(/\s/g, '_') }))}
                  placeholder="e.g. aarav_patel or shreeji_films"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all font-bold"
                />
                <span className="text-xs text-zinc-400 mt-1 block">
                  Studio Owner will sign in using this Login ID. No email required.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                  Initial Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.initialPassword}
                    onChange={e => setFormData(f => ({ ...f, initialPassword: e.target.value }))}
                    placeholder="Min 6 characters"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 uppercase tracking-wider mb-1.5">
                  Confirm Password <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={formData.confirmPassword}
                    onChange={e => setFormData(f => ({ ...f, confirmPassword: e.target.value }))}
                    placeholder="Re-enter password to confirm"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-zinc-50 border border-zinc-200 text-xs text-zinc-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900 transition-all font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(p => !p)}
                    className="absolute right-3 top-2.5 text-zinc-400 hover:text-zinc-600 cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setMasterRoute('studios')}
              className="min-h-[46px] px-6 py-2.5 rounded-xl bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-700 font-bold text-xs cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-[46px] px-8 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs shadow-lg flex items-center gap-2 cursor-pointer transition-all disabled:opacity-60"
            >
              <ShieldCheck className="w-4 h-4 text-orange-400" />
              <span>{isSubmitting ? 'Creating Studio & Provisioning...' : 'Save Studio & Create Login'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
