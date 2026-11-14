import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { useStudio } from '../context/StudioContext';
import { unifiedAuthService } from '../services/unifiedAuthService';
import { studioService } from '../services/studioService';
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
  Image as ImageIcon
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { studio, currentUser } = useApp();
  const { currentStudio, refreshStudioData } = useStudio();

  // Tab: profile | password
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');

  // Profile Form State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: studio.name || currentStudio.name || 'SHREEJI STUDIO',
    tagline: studio.tagline || currentStudio.tagline || '',
    phone: studio.phone || currentStudio.phone || '',
    email: studio.email || currentStudio.email || '',
    address: studio.address || currentStudio.address || '',
    city: studio.city || currentStudio.city || '',
    gstNumber: studio.gstNumber || currentStudio.gstNumber || '',
    logoUrl: currentStudio.logoUrl || studio.logo || '/shreeji-logo.svg',
    website: studio.website || 'https://shreejistudio.in',
    businessHours: '09:00 AM - 08:00 PM (Mon-Sat)'
  });
  const [profileSaved, setProfileSaved] = useState(false);

  // Password Form State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

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

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      studioService.updateStudio(currentStudio.id, {
        name: profileForm.name,
        tagline: profileForm.tagline,
        phone: profileForm.phone,
        email: profileForm.email,
        address: profileForm.address,
        city: profileForm.city,
        gstNumber: profileForm.gstNumber,
        logoUrl: profileForm.logoUrl
      });
      refreshStudioData();
    } catch (err) {
      console.warn('Error saving studio profile:', err);
    }
    setIsEditingProfile(false);
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2500);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(null);
    setPasswordError(null);

    if (passwordForm.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Passwords do not match.');
      return;
    }

    try {
      const accountId = currentUser.id.startsWith('usr_') ? currentUser.id : `usr_${currentUser.id}`;
      // Fallback search in unifiedAuthService
      const acc = unifiedAuthService.findAccountByIdentifier(currentUser.email || currentUser.name, currentStudio.id);
      const targetId = acc ? acc.id : accountId;

      unifiedAuthService.changePassword(targetId, passwordForm.newPassword);
      setPasswordSuccess('Password successfully updated!');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setPasswordSuccess(null), 3000);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('studio_os_session_token');
    localStorage.removeItem('studio_os_user_role');
    window.location.hash = '#/studio/login';
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-20 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 font-display">
            Studio Profile & Account
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Manage your studio contact information, update account password, or log out.
          </p>
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
          onClick={() => setActiveTab('password')}
          className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
            activeTab === 'password'
              ? 'border-zinc-900 text-zinc-900'
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>Change Password</span>
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
                Printed on quotations, customer agreements, and official receipts
              </p>
            </div>

            {!isEditingProfile ? (
              <button
                type="button"
                onClick={() => setIsEditingProfile(true)}
                className="px-3 py-1.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-700 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>
            ) : (
              <span className="text-[11px] text-amber-600 font-bold">
                Editing Mode Active
              </span>
            )}
          </div>

          {profileSaved && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Studio profile updated successfully!</span>
            </div>
          )}

          {isEditingProfile ? (
            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">Studio Brand Name</label>
                  <input
                    type="text"
                    value={profileForm.name}
                    onChange={e => setProfileForm({ ...profileForm, name: e.target.value })}
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:border-zinc-900 font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">Business Tagline</label>
                  <input
                    type="text"
                    value={profileForm.tagline}
                    onChange={e => setProfileForm({ ...profileForm, tagline: e.target.value })}
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:border-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">Official Mobile / WhatsApp</label>
                  <input
                    type="text"
                    value={profileForm.phone}
                    onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })}
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:border-zinc-900 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">Official Studio Email</label>
                  <input
                    type="email"
                    value={profileForm.email}
                    onChange={e => setProfileForm({ ...profileForm, email: e.target.value })}
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:border-zinc-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">City & State</label>
                  <input
                    type="text"
                    value={profileForm.city}
                    onChange={e => setProfileForm({ ...profileForm, city: e.target.value })}
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:border-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-zinc-700 font-semibold mb-1">GSTIN (Optional)</label>
                  <input
                    type="text"
                    value={profileForm.gstNumber}
                    onChange={e => setProfileForm({ ...profileForm, gstNumber: e.target.value })}
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:border-zinc-900 font-mono"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-zinc-700 font-semibold mb-1">Studio Address / Landmark</label>
                  <input
                    type="text"
                    value={profileForm.address}
                    onChange={e => setProfileForm({ ...profileForm, address: e.target.value })}
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:border-zinc-900"
                  />
                </div>

                {/* Studio Logo Upload */}
                <div className="sm:col-span-2 p-3.5 rounded-2xl bg-zinc-100/70 border border-zinc-200">
                  <label className="block text-zinc-700 font-semibold mb-1.5">Studio Logo & Brand Emblem</label>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
                      {profileForm.logoUrl ? (
                        <img src={profileForm.logoUrl} alt="Logo Preview" className="w-full h-full object-contain p-1" />
                      ) : (
                        <Building2 className="w-6 h-6 text-amber-400" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <label className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-zinc-300 hover:bg-zinc-50 text-zinc-800 text-xs font-semibold cursor-pointer transition-all shadow-xs">
                        <Upload className="w-3.5 h-3.5 text-zinc-600" />
                        <span>Upload New Logo</span>
                        <input type="file" accept="image/*" onChange={handleLogoFileUpload} className="hidden" />
                      </label>
                      <p className="text-[10px] text-zinc-500">Supports PNG, JPG, or SVG vector. Tenant-isolated to your studio.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(false)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-700 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/80">
                <span className="text-zinc-400 block text-[10px] font-bold uppercase tracking-wider">Studio Name</span>
                <div className="font-bold text-sm text-zinc-900 mt-0.5">{profileForm.name}</div>
                <div className="text-zinc-500 text-[11px] mt-0.5">{profileForm.tagline}</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/80">
                <span className="text-zinc-400 block text-[10px] font-bold uppercase tracking-wider">Contact & WhatsApp</span>
                <div className="font-mono font-bold text-zinc-900 mt-0.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-zinc-500" />
                  <span>{profileForm.phone}</span>
                </div>
                <div className="text-zinc-600 text-[11px] mt-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{profileForm.email}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/80">
                <span className="text-zinc-400 block text-[10px] font-bold uppercase tracking-wider">Address & Location</span>
                <div className="text-zinc-800 mt-0.5 flex items-start gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
                  <span>{profileForm.address}, {profileForm.city}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/80">
                <span className="text-zinc-400 block text-[10px] font-bold uppercase tracking-wider">Tax Registration (GSTIN)</span>
                <div className="font-mono font-bold text-zinc-800 mt-0.5">
                  {profileForm.gstNumber || 'Not registered / Composition'}
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/80 sm:col-span-2 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden shrink-0">
                  {profileForm.logoUrl ? (
                    <img src={profileForm.logoUrl} alt={profileForm.name} className="w-full h-full object-contain p-1" />
                  ) : (
                    <Building2 className="w-6 h-6 text-amber-400" />
                  )}
                </div>
                <div>
                  <span className="text-zinc-400 block text-[10px] font-bold uppercase tracking-wider">Brand Logo Emblem</span>
                  <div className="text-xs font-semibold text-zinc-800 mt-0.5">Shreeji Studio brand identity configured</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CHANGE PASSWORD */}
      {activeTab === 'password' && (
        <div className="p-6 rounded-3xl bg-white border border-zinc-200 shadow-xs space-y-6">
          <div className="pb-4 border-b border-zinc-100">
            <h3 className="font-bold text-sm text-zinc-900 font-display">
              Change Account Password
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Update your individual Studio Owner sign-in password. Passwords are never stored in plaintext.
            </p>
          </div>

          {passwordSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {passwordError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold">
              {passwordError}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md text-xs">
            <div>
              <label className="block text-zinc-700 font-semibold mb-1">New Password (min 6 characters)</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  placeholder="Enter new password"
                  className="w-full pl-9 pr-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:border-zinc-900"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-zinc-700 font-semibold mb-1">Confirm New Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  placeholder="Re-enter new password"
                  className="w-full pl-9 pr-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl focus:bg-white focus:outline-none focus:border-zinc-900"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="py-2.5 px-5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-sm"
            >
              <KeyRound className="w-4 h-4" />
              <span>Update Password</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
