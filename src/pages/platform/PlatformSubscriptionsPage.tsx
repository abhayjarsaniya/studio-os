import React, { useState, useMemo } from 'react';
import { usePlatform } from '../../context/PlatformContext';
import { platformSubscriptionManager, ComprehensiveSubscription } from '../../services/platformSubscriptionManager';
import { platformPlanService } from '../../services/platformPlanService';
import { SaaSSubscriptionStatus } from '../../types/schema';
import { 
  Layers, 
  CreditCard, 
  Clock, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle, 
  Ban, 
  Sliders, 
  ArrowRight,
  History,
  Calendar
} from 'lucide-react';

export const PlatformSubscriptionsPage: React.FC = () => {
  const { triggerRefresh, refreshTrigger, canAdmin, currentAdmin } = usePlatform();
  const [selectedSub, setSelectedSub] = useState<ComprehensiveSubscription | null>(null);
  const [transitionTargetStatus, setTransitionTargetStatus] = useState<SaaSSubscriptionStatus | ''>('');
  const [actionReason, setActionReason] = useState('');
  const [modalMode, setModalMode] = useState<'transition' | 'extend' | 'change_plan' | 'history' | null>(null);
  const [extendDays, setExtendDays] = useState(30);
  const [selectedPlanId, setSelectedPlanId] = useState('');

  const subscriptions = useMemo(() => {
    return platformSubscriptionManager.listSubscriptions();
  }, [refreshTrigger]);

  const plans = useMemo(() => platformPlanService.listPlans(), []);

  const handleOpenAction = (sub: ComprehensiveSubscription, mode: 'transition' | 'extend' | 'change_plan' | 'history') => {
    setSelectedSub(sub);
    setModalMode(mode);
    setActionReason('');
    setTransitionTargetStatus('');
    setSelectedPlanId(sub.planId);
  };

  const handleConfirmAction = () => {
    if (!selectedSub || !modalMode) return;

    if (modalMode === 'transition' && transitionTargetStatus) {
      platformSubscriptionManager.transitionStatus(
        selectedSub.studioId,
        transitionTargetStatus,
        actionReason || 'Manual transition by Master Admin',
        currentAdmin.name
      );
    } else if (modalMode === 'extend') {
      platformSubscriptionManager.extendSubscription(
        selectedSub.studioId,
        extendDays,
        actionReason || `Extended ${extendDays} days`,
        currentAdmin.name
      );
    } else if (modalMode === 'change_plan') {
      platformSubscriptionManager.changePlan(
        selectedSub.studioId,
        selectedPlanId,
        selectedSub.billingCycle,
        currentAdmin.name
      );
    }

    setModalMode(null);
    setSelectedSub(null);
    triggerRefresh();
  };

  return (
    <div className="w-full space-y-4 sm:space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="w-7 h-7 text-indigo-600" />
            SaaS Subscription Lifecycle Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Authoritative multi-tenant subscription states, agreed price preservation, atomic state transitions, and renewals.
          </p>
        </div>

        <div className="text-xs font-semibold text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs self-start sm:self-auto">
          {subscriptions.length} Subscriptions Active
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Studio & Tenant ID</th>
                <th className="px-4 py-3">Plan (Agreed Price)</th>
                <th className="px-4 py-3">Current Period</th>
                <th className="px-4 py-3">Next Renewal</th>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3 text-right">Lifecycle Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {subscriptions.map(sub => {
                const isActive = sub.status === 'active';
                const isTrial = sub.status === 'trial';
                const isSuspended = sub.status === 'suspended';
                const isPastDue = sub.status === 'past_due' || sub.status === 'grace_period';

                return (
                  <tr key={sub.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900 text-sm">{sub.studioName}</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">{sub.studioId}</div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900">{sub.planName} (v{sub.planVersion})</div>
                      <div className="text-xs text-indigo-600 font-semibold">
                        ₹{sub.agreedPrice} / {sub.billingCycle}
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-slate-600">
                      {sub.currentPeriodStart} to {sub.currentPeriodEnd}
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="font-medium text-slate-800">{sub.nextBillingDate}</span>
                      <span className="text-xs text-slate-400 block">
                        Auto-Renew: {sub.autoRenew ? 'Yes' : 'No'}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1 ${
                        isActive
                          ? 'bg-emerald-100 text-emerald-800'
                          : isTrial
                          ? 'bg-blue-100 text-blue-800'
                          : isSuspended
                          ? 'bg-rose-100 text-rose-800'
                          : isPastDue
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {sub.status.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {canAdmin('manage_subscriptions') && (
                          <>
                            <button
                              onClick={() => handleOpenAction(sub, 'transition')}
                              className="px-2 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
                              title="Transition Subscription Status"
                            >
                              Transition
                            </button>
                            <button
                              onClick={() => handleOpenAction(sub, 'change_plan')}
                              className="px-2 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg"
                              title="Change Plan"
                            >
                              Plan
                            </button>
                            <button
                              onClick={() => handleOpenAction(sub, 'extend')}
                              className="px-2 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg"
                              title="Extend Expiry Date"
                            >
                              +Days
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleOpenAction(sub, 'history')}
                          className="p-1 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100"
                          title="View Transition History"
                        >
                          <History className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Modals */}
      {selectedSub && modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">
              {modalMode === 'transition' && `Transition State: ${selectedSub.studioName}`}
              {modalMode === 'change_plan' && `Change Plan: ${selectedSub.studioName}`}
              {modalMode === 'extend' && `Extend Expiry: ${selectedSub.studioName}`}
              {modalMode === 'history' && `State Transition History: ${selectedSub.studioName}`}
            </h3>

            {/* Mode 1: Transition Status */}
            {modalMode === 'transition' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">
                  Current Status: <strong className="uppercase text-slate-800">{selectedSub.status}</strong>
                </p>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Target Status *</label>
                  <select
                    value={transitionTargetStatus}
                    onChange={e => setTransitionTargetStatus(e.target.value as any)}
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white"
                  >
                    <option value="">Select target state...</option>
                    <option value="active">Active (Verified Payment)</option>
                    <option value="trial">Trial</option>
                    <option value="payment_pending">Payment Pending</option>
                    <option value="past_due">Past Due</option>
                    <option value="grace_period">Grace Period</option>
                    <option value="suspended">Suspended (Operations Blocked)</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Reason / Justification *</label>
                  <input
                    type="text"
                    value={actionReason}
                    onChange={e => setActionReason(e.target.value)}
                    placeholder="Mandatory audit justification..."
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2"
                  />
                </div>
              </div>
            )}

            {/* Mode 2: Change Plan */}
            {modalMode === 'change_plan' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Select New SaaS Plan</label>
                  <select
                    value={selectedPlanId}
                    onChange={e => setSelectedPlanId(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white"
                  >
                    {plans.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} (v{p.version}) - ₹{selectedSub.billingCycle === 'annual' ? p.priceAnnual : p.priceMonthly}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-500 border border-slate-100">
                  Changing plan updates the studio's plan tier, limits, and agreed pricing to the new version.
                </div>
              </div>
            )}

            {/* Mode 3: Extend Subscription */}
            {modalMode === 'extend' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Extension Days</label>
                  <input
                    type="number"
                    value={extendDays}
                    onChange={e => setExtendDays(Number(e.target.value))}
                    min={1}
                    max={365}
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Reason / Justification *</label>
                  <input
                    type="text"
                    value={actionReason}
                    onChange={e => setActionReason(e.target.value)}
                    placeholder="e.g. Approved promotional extension by Master Admin"
                    className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2"
                  />
                </div>
              </div>
            )}

            {/* Mode 4: History */}
            {modalMode === 'history' && (
              <div className="max-h-64 overflow-y-auto space-y-2">
                {selectedSub.transitions.map(tr => (
                  <div key={tr.id} className="p-2.5 bg-slate-50 rounded-xl text-xs border border-slate-100">
                    <div className="flex justify-between items-center font-bold text-slate-900">
                      <span>[{tr.fromStatus}] → [{tr.toStatus}]</span>
                      <span className="text-xs text-slate-400 font-normal">
                        {new Date(tr.timestamp).toLocaleString('en-IN')}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{tr.reason}</p>
                    <div className="text-xs text-slate-400 mt-1">By: {tr.changedByName}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Dialog Footer */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setSelectedSub(null);
                  setModalMode(null);
                }}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800"
              >
                {modalMode === 'history' ? 'Close' : 'Cancel'}
              </button>

              {modalMode !== 'history' && (
                <button
                  type="button"
                  onClick={handleConfirmAction}
                  disabled={modalMode === 'transition' && (!transitionTargetStatus || !actionReason.trim())}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs disabled:opacity-50"
                >
                  Apply Change
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
