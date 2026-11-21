import React, { useState, useEffect, useMemo } from 'react';
import { useMasterAdmin } from '../../context/MasterAdminContext';
import { 
  googleAuthInvitationService, 
  AuthorizedStudioEmail 
} from '../../services/googleAuthInvitationService';
import { 
  Mail, 
  Plus, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Building2, 
  Trash2, 
  Edit3, 
  Copy, 
  Check, 
  ExternalLink, 
  ShieldCheck, 
  KeyRound, 
  Power, 
  Sparkles,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  UserCheck,
  Send
} from 'lucide-react';

export const MasterAuthorizedEmailsPage: React.FC = () => {
  const { setMasterRoute } = useMasterAdmin();
  const [emails, setEmails] = useState<AuthorizedStudioEmail[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [invitationFilter, setInvitationFilter] = useState<string>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newEmail, setNewEmail] = useState<string>('');
  const [newOwnerName, setNewOwnerName] = useState<string>('');
  const [newRole, setNewRole] = useState<'studio_owner' | 'employee'>('studio_owner');
  const [allowPassword, setAllowPassword] = useState<boolean>(true);
  const [allowGoogle, setAllowGoogle] = useState<boolean>(true);
  const [sendImmediately, setSendImmediately] = useState<boolean>(true);
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Invitation link view modal
  const [linkModalData, setLinkModalData] = useState<{
    email: string;
    link: string;
    copied: boolean;
  } | null>(null);

  // Edit modal
  const [editingItem, setEditingItem] = useState<AuthorizedStudioEmail | null>(null);
  const [editEmail, setEditEmail] = useState<string>('');
  const [editOwnerName, setEditOwnerName] = useState<string>('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const list = await googleAuthInvitationService.listAuthorizedEmails();
      setEmails(list);
    } catch (err: any) {
      console.error('Error loading authorized emails:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredEmails = useMemo(() => {
    return emails.filter(item => {
      const q = searchQuery.toLowerCase();
      const matchSearch = item.email.toLowerCase().includes(q) ||
        (item.ownerName && item.ownerName.toLowerCase().includes(q)) ||
        (item.linkedStudioId && item.linkedStudioId.toLowerCase().includes(q)) ||
        (item.linkedStudioName && item.linkedStudioName.toLowerCase().includes(q));

      const matchStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchRole = roleFilter === 'all' || (item.role || 'studio_owner') === roleFilter;
      const matchInvitation = invitationFilter === 'all' || item.invitationStatus === invitationFilter;

      return matchSearch && matchStatus && matchRole && matchInvitation;
    });
  }, [emails, searchQuery, statusFilter, roleFilter, invitationFilter]);

  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setIsSubmitting(true);

    try {
      const res = await googleAuthInvitationService.addAuthorizedEmail({
        email: newEmail,
        ownerName: newOwnerName,
        role: newRole,
        allowPasswordLogin: allowPassword,
        allowGoogleLogin: allowGoogle,
        sendInvitationImmediately: sendImmediately,
        createdBy: 'Master Admin'
      });

      setIsAddModalOpen(false);
      setNewEmail('');
      setNewOwnerName('');
      setNewRole('studio_owner');
      setAllowPassword(true);
      setAllowGoogle(true);
      await loadData();

      if (res.invitationLink) {
        setLinkModalData({
          email: res.record.email,
          link: res.invitationLink,
          copied: false
        });
      } else {
        showToast(`Email ${res.record.email} authorized successfully!`);
      }
    } catch (err: any) {
      setModalError(err.message || 'Failed to add authorized email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendOrResendInvitation = async (id: string, email: string) => {
    try {
      const res = await googleAuthInvitationService.sendInvitation(id, 7, 'Master Admin');
      await loadData();
      setLinkModalData({
        email,
        link: res.invitationLink,
        copied: false
      });
    } catch (err: any) {
      alert(err.message || 'Failed to send invitation.');
    }
  };

  const handleToggleStatus = async (item: AuthorizedStudioEmail) => {
    try {
      if (item.status === 'enabled') {
        if (confirm(`Disable access for "${item.email}"? This will immediately prevent the user from signing in to Studio OS.`)) {
          await googleAuthInvitationService.disableAuthorizedEmail(item.id);
          showToast(`Account authorization disabled for ${item.email}`);
          await loadData();
        }
      } else {
        await googleAuthInvitationService.enableAuthorizedEmail(item.id);
        showToast(`Account authorization enabled for ${item.email}`);
        await loadData();
      }
    } catch (err: any) {
      alert(err.message || 'Error updating status.');
    }
  };

  const handleTogglePasswordLogin = async (item: AuthorizedStudioEmail) => {
    const nextState = item.allowPasswordLogin === false ? true : false;
    try {
      await googleAuthInvitationService.togglePasswordLogin(item.id, nextState);
      showToast(`Password login ${nextState ? 'enabled' : 'disabled'} for ${item.email}`);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Error updating password login status.');
    }
  };

  const handleToggleGoogleLogin = async (item: AuthorizedStudioEmail) => {
    const nextState = item.allowGoogleLogin === false ? true : false;
    try {
      await googleAuthInvitationService.toggleGoogleLogin(item.id, nextState);
      showToast(`Google Sign-In ${nextState ? 'enabled' : 'disabled'} for ${item.email}`);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Error updating Google Sign-In status.');
    }
  };

  const handleResetPassword = async (item: AuthorizedStudioEmail) => {
    if (confirm(`Dispatch a password reset email to "${item.email}"?`)) {
      try {
        const res = await googleAuthInvitationService.resetUserPassword(item.email);
        showToast(res.message || `Password reset instructions sent to ${item.email}`);
      } catch (err: any) {
        alert(err.message || 'Failed to dispatch password reset.');
      }
    }
  };

  const handleDelete = async (item: AuthorizedStudioEmail) => {
    if (confirm(`Are you sure you want to delete authorization for "${item.email}"? \nNote: Studio bookings, financial records and customer data will NOT be deleted.`)) {
      try {
        await googleAuthInvitationService.deleteAuthorizedEmail(item.id);
        showToast(`Authorization removed for ${item.email}`);
        await loadData();
      } catch (err: any) {
        alert(err.message || 'Error deleting authorization.');
      }
    }
  };

  const handleOpenEdit = (item: AuthorizedStudioEmail) => {
    setEditingItem(item);
    setEditEmail(item.email);
    setEditOwnerName(item.ownerName || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    try {
      await googleAuthInvitationService.editAuthorizedEmail(
        editingItem.id,
        editEmail,
        editOwnerName,
        'Master Admin'
      );
      setEditingItem(null);
      showToast(`Authorized email updated to ${editEmail}`);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Error updating email.');
    }
  };

  const copyInvitationLink = () => {
    if (!linkModalData) return;
    navigator.clipboard.writeText(linkModalData.link);
    setLinkModalData({ ...linkModalData, copied: true });
    setTimeout(() => {
      if (linkModalData) setLinkModalData({ ...linkModalData, copied: false });
    }, 3000);
  };

  return (
    <div className="w-full space-y-6 pb-20 font-sans">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 text-white font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 border border-orange-500/30 text-xs animate-in fade-in duration-200">
          <Sparkles className="w-4 h-4 text-orange-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-orange-50 text-orange-800 border border-orange-200">
              Settings & Access Control
            </span>
            <span className="text-xs text-zinc-500 font-medium">Authentication & User Registry</span>
          </div>
          <h1 className="text-2xl font-black text-zinc-900 font-display tracking-tight mt-1">
            Authorized Users & Login Methods
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Manage authorized emails, toggle Email+Password and Google Sign-In access, and send activation links.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setMasterRoute('settings')}
            className="min-h-[42px] px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 text-xs font-bold transition-all cursor-pointer shadow-2xs"
          >
            ← Back to Settings
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="min-h-[42px] px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-orange-500/20 transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Authorize New User Email</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-2xs">
          <span className="text-xs font-medium text-zinc-400 block uppercase tracking-wider">Total Authorized</span>
          <span className="text-2xl font-black text-zinc-900 font-display mt-0.5 block">{emails.length}</span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-2xs">
          <span className="text-xs font-medium text-zinc-400 block uppercase tracking-wider">Enabled Accounts</span>
          <span className="text-2xl font-black text-emerald-600 font-display mt-0.5 block">
            {emails.filter(e => e.status === 'enabled').length}
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-2xs">
          <span className="text-xs font-medium text-zinc-400 block uppercase tracking-wider">Password Login Active</span>
          <span className="text-2xl font-black text-blue-600 font-display mt-0.5 block">
            {emails.filter(e => e.allowPasswordLogin !== false).length}
          </span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-2xs">
          <span className="text-xs font-medium text-zinc-400 block uppercase tracking-wider">Google Sign-In Active</span>
          <span className="text-2xl font-black text-orange-600 font-display mt-0.5 block">
            {emails.filter(e => e.allowGoogleLogin !== false).length}
          </span>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="p-4 bg-white border border-zinc-200 rounded-2xl shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search email, owner name, or studio ID..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-700 font-medium focus:bg-white focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="enabled">Active Only</option>
            <option value="disabled">Inactive Only</option>
          </select>

          <select
            value={roleFilter}
            onChange={e => setRoleFilter(e.target.value)}
            className="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-700 font-medium focus:bg-white focus:outline-none"
          >
            <option value="all">All Roles</option>
            <option value="studio_owner">Studio Owner</option>
            <option value="employee">Employee</option>
          </select>

          <select
            value={invitationFilter}
            onChange={e => setInvitationFilter(e.target.value)}
            className="px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-700 font-medium focus:bg-white focus:outline-none"
          >
            <option value="all">All Registration States</option>
            <option value="not_sent">Not Sent</option>
            <option value="sent">Invitation Sent</option>
            <option value="accepted">Registered</option>
          </select>

          <button
            onClick={loadData}
            className="p-2 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl text-zinc-600 transition-colors cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-zinc-50/80 border-b border-zinc-200/80 text-zinc-400 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">User & Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Account Status</th>
                <th className="py-3 px-4 text-center">Password Login</th>
                <th className="py-3 px-4 text-center">Google Sign-In</th>
                <th className="py-3 px-4">Linked Studio</th>
                <th className="py-3 px-4">Last Login</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 font-sans">
              {filteredEmails.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-zinc-400">
                    No authorized email records found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredEmails.map(item => {
                  const isPasswordAllowed = item.allowPasswordLogin !== false;
                  const isGoogleAllowed = item.allowGoogleLogin !== false;
                  const roleLabel = item.role === 'employee' ? 'Employee' : 'Studio Owner';

                  return (
                    <tr key={item.id} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-zinc-900">{item.email}</div>
                        <div className="text-xs text-zinc-500">{item.ownerName || 'User'}</div>
                      </td>

                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                          item.role === 'employee'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-purple-50 text-purple-700 border border-purple-200'
                        }`}>
                          {roleLabel}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {item.status === 'enabled' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="w-3 h-3" /> Inactive
                          </span>
                        )}
                      </td>

                      {/* Password Login Toggle */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleTogglePasswordLogin(item)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isPasswordAllowed 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' 
                              : 'bg-zinc-100 text-zinc-400 border border-zinc-200 hover:bg-zinc-200'
                          }`}
                          title={`Click to ${isPasswordAllowed ? 'disable' : 'enable'} Password login`}
                        >
                          {isPasswordAllowed ? 'Enabled' : 'Disabled'}
                        </button>
                      </td>

                      {/* Google Sign-In Toggle */}
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleGoogleLogin(item)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isGoogleAllowed 
                              ? 'bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100' 
                              : 'bg-zinc-100 text-zinc-400 border border-zinc-200 hover:bg-zinc-200'
                          }`}
                          title={`Click to ${isGoogleAllowed ? 'disable' : 'enable'} Google login`}
                        >
                          {isGoogleAllowed ? 'Enabled' : 'Disabled'}
                        </button>
                      </td>

                      <td className="py-3 px-4">
                        {item.linkedStudioId ? (
                          <div>
                            <div className="font-bold text-zinc-800">{item.linkedStudioName || item.linkedStudioId}</div>
                            <div className="font-mono text-zinc-400 text-xs">{item.linkedStudioId}</div>
                          </div>
                        ) : (
                          <span className="text-zinc-400 italic">Pending Registration</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-zinc-500 font-mono text-xs">
                        {item.lastLoginAt ? new Date(item.lastLoginAt).toLocaleString() : 'Never'}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Resend / Send Invitation */}
                          <button
                            type="button"
                            onClick={() => handleSendOrResendInvitation(item.id, item.email)}
                            className="p-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 cursor-pointer transition-colors"
                            title="Resend invitation / setup link"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>

                          {/* Reset Password */}
                          <button
                            type="button"
                            onClick={() => handleResetPassword(item)}
                            className="p-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 cursor-pointer transition-colors"
                            title="Reset password"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          {/* Toggle Active / Disabled Account Access */}
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(item)}
                            className={`p-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                              item.status === 'enabled'
                                ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            }`}
                            title={item.status === 'enabled' ? 'Deactivate Account' : 'Activate Account'}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Email */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="p-1.5 rounded-lg bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-700 cursor-pointer transition-colors"
                            title="Edit email"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Authorization */}
                          <button
                            type="button"
                            onClick={() => handleDelete(item)}
                            className="p-1.5 rounded-lg bg-white hover:bg-rose-50 border border-zinc-200 text-rose-600 hover:border-rose-200 cursor-pointer transition-colors"
                            title="Delete authorization (preserves studio data)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Authorize New Email */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-zinc-200 max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-200">
                  <Mail className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-zinc-900">Authorize New User Email</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleAddEmail} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-zinc-700 font-semibold mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@gmail.com"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>

              <div>
                <label className="block text-zinc-700 font-semibold mb-1">
                  Full Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Aarav Patel"
                  value={newOwnerName}
                  onChange={e => setNewOwnerName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>

              <div>
                <label className="block text-zinc-700 font-semibold mb-1">User Role</label>
                <select
                  value={newRole}
                  onChange={e => setNewRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
                >
                  <option value="studio_owner">Studio Owner</option>
                  <option value="employee">Employee / Crew Member</option>
                </select>
              </div>

              {/* Login Method Permissions */}
              <div className="p-3 bg-zinc-50 rounded-2xl border border-zinc-200 space-y-2">
                <span className="font-bold text-zinc-700 block">Permitted Login Methods</span>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={allowPassword}
                    onChange={e => setAllowPassword(e.target.checked)}
                    className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500"
                  />
                  <span className="text-zinc-700 font-medium">Enable Email + Password Login</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={allowGoogle}
                    onChange={e => setAllowGoogle(e.target.checked)}
                    className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500"
                  />
                  <span className="text-zinc-700 font-medium">Enable Google Sign-In (One-Tap OAuth)</span>
                </label>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={sendImmediately}
                    onChange={e => setSendImmediately(e.target.checked)}
                    className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500"
                  />
                  <span className="text-zinc-700 font-semibold">
                    Generate registration invitation link immediately
                  </span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-2 rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold cursor-pointer shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? 'Authorizing...' : 'Authorize User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Show Invitation Link */}
      {linkModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-zinc-200 max-w-lg w-full p-6 shadow-2xl space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center gap-2.5 text-emerald-600 font-bold text-sm">
              <CheckCircle2 className="w-5 h-5" />
              <span>Invitation Link Ready</span>
            </div>

            <p className="text-xs text-zinc-600">
              Dispatched invitation to <strong className="text-zinc-900">{linkModalData.email}</strong>. You can also copy and share this link directly with the user:
            </p>

            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-between gap-2">
              <input
                type="text"
                readOnly
                value={linkModalData.link}
                className="bg-transparent font-mono text-xs text-zinc-700 w-full focus:outline-none"
              />
              <button
                type="button"
                onClick={copyInvitationLink}
                className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold rounded-lg shrink-0 flex items-center gap-1 cursor-pointer transition-colors"
              >
                {linkModalData.copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{linkModalData.copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setLinkModalData(null)}
                className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-bold rounded-xl text-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Email */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-zinc-200 max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in duration-150">
            <h3 className="font-bold text-sm text-zinc-900">Edit Authorized User</h3>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-zinc-700 font-semibold mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={e => setEditEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>

              <div>
                <label className="block text-zinc-700 font-semibold mb-1">Full Name</label>
                <input
                  type="text"
                  value={editOwnerName}
                  onChange={e => setEditOwnerName(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-3 py-2 rounded-xl border border-zinc-200 text-zinc-600 hover:bg-zinc-50 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold cursor-pointer shadow-md"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
