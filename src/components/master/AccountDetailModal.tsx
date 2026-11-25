import React, { useEffect, useState } from 'react';
import {
  AccountDetailPayload,
  masterAccountsService,
  PlatformAccountRecord
} from '../../services/masterAccountsService';
import { useModalLifecycle } from '../../hooks/useModalLifecycle';
import {
  X,
  Crown,
  Building2,
  Briefcase,
  Phone,
  Mail,
  Key,
  ShieldCheck,
  Calendar,
  Clock,
  Users,
  FileText,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';

interface AccountDetailModalProps {
  account: PlatformAccountRecord;
  onClose: () => void;
  onUpdated: () => void;
}

export const AccountDetailModal: React.FC<AccountDetailModalProps> = ({
  account,
  onClose,
  onUpdated
}) => {
  const [detail, setDetail] = useState<AccountDetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit form state
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(account.displayName);
  const [phone, setPhone] = useState(account.phone || '');
  const [loginId, setLoginId] = useState(account.loginId);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const { handleAttemptClose, handleBackdropClick } = useModalLifecycle({
    isOpen: true,
    onClose,
    isDirty: isEditing,
    confirmMessage: 'Discard unsaved changes to this account?'
  });

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    masterAccountsService
      .getAccountDetail(account.uid)
      .then((res) => {
        if (!active) return;
        setDetail(res);
        setDisplayName(res.displayName);
        setPhone(res.phone || '');
        setLoginId(res.loginId);
      })
      .catch((err: any) => {
        if (!active) return;
        setError(err?.message || 'Failed to load account details.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [account.uid]);

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      setError('Display name is required.');
      return;
    }
    setSaving(true);
    setError(null);
    setSaveMessage(null);
    try {
      await masterAccountsService.updateAccount({
        uid: account.uid,
        displayName: displayName.trim(),
        phone: phone.trim(),
        loginId: account.accountType !== 'MASTER_ADMIN' ? loginId.trim() : undefined
      });
      setSaveMessage('Account updated successfully.');
      setIsEditing(false);
      onUpdated();
      const refreshed = await masterAccountsService.getAccountDetail(account.uid);
      setDetail(refreshed);
    } catch (err: any) {
      setError(err?.message || 'Failed to update account.');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (val?: string | null) => {
    if (!val) return 'Never';
    const d = new Date(val);
    if (Number.isNaN(d.getTime())) return 'Not available';
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(val || 0);

  return (
    <div 
      className="fixed inset-0 z-50 bg-zinc-950/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="w-full max-w-2xl bg-white border border-zinc-200 rounded-3xl shadow-2xl overflow-hidden my-8"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 bg-zinc-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 border border-amber-200 flex items-center justify-center">
              {account.accountType === 'MASTER_ADMIN' ? (
                <Crown className="w-5 h-5 text-amber-600" />
              ) : account.accountType === 'STUDIO_OWNER' ? (
                <Building2 className="w-5 h-5 text-indigo-600" />
              ) : (
                <Briefcase className="w-5 h-5 text-emerald-600" />
              )}
            </div>
            <div>
              <h2 className="text-lg font-black text-zinc-900 font-display">
                {detail?.displayName || account.displayName}
              </h2>
              <p className="text-xs text-zinc-500 font-mono">UID: {account.uid}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleAttemptClose}
            className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/60 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {saveMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{saveMessage}</span>
            </div>
          )}

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-zinc-500 text-sm">
              <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
              <span>Loading live Firebase account profile...</span>
            </div>
          ) : (
            <>
              {/* Identity Section */}
              <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-zinc-600">
                    Account Identity & Access
                  </h3>
                  {!isEditing && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="px-3 py-1.5 rounded-lg bg-white border border-zinc-200 hover:border-amber-400 text-xs font-bold text-zinc-800 transition-colors"
                    >
                      Edit Profile
                    </button>
                  )}
                </div>

                {isEditing ? (
                  <form onSubmit={handleSaveEdit} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-zinc-600 mb-1">
                          Display Name
                        </label>
                        <input
                          type="text"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-white border border-zinc-300 text-sm text-zinc-900 focus:outline-none focus:border-amber-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-600 mb-1">
                          Contact Phone
                        </label>
                        <input
                          type="text"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="Not provided"
                          className="w-full px-3 py-2 rounded-xl bg-white border border-zinc-300 text-sm text-zinc-900 focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      {account.accountType !== 'MASTER_ADMIN' && (
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-bold text-zinc-600 mb-1">
                            Login ID (Username)
                          </label>
                          <input
                            type="text"
                            value={loginId}
                            onChange={(e) => setLoginId(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-white border border-zinc-300 text-sm text-zinc-900 font-mono focus:outline-none focus:border-amber-500"
                            required
                          />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditing(false);
                          setDisplayName(detail?.displayName || account.displayName);
                          setPhone(detail?.phone || account.phone || '');
                          setLoginId(detail?.loginId || account.loginId);
                        }}
                        className="px-3 py-2 rounded-xl bg-white border border-zinc-200 text-xs font-bold text-zinc-700"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-black disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <Key className="w-4 h-4 text-zinc-400" />
                      <div>
                        <div className="text-zinc-500">Login ID</div>
                        <div className="font-bold text-zinc-900 font-mono">
                          {detail?.loginId || account.loginId}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-zinc-400" />
                      <div>
                        <div className="text-zinc-500">Contact Email</div>
                        <div className="font-semibold text-zinc-900">
                          {detail?.contactEmail || account.contactEmail || 'Not provided'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-zinc-400" />
                      <div>
                        <div className="text-zinc-500">Contact Number</div>
                        <div className="font-semibold text-zinc-900">
                          {detail?.phone || account.phone || 'Not provided'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-zinc-400" />
                      <div>
                        <div className="text-zinc-500">Role & Status</div>
                        <div className="font-semibold text-zinc-900">
                          {detail?.roleTitle || account.roleTitle} ·{' '}
                          <span
                            className={
                              (detail?.status || account.status) === 'active'
                                ? 'text-emerald-700 font-bold'
                                : 'text-rose-600 font-bold'
                            }
                          >
                            {(detail?.status || account.status).toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-zinc-400" />
                      <div>
                        <div className="text-zinc-500">Created Date</div>
                        <div className="font-semibold text-zinc-900">
                          {formatDate(detail?.createdAt || account.createdAt)}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-zinc-400" />
                      <div>
                        <div className="text-zinc-500">Last Login</div>
                        <div className="font-semibold text-zinc-900">
                          {formatDate(detail?.lastLoginAt || account.lastLoginAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Studio Association */}
              {detail?.studio && (
                <div className="p-4 rounded-2xl bg-white border border-zinc-200 space-y-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-zinc-600">
                    Studio Association
                  </h3>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div>
                      <div className="text-sm font-black text-zinc-900">{detail.studio.name}</div>
                      <div className="text-zinc-500 font-mono">{detail.studio.id}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-zinc-700 font-semibold">
                        {[detail.studio.city, detail.studio.state].filter(Boolean).join(', ') || 'Location not set'}
                      </div>
                      <div className="text-zinc-500 uppercase font-bold">
                        Plan: {detail.studio.subscriptionStatus} · {detail.studio.lifecycleStatus}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Business Summary (Studio Owner) */}
              {detail?.businessSummary && (
                <div className="p-4 rounded-2xl bg-white border border-zinc-200 space-y-3">
                  <h3 className="text-xs font-black uppercase tracking-wider text-zinc-600">
                    Live Studio Business Summary
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200">
                      <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                        <Users className="w-3.5 h-3.5" /> Customers
                      </div>
                      <div className="text-lg font-black text-zinc-900 mt-0.5">
                        {detail.businessSummary.customersCount}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200">
                      <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                        <Calendar className="w-3.5 h-3.5" /> Bookings
                      </div>
                      <div className="text-lg font-black text-zinc-900 mt-0.5">
                        {detail.businessSummary.bookingsCount}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200">
                      <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                        <FileText className="w-3.5 h-3.5" /> Quotations
                      </div>
                      <div className="text-lg font-black text-zinc-900 mt-0.5">
                        {detail.businessSummary.quotationsCount}
                      </div>
                    </div>
                    <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200">
                      <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                        <Briefcase className="w-3.5 h-3.5" /> Crew / Staff
                      </div>
                      <div className="text-lg font-black text-zinc-900 mt-0.5">
                        {detail.businessSummary.employeesCount}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-between">
                      <span className="text-xs font-bold text-indigo-800">
                        Total Invoiced ({detail.businessSummary.invoicesCount})
                      </span>
                      <span className="text-sm font-black text-indigo-950">
                        {formatCurrency(detail.businessSummary.totalInvoicedInr)}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                      <span className="text-xs font-bold text-emerald-800 flex items-center gap-1">
                        <CreditCard className="w-3.5 h-3.5" /> Payments ({detail.businessSummary.paymentsCount})
                      </span>
                      <span className="text-sm font-black text-emerald-950">
                        {formatCurrency(detail.businessSummary.totalPaidInr)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Employee Details */}
              {detail?.employeeDetails && (
                <div className="p-4 rounded-2xl bg-white border border-zinc-200 space-y-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-zinc-600">
                    Employee Assignment & Role
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <div className="text-zinc-500">Employee #</div>
                      <div className="font-bold text-zinc-900 font-mono">
                        {detail.employeeDetails.employeeNumber || 'Not provided'}
                      </div>
                    </div>
                    <div>
                      <div className="text-zinc-500">Department</div>
                      <div className="font-bold text-zinc-900">
                        {detail.employeeDetails.department || 'Not provided'}
                      </div>
                    </div>
                    <div>
                      <div className="text-zinc-500">Designation</div>
                      <div className="font-bold text-zinc-900">
                        {detail.employeeDetails.designation || 'Not provided'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Master Admin Permissions */}
              {account.accountType === 'MASTER_ADMIN' && (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-2">
                  <h3 className="text-xs font-black uppercase tracking-wider text-amber-800">
                    Master Admin Governance (Protected)
                  </h3>
                  <p className="text-xs text-amber-900">
                    Authorized platform super-administrator with full read/write governance across studios,
                    subscriptions, billing plans, and user accounts. Protected from deactivation or deletion.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-200 bg-zinc-50 flex justify-end">
          <button
            type="button"
            onClick={handleAttemptClose}
            className="min-h-[44px] px-5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
