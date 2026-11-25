import React, { useEffect, useMemo, useState } from 'react';
import { useMasterAdmin } from '../../context/MasterAdminContext';
import {
  masterAccountsService,
  PlatformAccountRecord,
  PlatformAccountType
} from '../../services/masterAccountsService';
import { AccountDetailModal } from '../../components/master/AccountDetailModal';
import {
  Search,
  Key,
  UserX,
  UserCheck,
  Building2,
  Crown,
  Briefcase,
  Copy,
  Check,
  Plus,
  Eye,
  Trash2,
  ArrowUpDown,
  AlertCircle,
  Loader2,
  ShieldAlert
} from 'lucide-react';

type AccountTab = 'ALL' | PlatformAccountType | 'DEACTIVATED';
type SortField = 'name' | 'createdAt' | 'lastLoginAt' | 'accountType';

export const MasterAccountsPage: React.FC = () => {
  const { setMasterRoute } = useMasterAdmin();

  const [accounts, setAccounts] = useState<PlatformAccountRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Filters & sorting
  const [activeTab, setActiveTab] = useState<AccountTab>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudioFilter, setSelectedStudioFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'deactivated'>('all');
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Modals
  const [detailAccount, setDetailAccount] = useState<PlatformAccountRecord | null>(null);
  const [resetTarget, setResetTarget] = useState<PlatformAccountRecord | null>(null);
  const [customPassword, setCustomPassword] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [copied, setCopied] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<PlatformAccountRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [statusUpdatingUid, setStatusUpdatingUid] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsub = masterAccountsService.subscribeAccounts(
      (data) => {
        setAccounts(data);
        setLoading(false);
        setLoadError(null);
      },
      (err) => {
        setLoadError(err?.message || 'Failed to sync accounts from Firebase.');
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const studioOptions = useMemo(() => {
    const map = new Map<string, string>();
    accounts.forEach((a) => {
      if (a.studioId) {
        map.set(a.studioId, a.studioName || a.studioId);
      }
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [accounts]);

  const stats = useMemo(() => {
    return {
      total: accounts.length,
      masterAdmin: accounts.filter((a) => a.accountType === 'MASTER_ADMIN').length,
      owners: accounts.filter((a) => a.accountType === 'STUDIO_OWNER').length,
      employees: accounts.filter((a) => a.accountType === 'EMPLOYEE').length,
      deactivated: accounts.filter((a) => a.status !== 'active').length
    };
  }, [accounts]);

  const filteredAccounts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = accounts.filter((acc) => {
      if (activeTab === 'DEACTIVATED') {
        if (acc.status === 'active') return false;
      } else if (activeTab !== 'ALL' && acc.accountType !== activeTab) {
        return false;
      }

      if (selectedStudioFilter !== 'all' && acc.studioId !== selectedStudioFilter) {
        return false;
      }

      if (statusFilter === 'active' && acc.status !== 'active') return false;
      if (statusFilter === 'deactivated' && acc.status === 'active') return false;

      if (q) {
        const haystack = [
          acc.displayName,
          acc.loginId,
          acc.phone,
          acc.contactEmail,
          acc.studioName || '',
          acc.studioId || '',
          acc.uid
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      return true;
    });

    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') {
        cmp = a.displayName.localeCompare(b.displayName);
      } else if (sortField === 'accountType') {
        cmp = a.accountType.localeCompare(b.accountType);
      } else if (sortField === 'lastLoginAt') {
        const ta = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0;
        const tb = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0;
        cmp = ta - tb;
      } else {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        cmp = ta - tb;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [accounts, activeTab, selectedStudioFilter, statusFilter, searchQuery, sortField, sortDir]);

  const handleToggleStatus = async (acc: PlatformAccountRecord) => {
    if (acc.accountType === 'MASTER_ADMIN') return;
    const nextStatus = acc.status === 'active' ? 'deactivated' : 'active';
    if (
      nextStatus === 'deactivated' &&
      !window.confirm(
        `Deactivate "${acc.displayName}" (${acc.loginId})? Their active sessions will be revoked immediately.`
      )
    ) {
      return;
    }

    setStatusUpdatingUid(acc.uid);
    setActionError(null);
    try {
      await masterAccountsService.updateAccount({
        uid: acc.uid,
        status: nextStatus
      });
    } catch (err: any) {
      setActionError(err?.message || 'Failed to update account status.');
    } finally {
      setStatusUpdatingUid(null);
    }
  };

  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget) return;
    setResetting(true);
    setActionError(null);
    try {
      const pass = await masterAccountsService.resetPassword(
        resetTarget.uid,
        customPassword.trim() || undefined
      );
      setGeneratedPassword(pass);
      setCustomPassword('');
    } catch (err: any) {
      setActionError(err?.message || 'Failed to reset password.');
    } finally {
      setResetting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setActionError(null);
    try {
      await masterAccountsService.deleteAccount(deleteTarget.uid);
      setDeleteTarget(null);
    } catch (err: any) {
      setActionError(err?.message || 'Failed to delete account.');
    } finally {
      setDeleting(false);
    }
  };

  const copyCredentials = () => {
    if (!resetTarget || !generatedPassword) return;
    const text = `=== STUDIO OS LOGIN CREDENTIALS ===\nAccount: ${resetTarget.displayName}\nLogin ID: ${resetTarget.loginId}\nNew Password: ${generatedPassword}\nLogin URL: ${window.location.origin}/#/studio/login`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const getAccountBadge = (type: PlatformAccountType) => {
    switch (type) {
      case 'MASTER_ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <Crown className="w-3 h-3 text-amber-500" />
            Master Admin
          </span>
        );
      case 'STUDIO_OWNER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
            <Building2 className="w-3 h-3 text-indigo-500" />
            Studio Owner
          </span>
        );
      case 'EMPLOYEE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <Briefcase className="w-3 h-3 text-emerald-500" />
            Employee
          </span>
        );
    }
  };

  const formatDate = (val?: string | null) => {
    if (!val) return 'Never';
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="w-full space-y-5 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
              Identity & Access Management
            </span>
            <span className="text-xs text-zinc-500">Live Firebase Account Directory</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 font-display tracking-tight mt-1">
            Platform Account Directory
          </h1>
        </div>

        <button
          onClick={() => setMasterRoute('create-studio')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-zinc-950 font-black text-xs shadow-lg shadow-amber-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Provision Studio & Owner</span>
        </button>
      </div>

      {/* Error banners */}
      {(loadError || actionError) && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{actionError || loadError}</span>
          </div>
          {actionError && (
            <button onClick={() => setActionError(null)} className="text-rose-600 hover:text-rose-900 font-bold">
              Dismiss
            </button>
          )}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-zinc-200">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Total Accounts</span>
          <div className="text-2xl font-black text-zinc-900 font-display mt-1">{stats.total}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-zinc-200">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-700">Master Admins</span>
          <div className="text-2xl font-black text-amber-600 font-display mt-1">{stats.masterAdmin}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-zinc-200">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">Studio Owners</span>
          <div className="text-2xl font-black text-indigo-600 font-display mt-1">{stats.owners}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-zinc-200">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">Employees</span>
          <div className="text-2xl font-black text-emerald-600 font-display mt-1">{stats.employees}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-zinc-200">
          <span className="text-xs font-bold uppercase tracking-wider text-rose-700">Deactivated</span>
          <div className="text-2xl font-black text-rose-600 font-display mt-1">{stats.deactivated}</div>
        </div>
      </div>

      {/* Tabs, Search & Filters */}
      <div className="space-y-3 p-3.5 bg-zinc-50 border border-zinc-200 rounded-2xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {(
              [
                { id: 'ALL', label: 'All Accounts' },
                { id: 'MASTER_ADMIN', label: 'Master Admin' },
                { id: 'STUDIO_OWNER', label: 'Studio Owners' },
                { id: 'EMPLOYEE', label: 'Employees' },
                { id: 'DEACTIVATED', label: 'Deactivated' }
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative min-w-[260px]">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search name, login ID, phone, studio..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-zinc-200 rounded-xl text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-amber-400 min-h-[42px]"
            />
          </div>
        </div>

        {/* Secondary Filters & Sort */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-zinc-200/70">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedStudioFilter}
              onChange={(e) => setSelectedStudioFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-white border border-zinc-200 text-xs font-semibold text-zinc-700 focus:outline-none focus:border-amber-400"
            >
              <option value="all">All Studios</option>
              {studioOptions.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-1.5 rounded-xl bg-white border border-zinc-200 text-xs font-semibold text-zinc-700 focus:outline-none focus:border-amber-400"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Only</option>
              <option value="deactivated">Deactivated Only</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500 font-medium">
              Showing {filteredAccounts.length} of {accounts.length}
            </span>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="px-3 py-1.5 rounded-xl bg-white border border-zinc-200 text-xs font-semibold text-zinc-700 focus:outline-none focus:border-amber-400"
            >
              <option value="createdAt">Sort: Created Date</option>
              <option value="name">Sort: Name</option>
              <option value="lastLoginAt">Sort: Last Login</option>
              <option value="accountType">Sort: Account Type</option>
            </select>
            <button
              onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
              className="px-2.5 py-1.5 rounded-xl bg-white border border-zinc-200 text-xs font-bold text-zinc-700 hover:bg-zinc-100 inline-flex items-center gap-1"
              title="Toggle sort direction"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>{sortDir === 'asc' ? 'ASC' : 'DESC'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Accounts Table */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-700">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-xs font-black uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="py-3 px-4">User Name</th>
                <th className="py-3 px-4">Login ID & Contact</th>
                <th className="py-3 px-4">Account Type & Role</th>
                <th className="py-3 px-4">Studio & ID</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created / Last Login</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500 text-sm">
                    <div className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                      <span>Syncing live accounts from Firebase...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-400 font-medium text-sm">
                    No accounts found matching the current filters.
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((acc) => (
                  <tr key={acc.uid} className="hover:bg-zinc-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <button
                        onClick={() => setDetailAccount(acc)}
                        className="text-left group"
                      >
                        <div className="font-bold text-zinc-900 group-hover:text-amber-600 transition-colors">
                          {acc.displayName}
                        </div>
                        <div className="text-xs text-zinc-400 font-mono mt-0.5">{acc.uid.slice(0, 12)}…</div>
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-zinc-900 font-mono text-xs">{acc.loginId}</div>
                      <div className="text-xs text-zinc-500 mt-0.5">
                        {acc.phone || 'No phone'}
                        {acc.contactEmail ? ` · ${acc.contactEmail}` : ''}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1 items-start">
                        {getAccountBadge(acc.accountType)}
                        <span className="text-xs text-zinc-500">{acc.roleTitle}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {acc.studioId ? (
                        <div>
                          <div className="font-semibold text-zinc-800">{acc.studioName || acc.studioId}</div>
                          <div className="text-xs font-mono text-zinc-400">{acc.studioId}</div>
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-400 italic">Platform Level</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {acc.status === 'active' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          Deactivated
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-zinc-600">
                      <div>{formatDate(acc.createdAt)}</div>
                      <div className="text-zinc-400 mt-0.5">Last: {formatDate(acc.lastLoginAt)}</div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setDetailAccount(acc)}
                          title="View & Edit Account Details"
                          className="p-1.5 rounded-lg bg-white border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:border-zinc-400 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {acc.accountType !== 'MASTER_ADMIN' && (
                          <>
                            <button
                              onClick={() => {
                                setResetTarget(acc);
                                setGeneratedPassword(null);
                                setCustomPassword('');
                              }}
                              title="Reset Password"
                              className="p-1.5 rounded-lg bg-white border border-zinc-200 text-zinc-600 hover:text-amber-600 hover:border-amber-400 transition-colors"
                            >
                              <Key className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(acc)}
                              disabled={statusUpdatingUid === acc.uid}
                              title={acc.status === 'active' ? 'Deactivate Account' : 'Reactivate Account'}
                              className={`p-1.5 rounded-lg bg-white border border-zinc-200 transition-colors disabled:opacity-50 ${
                                acc.status === 'active'
                                  ? 'text-zinc-600 hover:text-rose-600 hover:border-rose-300'
                                  : 'text-zinc-600 hover:text-emerald-600 hover:border-emerald-300'
                              }`}
                            >
                              {acc.status === 'active' ? (
                                <UserX className="w-3.5 h-3.5" />
                              ) : (
                                <UserCheck className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              onClick={() => setDeleteTarget(acc)}
                              title="Delete Account"
                              className="p-1.5 rounded-lg bg-white border border-zinc-200 text-zinc-600 hover:text-rose-600 hover:border-rose-300 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Account Detail & Edit Modal */}
      {detailAccount && (
        <AccountDetailModal
          account={detailAccount}
          onClose={() => setDetailAccount(null)}
          onUpdated={() => {}}
        />
      )}

      {/* Password Reset Modal */}
      {resetTarget && (
        <div className="fixed inset-0 z-50 bg-zinc-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-zinc-200 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-500" />
                <h3 className="font-black text-zinc-900 font-display text-base">
                  {generatedPassword ? 'Password Updated' : 'Reset Account Password'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setResetTarget(null);
                  setGeneratedPassword(null);
                }}
                className="text-zinc-500 hover:text-zinc-900 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {generatedPassword ? (
              <>
                <p className="text-xs text-zinc-700 leading-relaxed">
                  A new password has been set in Firebase Authentication for{' '}
                  <strong>{resetTarget.displayName}</strong>. Active sessions have been revoked.
                </p>
                <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Login ID:</span>
                    <span className="font-mono font-bold text-zinc-900">{resetTarget.loginId}</span>
                  </div>
                  <div className="flex justify-between text-xs items-center">
                    <span className="text-zinc-500">New Password:</span>
                    <span className="font-mono font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                      {generatedPassword}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={copyCredentials}
                    className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs flex items-center justify-center gap-2 transition-all"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Copied!' : 'Copy Credentials'}</span>
                  </button>
                  <button
                    onClick={() => {
                      setResetTarget(null);
                      setGeneratedPassword(null);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs"
                  >
                    Done
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={handleConfirmResetPassword} className="space-y-4">
                <p className="text-xs text-zinc-600 leading-relaxed">
                  Set a new password for <strong>{resetTarget.displayName}</strong> ({resetTarget.loginId}). Leave blank
                  to auto-generate a secure password.
                </p>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 mb-1">
                    Custom Password (Optional, min 6 chars)
                  </label>
                  <input
                    type="text"
                    value={customPassword}
                    onChange={(e) => setCustomPassword(e.target.value)}
                    placeholder="Leave blank to auto-generate"
                    minLength={6}
                    className="w-full px-3 py-2.5 rounded-xl bg-white border border-zinc-300 text-sm text-zinc-900 font-mono focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setResetTarget(null)}
                    className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetting}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black disabled:opacity-50"
                  >
                    {resetting ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-zinc-950/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-zinc-200 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-rose-600">
              <ShieldAlert className="w-5 h-5" />
              <h3 className="font-black text-zinc-900 font-display text-base">Delete Account</h3>
            </div>
            <p className="text-xs text-zinc-700 leading-relaxed">
              Are you sure you want to permanently delete login access for{' '}
              <strong>{deleteTarget.displayName}</strong> (<code>{deleteTarget.loginId}</code>)?
            </p>
            {deleteTarget.studioName && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                Linked Studio: <strong>{deleteTarget.studioName}</strong>. All business records (bookings,
                customers, invoices, payments) will be preserved safely.
              </div>
            )}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
