import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useStudio } from '../context/StudioContext';
import { unifiedAuthService } from '../services/unifiedAuthService';
import { firebaseAuthService } from '../services/firebaseAuthService';
import { studioService } from '../services/studioService';
import { financialSettingsService } from '../services/financialSettingsService';
import { StudioServicesSettings } from '../components/settings/StudioServicesSettings';
import { WhatsAppTemplatesSettings } from '../components/settings/WhatsAppTemplatesSettings';
import { 
  Building2, 
  Lock, 
  LogOut, 
  Check, 
  Edit3, 
  KeyRound, 
  ShieldCheck,
  CheckCircle2,
  Mail,
  Phone,
  MapPin,
  Globe,
  Upload,
  Image as ImageIcon,
  Eye,
  EyeOff,
  AlertCircle,
  Shield,
  HelpCircle,
  Loader2,
  Share2,
  Link as LinkIcon,
  Layers,
  MessageSquare
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { studio, currentUser } = useApp();
  const { currentStudio, refreshStudioData } = useStudio();

  const studioId = currentStudio.id || 'studio_royal_001';

  // Tab: profile | services | finance | whatsapp | security
  const [activeTab, setActiveTab] = useState<'profile' | 'services' | 'finance' | 'whatsapp' | 'security'>('profile');

  // Invoice & Quotation Settings state
  const [finForm, setFinForm] = useState(() => financialSettingsService.getSettings(studioId));
  const [finSaved, setFinSaved] = useState(false);

  // Profile Form State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileForm, setProfileForm] = useState({
    name: studio.name || currentStudio.name || '',
    tagline: studio.tagline || currentStudio.tagline || '',
    phone: studio.phone || currentStudio.phone || '',
    email: studio.email || currentStudio.email || '',
    address: studio.address || currentStudio.address || '',
    city: studio.city || currentStudio.city || '',
    state: (studio as any).state || (currentStudio as any).state || '',
    pincode: (studio as any).pincode || (currentStudio as any).pincode || '',
    gstNumber: studio.gstNumber || currentStudio.gstNumber || '',
    logoUrl: currentStudio.logoUrl || studio.logo || '',
    website: (studio as any).website || (currentStudio as any).website || '',
    socialInstagram: (currentStudio.socialLinks as any)?.instagram || '',
    socialFacebook: (currentStudio.socialLinks as any)?.facebook || '',
    socialYouTube: (currentStudio.socialLinks as any)?.youtube || '',
    businessHours: (studio as any).businessHours || (currentStudio as any).businessHours || '',
    description: studio.tagline || currentStudio.tagline || ''
  });
  const [profileSaved, setProfileSaved] = useState(false);

  // Security & Password Form State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [resetSentNotice, setResetSentNotice] = useState<string | null>(null);

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setProfileForm(prev => ({ ...prev, logoUrl: reader.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileError(null);
    try {
      studioService.updateStudio(currentStudio.id, {
        name: profileForm.name.trim(),
        tagline: profileForm.tagline.trim(),
        phone: profileForm.phone.trim(),
        email: profileForm.email.trim(),
        address: profileForm.address.trim(),
        city: profileForm.city.trim(),
        state: profileForm.state.trim(),
        pincode: profileForm.pincode.trim(),
        gstNumber: profileForm.gstNumber.trim().toUpperCase(),
        logoUrl: profileForm.logoUrl,
        website: profileForm.website.trim(),
        businessHours: profileForm.businessHours,
        socialLinks: {
          instagram: profileForm.socialInstagram.trim(),
          facebook: profileForm.socialFacebook.trim(),
          youtube: profileForm.socialYouTube.trim()
        }
      });
      refreshStudioData();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('studio_data_updated', { detail: { studioId: currentStudio.id } }));
      }
      setIsEditingProfile(false);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (err: any) {
      console.warn('Error saving studio profile:', err);
      setProfileError(err.message || 'Failed to update studio profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Password strength calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: 'None', color: 'bg-zinc-200' };
    let score = 0;
    if (pass.length >= 8) score++;
    if (pass.length >= 12) score++;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[!@#$%&*]/.test(pass)) score++;

    if (score <= 2) return { score, label: 'Weak', color: 'bg-rose-500' };
    if (score <= 4) return { score, label: 'Moderate', color: 'bg-amber-500' };
    return { score, label: 'Strong', color: 'bg-emerald-500' };
  };

  const passwordStrength = getPasswordStrength(passwordForm.newPassword);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(null);
    setPasswordError(null);
    setResetSentNotice(null);

    if (!passwordForm.currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match. Please re-type.');
      return;
    }

    setIsUpdatingPassword(true);

    try {
      const accountId = currentUser.id.startsWith('usr_') ? currentUser.id : `usr_${currentUser.id}`;
      const acc = unifiedAuthService.findAccountByIdentifier(currentUser.email || currentUser.name, currentStudio.id);
      const targetId = acc ? acc.id : accountId;

      const res = await firebaseAuthService.reauthenticateAndChangePassword(
        passwordForm.currentPassword,
        passwordForm.newPassword,
        targetId
      );

      if (res.success) {
        setPasswordSuccess('Password Updated Successfully! Your account credentials have been updated.');
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setPasswordError(res.error || 'Failed to update password. Please check your current password.');
      }
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password.');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleForgotPassword = async () => {
    const email = currentUser.email || profileForm.email || '';
    if (!email) {
      setPasswordError('No email configured for this account.');
      return;
    }
    try {
      const res = await firebaseAuthService.sendPasswordReset(email);
      if (res.success) {
        setResetSentNotice(`A password reset link has been dispatched to ${email}. Check your inbox.`);
      } else {
        setPasswordError(res.error || 'Unable to send password reset email.');
      }
    } catch (e: any) {
      setPasswordError(e.message || 'Failed to dispatch reset email.');
    }
  };

  const handleLogout = () => {
    firebaseAuthService.logout();
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-20 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 font-display">
            Studio Profile & Settings
          </h2>
        </div>

        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-100 hover:bg-rose-50 text-zinc-700 hover:text-rose-600 border border-zinc-200 hover:border-rose-200 text-xs font-bold transition-all self-start sm:self-auto cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Log Out</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-200 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'profile'
              ? 'border-zinc-900 text-zinc-900'
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Studio Profile</span>
        </button>

        <button
          onClick={() => setActiveTab('services')}
          className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'services'
              ? 'border-zinc-900 text-zinc-900'
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Services, Packages & Deliverables</span>
        </button>

        <button
          onClick={() => setActiveTab('finance')}
          className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'finance'
              ? 'border-zinc-900 text-zinc-900'
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Invoice & Quotation</span>
        </button>

        <button
          onClick={() => setActiveTab('whatsapp')}
          className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'whatsapp'
              ? 'border-zinc-900 text-zinc-900'
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>WhatsApp & Templates</span>
        </button>

        <button
          onClick={() => setActiveTab('security')}
          className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'security'
              ? 'border-zinc-900 text-zinc-900'
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Security & Password</span>
        </button>
      </div>

      {/* TAB 1: STUDIO PROFILE */}
      {activeTab === 'profile' && (
        <div className="p-6 rounded-3xl bg-white border border-zinc-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-100">
            <div>
              <h3 className="font-bold text-sm text-zinc-900 font-display">
                Studio Business Details
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                These details will appear on client estimates, quotations, and official invoices.
              </p>
            </div>
            {!isEditingProfile && (
              <button
                onClick={() => setIsEditingProfile(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
            )}
          </div>

          {profileSaved && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Studio profile updated successfully and persisted to Firestore!</span>
            </div>
          )}

          {profileError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>{profileError}</span>
            </div>
          )}

          {isEditingProfile ? (
            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">Studio Brand Name *</label>
                  <input
                    type="text"
                    required
                    value={profileForm.name}
                    onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:border-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">Tagline / Business Description</label>
                  <input
                    type="text"
                    value={profileForm.tagline}
                    onChange={e => setProfileForm({ ...profileForm, tagline: e.target.value })}
                    placeholder="e.g. Wedding Films & Candid Photography"
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:border-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">Official Mobile / WhatsApp *</label>
                  <input
                    type="tel"
                    required
                    value={profileForm.phone}
                    onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:border-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">Official Studio Email *</label>
                  <input
                    type="email"
                    required
                    value={profileForm.email}
                    onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:border-zinc-900"
                  />
                </div>

                {/* Registered Login Email - Strictly Locked for Studio Owner */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-zinc-700 font-semibold">Registered Login Email</label>
                    <span className="flex items-center gap-1 text-xs text-amber-700 font-medium bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                      <Lock className="w-3 h-3 text-amber-600" />
                      <span>Locked (Managed by Master Admin)</span>
                    </span>
                  </div>
                  <input
                    type="email"
                    disabled
                    readOnly
                    value={(currentStudio as any).ownerEmail || studio.email || currentUser.email}
                    className="w-full px-3 py-2 bg-zinc-100 border border-zinc-200 rounded-xl text-zinc-500 cursor-not-allowed select-none font-mono"
                  />
                  <p className="text-xs text-zinc-400 mt-1">
                    Your primary login identity is managed by Platform Master Admin for tenant security.
                  </p>
                </div>

                {/* Unique Studio ID - Strictly Locked */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-zinc-700 font-semibold">Studio ID</label>
                    <span className="flex items-center gap-1 text-xs text-zinc-400">
                      <Lock className="w-3 h-3 text-zinc-400" />
                      <span>Immutable</span>
                    </span>
                  </div>
                  <input
                    type="text"
                    disabled
                    readOnly
                    value={currentStudio.id}
                    className="w-full px-3 py-2 bg-zinc-100 border border-zinc-200 rounded-xl text-zinc-500 cursor-not-allowed select-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">City & State *</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="City"
                      value={profileForm.city}
                      onChange={e => setProfileForm({ ...profileForm, city: e.target.value })}
                      className="w-1/2 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:border-zinc-900"
                    />
                    <input
                      type="text"
                      placeholder="State"
                      value={profileForm.state}
                      onChange={e => setProfileForm({ ...profileForm, state: e.target.value })}
                      className="w-1/2 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:border-zinc-900"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">GST Number (Optional)</label>
                  <input
                    type="text"
                    value={profileForm.gstNumber}
                    onChange={e => setProfileForm({ ...profileForm, gstNumber: e.target.value.toUpperCase() })}
                    placeholder="24AAACR1234D1Z5"
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl font-mono focus:bg-white focus:outline-none focus:border-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">Website URL</label>
                  <input
                    type="url"
                    placeholder="https://yourstudio.com"
                    value={profileForm.website}
                    onChange={e => setProfileForm({ ...profileForm, website: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:border-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">Instagram Handle or Link</label>
                  <input
                    type="text"
                    placeholder="@yourstudio or link"
                    value={profileForm.socialInstagram}
                    onChange={e => setProfileForm({ ...profileForm, socialInstagram: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:border-zinc-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-700 font-semibold mb-1">Studio Address</label>
                <textarea
                  rows={2}
                  value={profileForm.address}
                  onChange={e => setProfileForm({ ...profileForm, address: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:border-zinc-900"
                />
              </div>

              <div>
                <label className="block text-zinc-700 font-semibold mb-1">Logo URL or Upload</label>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={profileForm.logoUrl}
                    onChange={e => setProfileForm({ ...profileForm, logoUrl: e.target.value })}
                    placeholder="https://..."
                    className="flex-1 px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:border-zinc-900 font-mono text-xs"
                  />
                  <label className="px-3 py-2 bg-zinc-100 hover:bg-zinc-200 border border-zinc-300 rounded-xl cursor-pointer flex items-center gap-1.5 font-bold">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload</span>
                    <input type="file" accept="image/*" onChange={handleLogoFileUpload} className="hidden" />
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  disabled={isSavingProfile}
                  className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="px-5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold shadow-sm transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  {isSavingProfile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>{isSavingProfile ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200">
                  <span className="text-zinc-400 block text-xs font-bold uppercase tracking-wider">Studio Name</span>
                  <div className="text-sm font-bold text-zinc-900 mt-0.5">{profileForm.name}</div>
                  {profileForm.tagline && <div className="text-zinc-500 text-xs mt-0.5 italic">{profileForm.tagline}</div>}
                </div>

                <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200">
                  <span className="text-zinc-400 block text-xs font-bold uppercase tracking-wider">Contact Phone</span>
                  <div className="text-xs font-semibold text-zinc-800 mt-0.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{profileForm.phone}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200">
                  <span className="text-zinc-400 block text-xs font-bold uppercase tracking-wider">Official Email</span>
                  <div className="text-xs font-semibold text-zinc-800 mt-0.5 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{profileForm.email}</span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200">
                  <span className="text-zinc-400 block text-xs font-bold uppercase tracking-wider">Location</span>
                  <div className="text-xs font-semibold text-zinc-800 mt-0.5 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                    <span>{profileForm.city}, {profileForm.address || 'Flagship Studio'}</span>
                  </div>
                </div>

                {profileForm.website && (
                  <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200">
                    <span className="text-zinc-400 block text-xs font-bold uppercase tracking-wider">Website</span>
                    <div className="text-xs font-semibold text-indigo-600 mt-0.5 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-zinc-400" />
                      <a href={profileForm.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                        {profileForm.website}
                      </a>
                    </div>
                  </div>
                )}

                {profileForm.socialInstagram && (
                  <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200">
                    <span className="text-zinc-400 block text-xs font-bold uppercase tracking-wider">Instagram</span>
                    <div className="text-xs font-semibold text-zinc-800 mt-0.5 flex items-center gap-1.5">
                      <Share2 className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{profileForm.socialInstagram}</span>
                    </div>
                  </div>
                )}
              </div>

              {profileForm.gstNumber && (
                <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200">
                  <span className="text-zinc-400 block text-xs font-bold uppercase tracking-wider">Tax GSTIN</span>
                  <div className="text-xs font-mono font-bold text-zinc-900 mt-0.5">{profileForm.gstNumber}</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: STUDIO SERVICES, PACKAGES & DELIVERABLES */}
      {activeTab === 'services' && (
        <StudioServicesSettings studioId={studioId} />
      )}

      {/* TAB 2B: INVOICE & QUOTATION SETTINGS */}
      {activeTab === 'finance' && (
        <div className="p-6 rounded-3xl bg-white border border-zinc-200 shadow-xs space-y-5">
          <div className="pb-4 border-b border-zinc-100">
            <h3 className="font-bold text-sm text-zinc-900 font-display">Invoice & Quotation Configuration</h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Customize your legal billing details, document prefixes, GST rates, and default payment terms.
            </p>
          </div>

          {finSaved && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Invoice & Quotation settings saved to Firebase!</span>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              const updated = financialSettingsService.updateSettings(studioId, finForm, 'Studio Owner');
              setFinForm(updated);
              setFinSaved(true);
              setTimeout(() => setFinSaved(false), 3000);
            }}
            className="space-y-4 text-xs"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-zinc-700 font-semibold mb-1">Legal Business Name</label>
                <input
                  type="text"
                  value={finForm.legalName || ''}
                  onChange={e => setFinForm({ ...finForm, legalName: e.target.value })}
                  placeholder="Your Studio Legal Name"
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl"
                />
              </div>
              <div>
                <label className="block text-zinc-700 font-semibold mb-1">GSTIN / Tax ID</label>
                <input
                  type="text"
                  value={finForm.gstin || ''}
                  onChange={e => setFinForm({ ...finForm, gstin: e.target.value.toUpperCase() })}
                  placeholder="Optional GST Number"
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl font-mono"
                />
              </div>
              <div>
                <label className="block text-zinc-700 font-semibold mb-1">Invoice Prefix</label>
                <input
                  type="text"
                  value={finForm.invoicePrefix || 'INV'}
                  onChange={e => setFinForm({ ...finForm, invoicePrefix: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl font-mono"
                />
              </div>
              <div>
                <label className="block text-zinc-700 font-semibold mb-1">Quotation Prefix</label>
                <input
                  type="text"
                  value={finForm.quotationPrefix || 'QUO'}
                  onChange={e => setFinForm({ ...finForm, quotationPrefix: e.target.value.toUpperCase() })}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl font-mono"
                />
              </div>
              <div>
                <label className="block text-zinc-700 font-semibold mb-1">Default CGST (%)</label>
                <input
                  type="number"
                  min="0"
                  max="28"
                  value={finForm.defaultCgstRate ?? 9}
                  onChange={e => setFinForm({ ...finForm, defaultCgstRate: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl font-mono"
                />
              </div>
              <div>
                <label className="block text-zinc-700 font-semibold mb-1">Default SGST (%)</label>
                <input
                  type="number"
                  min="0"
                  max="28"
                  value={finForm.defaultSgstRate ?? 9}
                  onChange={e => setFinForm({ ...finForm, defaultSgstRate: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-zinc-700 font-semibold mb-1">Billing Address</label>
              <input
                type="text"
                value={finForm.businessAddress || ''}
                onChange={e => setFinForm({ ...finForm, businessAddress: e.target.value })}
                placeholder="Studio address shown on invoices & quotes"
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-zinc-700 font-semibold mb-1">Default Payment Terms</label>
              <input
                type="text"
                value={finForm.defaultPaymentTerms || ''}
                onChange={e => setFinForm({ ...finForm, defaultPaymentTerms: e.target.value })}
                placeholder="e.g. 50% advance, 50% before delivery"
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block text-zinc-700 font-semibold mb-1">Terms & Conditions</label>
              <textarea
                rows={3}
                value={finForm.termsAndConditions || ''}
                onChange={e => setFinForm({ ...finForm, termsAndConditions: e.target.value })}
                placeholder="Enter standard terms & conditions for your quotations and invoices..."
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Save Invoice & Quotation Settings
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 3: WHATSAPP MESSAGE TEMPLATES */}
      {activeTab === 'whatsapp' && (
        <WhatsAppTemplatesSettings studioId={studioId} />
      )}

      {/* TAB 4: SECURITY & PASSWORD */}
      {activeTab === 'security' && (
        <div className="p-6 rounded-3xl bg-white border border-zinc-200 shadow-xs space-y-6">
          <div className="pb-4 border-b border-zinc-100 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-sm text-zinc-900 font-display">
                  Security & Password
                </h3>
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                Update your Studio Owner credentials. Once changed, you can continue logging in permanently with no repeated reset prompts.
              </p>
            </div>
          </div>

          {passwordSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {passwordError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          {resetSentNotice && (
            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold flex items-center gap-2">
              <Mail className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{resetSentNotice}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md text-xs">
            {/* Field 1: Current Password */}
            <div>
              <label className="block text-zinc-700 font-semibold mb-1">Current Password *</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={passwordForm.currentPassword}
                  onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  placeholder="Enter your current password"
                  className="w-full pl-9 pr-10 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:border-zinc-900"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-600 cursor-pointer p-0.5"
                  aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Field 2: New Password */}
            <div>
              <label className="block text-zinc-700 font-semibold mb-1">New Password (min 8 characters) *</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={passwordForm.newPassword}
                  onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  placeholder="Enter strong new password"
                  className="w-full pl-9 pr-10 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:border-zinc-900"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-600 cursor-pointer p-0.5"
                  aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Strength Indicator */}
              {passwordForm.newPassword && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500">Password Strength:</span>
                    <span className="font-bold text-zinc-700">{passwordStrength.label}</span>
                  </div>
                  <div className="h-1.5 w-full bg-zinc-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                      style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Field 3: Confirm New Password */}
            <div>
              <label className="block text-zinc-700 font-semibold mb-1">Confirm New Password *</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={passwordForm.confirmPassword}
                  onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  placeholder="Re-enter new password"
                  className="w-full pl-9 pr-10 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:border-zinc-900"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-3 text-zinc-400 hover:text-zinc-600 cursor-pointer p-0.5"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Save Button */}
            <div className="pt-2 flex items-center justify-between gap-4">
              <button
                type="submit"
                disabled={isUpdatingPassword}
                className="py-2.5 px-6 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-60"
              >
                <KeyRound className="w-4 h-4" />
                <span>{isUpdatingPassword ? 'Updating Password...' : 'Save Password'}</span>
              </button>

              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 underline-offset-2 hover:underline cursor-pointer"
              >
                Forgot your current password?
              </button>
            </div>
          </form>

          {/* Security Best Practices Card */}
          <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200/80 space-y-2 text-xs">
            <h4 className="font-bold text-zinc-800 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Password Security Standards</span>
            </h4>
            <ul className="text-zinc-500 space-y-1 list-disc list-inside text-xs leading-relaxed">
              <li>Use at least 8-12 characters with a mix of uppercase, lowercase, numbers, and symbols.</li>
              <li>Passwords are encrypted with industry-standard secure authentication and are never stored in plaintext.</li>
              <li>Your updated password remains valid across sessions without repeated password change prompts.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
