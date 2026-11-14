import React, { useState, useMemo } from 'react';
import { usePlatform } from '../../context/PlatformContext';
import { platformStudioService } from '../../services/platformStudioService';
import { platformSubscriptionManager } from '../../services/platformSubscriptionManager';
import { platformSupportService } from '../../services/platformSupportService';
import { platformPlanService } from '../../services/platformPlanService';
import { 
  Building2, 
  ArrowLeft, 
  CreditCard, 
  HardDrive, 
  Users, 
  Calendar, 
  ShieldCheck, 
  Key, 
  Clock, 
  Ban, 
  CheckCircle, 
  AlertTriangle,
  Receipt,
  FileText
} from 'lucide-react';

export const PlatformStudioDetailPage: React.FC = () => {
  const { selectedStudioId, setPlatformRoute, triggerRefresh, refreshTrigger, canAdmin, currentAdmin } = usePlatform();
  const studioId = selectedStudioId || 'studio_royal_001';

  const [activeTab, setActiveTab] = useState<'overview' | 'usage' | 'billing' | 'support_access'>('overview');
  const [supportReason, setSupportReason] = useState('');
  const [supportHours, setSupportHours] = useState(4);
  const [newNote, setNewNote] = useState('');

  const details = useMemo(() => {
    return platformStudioService.getStudioDetails(studioId);
  }, [studioId, refreshTrigger]);

  const supportGrants = useMemo(() => {
    return platformSupportService.listSupportAccessGrants().filter(g => g.studioId === studioId);
  }, [studioId, refreshTrigger]);

  const plans = useMemo(() => platformPlanService.listPlans(), []);

  if (!details) {
    return (
      <div className="p-8 text-center space-y-3">
        <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
        <h3 className="text-base font-bold text-slate-700">Studio Not Found</h3>
        <button
          onClick={() => setPlatformRoute('studios')}
          className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
        >
          Return to Studios Directory
        </button>
      </div>
    );
  }

  const handleGrantSupport = () => {
    if (!supportReason.trim()) return;
    platformSupportService.grantSupportAccess({
      studioId,
      studioName: details.profile.name,
      adminId: currentAdmin.id,
      adminName: currentAdmin.name,
      reason: supportReason.trim(),
      durationHours: supportHours
    });
    setSupportReason('');
    triggerRefresh();
  };

  const handleRevokeSupport = (grantId: string) => {
    platformSupportService.revokeSupportAccess(grantId, currentAdmin.name);
    triggerRefresh();
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    platformStudioService.addInternalNote(studioId, newNote.trim(), currentAdmin.name);
    setNewNote('');
    triggerRefresh();
  };

  const isSuspended = details.lifecycleStatus === 'suspended';

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => setPlatformRoute('studios')}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Studios
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {details.profile.name}
            </h1>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              details.lifecycleStatus === 'active'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-rose-100 text-rose-800'
            }`}>
              {details.lifecycleStatus}
            </span>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">Tenant ID: {details.profile.id}</p>
        </div>

        {/* Quick Actions */}
        {canAdmin('manage_studios') && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {isSuspended ? (
              <button
                onClick={() => {
                  platformStudioService.updateStudioStatus(studioId, 'active', 'Reactivated by Master Admin', currentAdmin.name);
                  triggerRefresh();
                }}
                className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs"
              >
                Reactivate Studio
              </button>
            ) : (
              <button
                onClick={() => {
                  platformStudioService.updateStudioStatus(studioId, 'suspended', 'Suspended by Master Admin', currentAdmin.name);
                  triggerRefresh();
                }}
                className="px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs"
              >
                Suspend Operations
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        {[
          { id: 'overview', label: 'Studio Overview' },
          { id: 'usage', label: 'Usage & Quotas' },
          { id: 'billing', label: 'Invoices & Billing' },
          { id: 'support_access', label: 'Audited Support Access' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 text-xs font-bold rounded-t-lg transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-indigo-600 text-indigo-600 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Studio Legal Profile */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                Business & Contact Profile
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Business Title / Owner:</span>
                  <span className="font-semibold text-slate-800">{details.profile.title || 'Studio Owner'}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Email:</span>
                  <span className="font-semibold text-slate-800">{details.profile.email}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Phone:</span>
                  <span className="font-semibold text-slate-800">{details.profile.phone}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Location:</span>
                  <span className="font-semibold text-slate-800">{details.profile.city}, {details.profile.address}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-50">
                  <span className="text-slate-500">Registered Date:</span>
                  <span className="font-semibold text-slate-800">{details.profile.createdAt.split('T')[0]}</span>
                </div>
              </div>
            </div>

            {/* SaaS Subscription Info */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">
                SaaS Subscription State
              </h3>
              {details.subscription ? (
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Plan Tier:</span>
                    <span className="font-bold text-indigo-700">{details.subscription.planName} (v{details.subscription.planVersion})</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Agreed Price:</span>
                    <span className="font-bold text-slate-900">₹{details.subscription.agreedPrice} / {details.subscription.billingCycle}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Current Period End:</span>
                    <span className="font-semibold text-slate-800">{details.subscription.currentPeriodEnd}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Subscription Status:</span>
                    <span className="font-bold uppercase text-emerald-600">{details.subscription.status}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500">Auto-Renewal:</span>
                    <span className="font-semibold text-slate-800">{details.subscription.autoRenew ? 'Enabled' : 'Disabled'}</span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400 py-4">No active subscription record found.</div>
              )}
            </div>
          </div>

          {/* Internal Notes */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Platform Internal Notes (Admin Only)</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                placeholder="Add confidential platform administrative note..."
                className="flex-1 text-xs border border-slate-200 rounded-xl px-3 py-2"
              />
              <button
                onClick={handleAddNote}
                disabled={!newNote.trim()}
                className="px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl disabled:opacity-50"
              >
                Add Note
              </button>
            </div>

            <div className="space-y-2">
              {details.internalNotes.map((note, idx) => (
                <div key={idx} className="p-2.5 bg-slate-50 rounded-xl text-xs text-slate-700 border border-slate-100">
                  {note}
                </div>
              ))}
              {details.internalNotes.length === 0 && (
                <div className="text-xs text-slate-400">No administrative notes recorded for this studio.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USAGE & QUOTAS */}
      {activeTab === 'usage' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 text-center shadow-xs">
              <Users className="w-5 h-5 text-indigo-600 mx-auto mb-1" />
              <div className="text-xs text-slate-500 font-medium">Team Members</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{details.usage.employeeCount}</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 text-center shadow-xs">
              <Building2 className="w-5 h-5 text-blue-600 mx-auto mb-1" />
              <div className="text-xs text-slate-500 font-medium">Studio Branches</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{details.usage.branchCount}</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 text-center shadow-xs">
              <Calendar className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
              <div className="text-xs text-slate-500 font-medium">Total Events</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{details.usage.eventCount}</div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 text-center shadow-xs">
              <HardDrive className="w-5 h-5 text-purple-600 mx-auto mb-1" />
              <div className="text-xs text-slate-500 font-medium">Storage Quota</div>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {Math.round(details.usage.storageUsageMb / 1024 * 10) / 10} GB
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: BILLING */}
      {activeTab === 'billing' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Platform Subscription Invoices</h3>
              <span className="text-xs text-slate-400">Strictly quarantined from tenant client invoices</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Invoice No</th>
                    <th className="px-4 py-3">Period</th>
                    <th className="px-4 py-3">Total Amount</th>
                    <th className="px-4 py-3">Paid Amount</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {details.invoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                      <td className="px-4 py-3 text-slate-600">{inv.billingPeriodStart} to {inv.billingPeriodEnd}</td>
                      <td className="px-4 py-3 font-bold text-slate-900">₹{inv.totalAmount.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3 text-emerald-600 font-semibold">₹{inv.paidAmount.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {details.invoices.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-slate-400">No platform subscription invoices issued yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: AUDITED SUPPORT ACCESS */}
      {activeTab === 'support_access' && (
        <div className="space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 flex items-start gap-3">
            <Key className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="font-bold">Audited Time-Limited Support Access Policy:</strong> Platform Master Admins do not possess persistent or unmonitored backdoors to customer tenant data. When assistance is requested by the studio owner, an audited support access grant with an explicit reason and automatic expiration must be generated. All actions taken during the session are permanently recorded in the immutable platform audit log.
            </div>
          </div>

          {/* Grant Generator */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Generate Temporary Support Access Grant</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason / Support Ticket ID *</label>
                <input
                  type="text"
                  value={supportReason}
                  onChange={e => setSupportReason(e.target.value)}
                  placeholder="e.g. Investigating GST quotation tax discrepancy reported in TICK-2026-000001"
                  className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Grant Duration (Hours)</label>
                <select
                  value={supportHours}
                  onChange={e => setSupportHours(Number(e.target.value))}
                  className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white"
                >
                  <option value={1}>1 Hour</option>
                  <option value={4}>4 Hours (Standard)</option>
                  <option value={12}>12 Hours</option>
                  <option value={24}>24 Hours (Max)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleGrantSupport}
                disabled={!supportReason.trim()}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs disabled:opacity-50"
              >
                Authorize Time-Limited Grant
              </button>
            </div>
          </div>

          {/* Active Grants List */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Support Access Grant History</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Authorized Admin</th>
                    <th className="px-4 py-3">Reason</th>
                    <th className="px-4 py-3">Expires At</th>
                    <th className="px-4 py-3">State</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {supportGrants.map(grant => {
                    const isExpired = grant.expiresAt < new Date().toISOString();
                    const isActive = !grant.isRevoked && !isExpired;

                    return (
                      <tr key={grant.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-slate-800">{grant.adminName}</td>
                        <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{grant.reason}</td>
                        <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                          {new Date(grant.expiresAt).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            isActive
                              ? 'bg-emerald-100 text-emerald-800'
                              : grant.isRevoked
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {isActive ? 'Active' : grant.isRevoked ? 'Revoked' : 'Expired'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {isActive && (
                            <button
                              onClick={() => handleRevokeSupport(grant.id)}
                              className="px-2 py-1 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg"
                            >
                              Revoke Now
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {supportGrants.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-6 text-slate-400">
                        No temporary support grants have been authorized for this studio.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
