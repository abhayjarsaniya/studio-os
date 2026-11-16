import React, { useState } from 'react';
import { usePlatform } from '../../context/PlatformContext';
import { platformStudioService, CreatedStudioResult } from '../../services/platformStudioService';
import { 
  Building2, 
  ArrowLeft, 
  ShieldCheck, 
  Key, 
  Copy, 
  Check, 
  Sparkles,
  Phone,
  Mail,
  MapPin,
  FileText,
  Lock
} from 'lucide-react';

export const PlatformStudioCreatePage: React.FC = () => {
  const { setPlatformRoute, setSelectedStudioId, triggerRefresh } = usePlatform();

  const [formData, setFormData] = useState({
    name: '',
    ownerName: '',
    ownerMobile: '',
    ownerEmail: '',
    address: '',
    city: 'Ahmedabad',
    state: 'Gujarat',
    subscriptionPlan: 'plan_standard_500',
    subscriptionStatus: 'trial' as 'active' | 'trial' | 'pending',
    logoUrl: '',
    gstNumber: '',
    website: '',
    description: ''
  });

  const [createdResult, setCreatedResult] = useState<CreatedStudioResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.ownerName.trim() || !formData.ownerMobile.trim() || !formData.ownerEmail.trim()) {
      alert('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = platformStudioService.createStudioWithOwner(formData);
      setCreatedResult(res);
      triggerRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to create photography studio.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCredentials = () => {
    if (!createdResult) return;
    const credText = `📸 STUDIO OS — STUDIO OWNER CREDENTIALS\nStudio: ${createdResult.ownerCredentials.studioName} (${createdResult.ownerCredentials.studioId})\nUsername: ${createdResult.ownerCredentials.username}\nEmail: ${createdResult.ownerCredentials.email}\nTemporary Password: ${createdResult.ownerCredentials.temporaryPassword}\nLogin Portal: https://studioos.app\n⚠️ Mandatory password change required on first authentication.`;
    navigator.clipboard.writeText(credText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full space-y-4 sm:space-y-6 pb-12">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setPlatformRoute('studios')}
          className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Photography Studios
        </button>

        <span className="text-xs font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full border border-indigo-200">
          Master Admin Console
        </span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
          <Building2 className="w-7 h-7 text-indigo-600" />
          Create New Photography Studio Tenant
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Provisions an isolated multi-tenant photography studio and creates the Studio Owner credentials. Master Admin cannot add studio staff.
        </p>
      </div>

      {/* Creation Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6 text-xs">
        {/* Section 1: Business Identity */}
        <div className="space-y-3">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 pb-2 border-b border-slate-100">
            <Building2 className="w-4 h-4 text-indigo-600" />
            Studio Business Identity
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Photography Studio Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Navrang Visual Stories"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Business Description / Tagline</label>
              <input
                type="text"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g. Luxury Destination Wedding Visuals"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="font-bold text-slate-700 block mb-1">City *</label>
              <input
                type="text"
                required
                value={formData.city}
                onChange={e => setFormData({ ...formData, city: e.target.value })}
                placeholder="e.g. Ahmedabad"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">State *</label>
              <input
                type="text"
                required
                value={formData.state}
                onChange={e => setFormData({ ...formData, state: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">GSTIN (Optional)</label>
              <input
                type="text"
                value={formData.gstNumber}
                onChange={e => setFormData({ ...formData, gstNumber: e.target.value })}
                placeholder="24AAAAA0000A1Z5"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl font-mono uppercase"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-700 block mb-1">Studio Address *</label>
            <input
              type="text"
              required
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              placeholder="e.g. 402, Titanium City Centre, Prahlad Nagar"
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl"
            />
          </div>
        </div>

        {/* Section 2: Studio Owner Account */}
        <div className="space-y-3 pt-3">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 pb-2 border-b border-slate-100">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Studio Owner Account (Root Administrator)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Owner Full Name *</label>
              <input
                type="text"
                required
                value={formData.ownerName}
                onChange={e => setFormData({ ...formData, ownerName: e.target.value })}
                placeholder="e.g. Jayesh Trivedi"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Owner Mobile Number *</label>
              <input
                type="text"
                required
                value={formData.ownerMobile}
                onChange={e => setFormData({ ...formData, ownerMobile: e.target.value })}
                placeholder="+91 98250 99881"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Owner Email Address *</label>
              <input
                type="email"
                required
                value={formData.ownerEmail}
                onChange={e => setFormData({ ...formData, ownerEmail: e.target.value })}
                placeholder="jayesh@navrang.in"
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl"
              />
            </div>
          </div>
          <p className="text-xs text-slate-400">
            A temporary password will be generated automatically. The Studio Owner handles all employee accounts and daily operations inside this studio.
          </p>
        </div>

        {/* Section 3: Subscription & Billing Tier */}
        <div className="space-y-3 pt-3">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 pb-2 border-b border-slate-100">
            <Sparkles className="w-4 h-4 text-amber-500" />
            SaaS Subscription Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Subscription Plan *</label>
              <select
                value={formData.subscriptionPlan}
                onChange={e => setFormData({ ...formData, subscriptionPlan: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white"
              >
                <option value="plan_standard_500">Studio OS Standard Plan (₹500 / month)</option>
                <option value="plan_enterprise_vip">Studio OS Multi-Branch VIP (₹1,500 / month)</option>
              </select>
            </div>
            <div>
              <label className="font-bold text-slate-700 block mb-1">Initial Status *</label>
              <select
                value={formData.subscriptionStatus}
                onChange={e => setFormData({ ...formData, subscriptionStatus: e.target.value as any })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl bg-white"
              >
                <option value="trial">14-Day Free Trial</option>
                <option value="active">Active (Pre-Paid)</option>
                <option value="pending">Pending Payment</option>
              </select>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setPlatformRoute('studios')}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 font-bold shadow-sm transition-colors cursor-pointer"
          >
            {isSubmitting ? 'Creating Studio...' : 'Provision Studio & Owner Account'}
          </button>
        </div>
      </form>

      {/* One-Time Credential Display Modal */}
      {createdResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-2xl bg-emerald-100 text-emerald-800">
                <Check className="w-6 h-6" />
              </span>
              <div>
                <h3 className="font-black text-slate-900 text-base">Studio Created Successfully!</h3>
                <p className="text-xs text-slate-500">Secure One-Time Studio Owner Credentials</p>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400 font-semibold">Studio ID:</span>
                <span className="font-mono font-bold text-slate-900">{createdResult.ownerCredentials.studioId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-semibold">Studio Name:</span>
                <span className="font-bold text-slate-900">{createdResult.ownerCredentials.studioName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-semibold">Owner Username:</span>
                <span className="font-mono font-bold text-slate-900">{createdResult.ownerCredentials.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 font-semibold">Owner Email:</span>
                <span className="font-medium text-slate-900">{createdResult.ownerCredentials.email}</span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                <span className="text-amber-700 font-bold flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" /> Temporary Password:
                </span>
                <span className="font-mono text-sm font-black bg-amber-100 text-amber-900 px-2 py-0.5 rounded-lg border border-amber-300">
                  {createdResult.ownerCredentials.temporaryPassword}
                </span>
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 leading-relaxed">
              ⚠️ <strong>Mandatory First-Login Action:</strong> The Studio Owner will be prompted to change this temporary password immediately upon their first login. This password is never displayed again.
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={handleCopyCredentials}
                className="px-4 py-2 text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 rounded-xl shadow-xs inline-flex items-center gap-1.5 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied to Clipboard!' : 'Copy Credentials'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setCreatedResult(null);
                  setSelectedStudioId(createdResult.ownerCredentials.studioId);
                  setPlatformRoute('studios');
                }}
                className="px-4 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50 rounded-xl"
              >
                Go to Studios Directory
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
