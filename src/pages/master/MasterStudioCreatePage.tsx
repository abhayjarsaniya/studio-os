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
  AlertCircle
} from 'lucide-react';

export const MasterStudioCreatePage: React.FC = () => {
  const { setMasterRoute, setSelectedStudioId, triggerRefresh } = useMasterAdmin();

  const [formData, setFormData] = useState({
    name: '',
    ownerName: '',
    ownerMobile: '',
    ownerEmail: '',
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

  const [createdResult, setCreatedResult] = useState<ProvisionStudioResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);

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
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
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
            <span className="text-xs text-zinc-500 font-medium">Firebase Auth & Firestore Real Account Provisioning</span>
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
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                  Pending Activation
                </span>
              </div>
              <p className="text-xs text-zinc-500 mt-0.5">
                Firebase Authentication identity created for {createdResult.ownerEmail}. Setup link generated and dispatched.
              </p>
            </div>
          </div>

          {resendStatus && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{resendStatus}</span>
            </div>
          )}

          {/* Account Details Grid */}
          <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-zinc-700">
              <div>
                <span className="text-zinc-400 font-medium block">Studio ID:</span>
                <strong className="text-zinc-900 font-mono">{createdResult.studio.id}</strong>
              </div>
              <div>
                <span className="text-zinc-400 font-medium block">Studio Name:</span>
                <strong className="text-zinc-900">{createdResult.studio.name}</strong>
              </div>
              <div>
                <span className="text-zinc-400 font-medium block">Studio Owner Name:</span>
                <strong className="text-zinc-800">{createdResult.ownerEmployee.name}</strong>
              </div>
              <div>
                <span className="text-zinc-400 font-medium block">Owner Gmail (Login ID):</span>
                <strong className="text-orange-700 font-mono font-bold">{createdResult.ownerEmail}</strong>
              </div>
              <div>
                <span className="text-zinc-400 font-medium block">Firebase Auth UID:</span>
                <span className="font-mono text-zinc-600 truncate block">{createdResult.authUid}</span>
              </div>
              <div>
                <span className="text-zinc-400 font-medium block">Email Dispatch Status:</span>
                <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                  <Check className="w-3.5 h-3.5" /> Dispatched to Gmail inbox
                </span>
              </div>
            </div>
          </div>

          {/* Secure Setup Link Box */}
          <div className="p-4 rounded-2xl bg-orange-50/50 border border-orange-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-orange-950 uppercase tracking-wider">
                Single-Use Activation & Password Setup Link (Valid 7 Days)
              </span>
              <span className="text-xs text-orange-800">Expiring token</span>
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
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied!' : 'Copy Link'}</span>
              </button>
            </div>
            <p className="text-xs text-zinc-500">
              The owner opens this secure link to set their own password and activate their Studio OS Dashboard.
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
                <span>{resending ? 'Resending...' : 'Resend Setup Link'}</span>
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
                2. Studio Owner Account & Gmail Login Identity
              </h3>
            </div>

            <div className="p-3.5 rounded-xl bg-orange-50/40 border border-orange-200/80 text-xs text-zinc-600 space-y-1">
              <strong className="text-orange-950 font-bold block">Secure Account Setup Policy:</strong>
              <p>
                Studio Owners must log in using their registered Gmail address. On saving, a real Firebase Authentication account is created, and an expiring activation link is dispatched directly to their Gmail inbox. The owner sets their own secure password.
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
                  <span>Provision Studio & Send Setup Link</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
