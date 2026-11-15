import React, { useState } from 'react';
import { useMasterAdmin } from '../../context/MasterAdminContext';
import { platformStudioService, CreatedStudioResult } from '../../services/platformStudioService';
import { StudioHandoverModal, StudioHandoverData } from '../../components/master/StudioHandoverModal';
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
  Calendar,
  Lock,
  Layers,
  Crown,
  Share2
} from 'lucide-react';

export const MasterStudioCreatePage: React.FC = () => {
  const { setMasterRoute, triggerRefresh } = useMasterAdmin();

  const [formData, setFormData] = useState({
    name: '',
    ownerName: '',
    ownerMobile: '',
    ownerEmail: '',
    address: '',
    city: 'Ahmedabad',
    state: 'Gujarat',
    subscriptionPlan: 'plan_standard_500',
    subscriptionStartDate: new Date().toISOString().slice(0, 10),
    subscriptionExpiryDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    subscriptionStatus: 'active' as 'active' | 'trial' | 'pending',
    logoUrl: '',
    gstNumber: '',
    website: '',
    description: ''
  });

  const [createdResult, setCreatedResult] = useState<CreatedStudioResult | null>(null);
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.ownerName.trim() || !formData.ownerMobile.trim() || !formData.ownerEmail.trim()) {
      alert('Please fill in all required fields: Studio Name, Owner Name, Mobile and Email.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = platformStudioService.createStudioWithOwner(formData, 'Master Admin');
      setCreatedResult(res);
      setShowHandoverModal(true);
      triggerRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to create studio account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyCredentials = () => {
    if (!createdResult) return;
    const loginUrl = `${window.location.origin}/#/studio/login`;
    const text = `=== STUDIO OS CLIENT LOGIN HANDOVER ===\nStudio: ${createdResult.studio.name}\nStudio Login: ${loginUrl}\nStudio ID: ${createdResult.studio.id}\nLogin ID: ${createdResult.credentials.username}\nTemporary Password: ${createdResult.temporaryPassword}\n\nPlease keep these login details secure.\nYou can change your password anytime from Settings or use Forgot Password on the login page.`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handoverData: StudioHandoverData | null = createdResult ? {
    studioName: createdResult.studio.name,
    studioId: createdResult.studio.id,
    ownerName: createdResult.ownerEmployee.name,
    ownerMobile: formData.ownerMobile,
    ownerEmail: createdResult.ownerEmployee.email,
    username: createdResult.credentials.username,
    temporaryPassword: createdResult.temporaryPassword,
    loginUrl: `${window.location.origin}/#/studio/login`
  } : null;

  return (
    <div className="space-y-6 max-w-4xl pb-20">
      {/* Handover Modal */}
      {handoverData && (
        <StudioHandoverModal
          isOpen={showHandoverModal}
          onClose={() => setShowHandoverModal(false)}
          data={handoverData}
        />
      )}

      {/* Back button and Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setMasterRoute('studios')}
          className="p-2 rounded-xl bg-white border border-zinc-200 hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
              Master Provisioning
            </span>
            <span className="text-xs text-zinc-500">Platform Owner Level 1 Authority</span>
          </div>
          <h1 className="text-2xl font-black text-zinc-900 font-display tracking-tight mt-1">
            Provision New Photography Studio
          </h1>
        </div>
      </div>

      {/* Success Summary Card when created */}
      {createdResult ? (
        <div className="bg-white border border-emerald-500/40 rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-600 flex items-center justify-center border border-emerald-500/30">
              <Check className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 font-display">Studio Account Created Successfully!</h2>
              <p className="text-xs text-zinc-500">
                Secure credentials generated for the Studio Owner. Account is active and ready for immediate sign-in.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3 font-mono text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-zinc-700">
              <div><span className="text-zinc-400">Studio ID:</span> <strong className="text-amber-800">{createdResult.studio.id}</strong></div>
              <div><span className="text-zinc-400">Studio Name:</span> <strong className="text-zinc-900">{createdResult.studio.name}</strong></div>
              <div><span className="text-zinc-400">Owner Name:</span> <strong className="text-zinc-800">{createdResult.ownerEmployee.name}</strong></div>
              <div><span className="text-zinc-400">Username:</span> <strong className="text-indigo-700 font-bold">{createdResult.credentials.username}</strong></div>
              <div><span className="text-zinc-400">Login Email:</span> <strong className="text-zinc-800">{createdResult.ownerEmployee.email}</strong></div>
              <div><span className="text-zinc-400">Temporary Password:</span> <strong className="text-emerald-700 bg-white px-2 py-0.5 rounded border border-zinc-200">{createdResult.temporaryPassword}</strong></div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowHandoverModal(true)}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center gap-2 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
            >
              <Share2 className="w-4 h-4" />
              <span>Open Handover & Share WhatsApp</span>
            </button>
            <button
              onClick={copyCredentials}
              className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Credentials Copied!' : 'Copy Owner Credentials'}</span>
            </button>
            <button
              onClick={() => {
                setCreatedResult(null);
                setMasterRoute('studios');
              }}
              className="px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-semibold border border-zinc-200 transition-all cursor-pointer"
            >
              Return to Studio Directory
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6 bg-white border border-zinc-200 rounded-3xl p-6 shadow-xl">
          {/* Section 1: Studio Details */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5" />
              <span>Studio Business Details</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-zinc-700 font-medium mb-1">Studio Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Royal Wedding Films"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-zinc-800 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-zinc-700 font-medium mb-1">City *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ahmedabad"
                  value={formData.city}
                  onChange={e => setFormData({ ...formData, city: e.target.value })}
                  className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-zinc-800 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-zinc-700 font-medium mb-1">State</label>
                <input
                  type="text"
                  placeholder="e.g. Gujarat"
                  value={formData.state}
                  onChange={e => setFormData({ ...formData, state: e.target.value })}
                  className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-zinc-800 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-zinc-700 font-medium mb-1">GST Number (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 24AAACR1122D1Z4"
                  value={formData.gstNumber}
                  onChange={e => setFormData({ ...formData, gstNumber: e.target.value })}
                  className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-zinc-800 font-mono focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-zinc-700 font-medium mb-1">Business Address</label>
                <input
                  type="text"
                  placeholder="e.g. 301, Titanium One, SG Highway, Bodakdev"
                  value={formData.address}
                  onChange={e => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-zinc-800 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Studio Owner Account */}
          <div className="pt-4 border-t border-zinc-200 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Crown className="w-3.5 h-3.5" />
              <span>Studio Owner (Studio Level Authority)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block text-zinc-700 font-medium mb-1">Owner Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aarav Patel"
                  value={formData.ownerName}
                  onChange={e => setFormData({ ...formData, ownerName: e.target.value })}
                  className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-zinc-800 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-zinc-700 font-medium mb-1">Owner Email *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. aarav@royalframes.in"
                  value={formData.ownerEmail}
                  onChange={e => setFormData({ ...formData, ownerEmail: e.target.value })}
                  className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-zinc-800 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-zinc-700 font-medium mb-1">Owner Mobile / WhatsApp *</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +91 98250 11223"
                  value={formData.ownerMobile}
                  onChange={e => setFormData({ ...formData, ownerMobile: e.target.value })}
                  className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-zinc-800 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Subscription & Status */}
          <div className="pt-4 border-t border-zinc-200 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
              <Layers className="w-3.5 h-3.5" />
              <span>Subscription & Platform Status</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block text-zinc-700 font-medium mb-1">Subscription Plan</label>
                <select
                  value={formData.subscriptionPlan}
                  onChange={e => setFormData({ ...formData, subscriptionPlan: e.target.value })}
                  className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-zinc-800 focus:outline-none focus:border-amber-400"
                >
                  <option value="plan_standard_500">Standard Plan (₹500/month flat)</option>
                  <option value="plan_pro_1500">Professional (₹1,500/month)</option>
                  <option value="plan_ent_3500">Enterprise (₹3,500/month)</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-700 font-medium mb-1">Status</label>
                <select
                  value={formData.subscriptionStatus}
                  onChange={e => setFormData({ ...formData, subscriptionStatus: e.target.value as any })}
                  className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-zinc-800 focus:outline-none focus:border-amber-400"
                >
                  <option value="active">Active</option>
                  <option value="trial">Trial (14 Days)</option>
                  <option value="pending">Pending Payment</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-700 font-medium mb-1">Start Date</label>
                <input
                  type="date"
                  value={formData.subscriptionStartDate}
                  onChange={e => setFormData({ ...formData, subscriptionStartDate: e.target.value })}
                  className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-zinc-800 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-zinc-700 font-medium mb-1">Expiry / Renewal Date</label>
                <input
                  type="date"
                  value={formData.subscriptionExpiryDate}
                  onChange={e => setFormData({ ...formData, subscriptionExpiryDate: e.target.value })}
                  className="w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 text-zinc-800 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4 border-t border-zinc-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setMasterRoute('studios')}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-white hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900 border border-zinc-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 shadow-md shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-zinc-950" />
              <span>{isSubmitting ? 'Creating Studio & Owner...' : 'Create Studio & Owner Account'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
