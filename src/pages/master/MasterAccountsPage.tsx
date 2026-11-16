import React, { useState, useMemo } from 'react';
import { useMasterAdmin } from '../../context/MasterAdminContext';
import { unifiedAuthService, LogicalAccountType, UserAccount } from '../../services/unifiedAuthService';
import { 
  Users, 
  Search, 
  ShieldCheck, 
  Key, 
  UserX, 
  UserCheck, 
  Building2, 
  Crown, 
  Briefcase, 
  Truck, 
  Copy, 
  Check, 
  Plus, 
  Clock, 
  AlertCircle
} from 'lucide-react';

export const MasterAccountsPage: React.FC = () => {
  const { setMasterRoute } = useMasterAdmin();
  const [activeTab, setActiveTab] = useState<'ALL' | LogicalAccountType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudioFilter, setSelectedStudioFilter] = useState('all');
  const [resetModal, setResetModal] = useState<{ isOpen: boolean; accountName: string; loginId: string; tempPass: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);

  const accounts = useMemo(() => {
    return unifiedAuthService.listAllAccounts({
      accountType: activeTab === 'ALL' ? undefined : activeTab,
      studioId: selectedStudioFilter === 'all' ? undefined : selectedStudioFilter,
      search: searchQuery
    });
  }, [activeTab, selectedStudioFilter, searchQuery, refreshTick]);

  const stats = useMemo(() => {
    const all = unifiedAuthService.listAllAccounts();
    return {
      total: all.length,
      masterAdmin: all.filter(a => a.accountType === 'MASTER_ADMIN').length,
      owners: all.filter(a => a.accountType === 'STUDIO_OWNER').length,
      employees: all.filter(a => a.accountType === 'EMPLOYEE').length,
      suppliers: all.filter(a => a.accountType === 'EXTERNAL_SUPPLIER').length,
      active: all.filter(a => a.status === 'active').length,
      deactivated: all.filter(a => a.status === 'deactivated').length
    };
  }, [refreshTick]);

  const handleResetPassword = (accountId: string, accountName: string, loginId: string) => {
    try {
      const tempPass = unifiedAuthService.resetAccountPassword(accountId, 'Master Admin');
      setResetModal({
        isOpen: true,
        accountName,
        loginId,
        tempPass
      });
      setRefreshTick(prev => prev + 1);
    } catch (err: any) {
      alert(err.message || 'Failed to reset password.');
    }
  };

  const handleToggleStatus = (accountId: string, currentStatus: string) => {
    try {
      if (currentStatus === 'active') {
        if (confirm('Are you sure you want to deactivate this account? Active sessions will be terminated immediately.')) {
          unifiedAuthService.deactivateAccount(accountId, 'Master Admin');
        }
      } else {
        unifiedAuthService.reactivateAccount(accountId, 'Master Admin');
      }
      setRefreshTick(prev => prev + 1);
    } catch (err: any) {
      alert(err.message || 'Failed to update account status.');
    }
  };

  const copyResetCredentials = () => {
    if (!resetModal) return;
    const text = `=== STUDIO OS TEMPORARY CREDENTIALS ===\nAccount: ${resetModal.accountName}\nLogin ID: ${resetModal.loginId}\nTemporary Password: ${resetModal.tempPass}\n* Password change is required on next login.`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const getAccountBadge = (type: LogicalAccountType) => {
    switch (type) {
      case 'MASTER_ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <Crown className="w-3 h-3 text-amber-400" />
            Master Admin
          </span>
        );
      case 'STUDIO_OWNER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
            <Building2 className="w-3 h-3 text-indigo-400" />
            Studio Owner
          </span>
        );
      case 'EMPLOYEE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <Briefcase className="w-3 h-3 text-emerald-400" />
            Employee
          </span>
        );
      case 'EXTERNAL_SUPPLIER':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200">
            <Truck className="w-3 h-3 text-purple-400" />
            Supplier
          </span>
        );
    }
  };

  return (
    <div className="w-full space-y-4 sm:space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
              Identity & Access Management
            </span>
            <span className="text-xs text-zinc-500">Global Account Directory</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-900 font-display tracking-tight mt-1">Platform Account Directory</h1>
          <p className="text-sm text-zinc-600 mt-1">
            Centralized directory of all Master Admins, Studio Owners, Employees, and External Suppliers across the platform.
          </p>
        </div>

        <button
          onClick={() => setMasterRoute('create-studio')}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-zinc-950 font-black text-xs shadow-lg shadow-amber-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Provision Studio & Owner</span>
        </button>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-zinc-200">
          <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">Total Accounts</span>
          <div className="text-2xl font-black text-zinc-900 font-display mt-1">{stats.total}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-zinc-200">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Master Admins</span>
          <div className="text-2xl font-black text-amber-300 mt-1">{stats.masterAdmin}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-zinc-200">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Studio Owners</span>
          <div className="text-2xl font-black text-indigo-300 mt-1">{stats.owners}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-zinc-200">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Employees</span>
          <div className="text-2xl font-black text-emerald-300 mt-1">{stats.employees}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-zinc-200">
          <span className="text-xs font-bold uppercase tracking-wider text-purple-400">Suppliers</span>
          <div className="text-2xl font-black text-purple-300 mt-1">{stats.suppliers}</div>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-zinc-200">
          <span className="text-xs font-bold uppercase tracking-wider text-rose-400">Deactivated</span>
          <div className="text-2xl font-black text-rose-400 mt-1">{stats.deactivated}</div>
        </div>
      </div>

      {/* Search, Filter & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-zinc-50 border border-zinc-200 rounded-2xl">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {(['ALL', 'MASTER_ADMIN', 'STUDIO_OWNER', 'EMPLOYEE', 'EXTERNAL_SUPPLIER'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeTab === tab
                  ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
                  : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              {tab === 'ALL' ? 'All Accounts' : tab.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[240px]">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by name, login ID, email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-zinc-200 rounded-xl text-base sm:text-sm text-zinc-900 placeholder-zinc-400 focus:outline-none focus:border-amber-400 min-h-[44px]"
          />
        </div>
      </div>

      {/* Accounts Table */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-700">
            <thead className="bg-white border-b border-zinc-200 text-xs font-black uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="py-3 px-4">User Details</th>
                <th className="py-3 px-4">Login ID / Email</th>
                <th className="py-3 px-4">Account Type & Role</th>
                <th className="py-3 px-4">Studio Association</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {accounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-400 font-medium">
                    No accounts found matching the current criteria.
                  </td>
                </tr>
              ) : (
                accounts.map(acc => (
                  <tr key={acc.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-zinc-900 font-display">{acc.displayName}</div>
                      <div className="text-xs text-zinc-500 font-mono mt-0.5">{acc.id}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-zinc-800">{acc.loginId}</div>
                      <div className="text-xs text-zinc-500">{acc.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-col gap-1 items-start">
                        {getAccountBadge(acc.accountType)}
                        <span className="text-xs text-zinc-500">{acc.roleTitle}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {acc.studioName ? (
                        <div>
                          <div className="font-semibold text-zinc-800">{acc.studioName}</div>
                          <div className="text-xs font-mono text-zinc-400">{acc.studioId}</div>
                        </div>
                      ) : (
                        <span className="text-zinc-400 italic">Platform Level</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {acc.status === 'active' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          Deactivated
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-zinc-500">
                      {new Date(acc.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleResetPassword(acc.id, acc.displayName, acc.loginId)}
                          title="Generate Temporary Reset Password"
                          className="p-1.5 rounded-lg bg-white border border-zinc-200 text-zinc-500 hover:text-amber-300 hover:border-amber-400/40 transition-colors"
                        >
                          <Key className="w-3.5 h-3.5" />
                        </button>
                        {acc.accountType !== 'MASTER_ADMIN' && (
                          <button
                            onClick={() => handleToggleStatus(acc.id, acc.status)}
                            title={acc.status === 'active' ? 'Deactivate Account' : 'Reactivate Account'}
                            className={`p-1.5 rounded-lg bg-white border border-zinc-200 transition-colors ${
                              acc.status === 'active'
                                ? 'text-zinc-500 hover:text-rose-400 hover:border-rose-400/40'
                                : 'text-zinc-500 hover:text-emerald-400 hover:border-emerald-400/40'
                            }`}
                          >
                            {acc.status === 'active' ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                          </button>
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

      {/* Password Reset Modal */}
      {resetModal && (
        <div className="fixed inset-0 z-50 bg-white backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-zinc-200 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-400" />
                <h3 className="font-black text-zinc-900 font-display text-base">Temporary Password Generated</h3>
              </div>
              <button
                onClick={() => setResetModal(null)}
                className="text-zinc-500 hover:text-zinc-900 text-xs"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-zinc-700 leading-relaxed">
              A secure temporary password has been generated for <strong>{resetModal.accountName}</strong>. 
              Plaintext passwords are never stored. The user must change this password upon their next login.
            </p>

            <div className="p-4 rounded-xl bg-white border border-zinc-200 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Login ID:</span>
                <span className="font-mono font-bold text-zinc-900 font-display">{resetModal.loginId}</span>
              </div>
              <div className="flex justify-between text-xs items-center">
                <span className="text-zinc-500">Temporary Password:</span>
                <span className="font-mono font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  {resetModal.tempPass}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={copyResetCredentials}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-500/20"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied to Clipboard' : 'Copy Credentials'}</span>
              </button>
              <button
                onClick={() => setResetModal(null)}
                className="px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
