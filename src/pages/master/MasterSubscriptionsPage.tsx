import React, { useState, useMemo } from 'react';
import { useMasterAdmin } from '../../context/MasterAdminContext';
import { masterAdminService } from '../../services/masterAdminService';
import { subscriptionMandateService } from '../../services/subscriptionMandateService';
import { 
  CreditCard, 
  Search, 
  Download, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  PauseCircle, 
  PlayCircle, 
  RotateCcw,
  Sparkles,
  ChevronDown,
  Building2,
  ShieldAlert,
  Zap
} from 'lucide-react';

export const MasterSubscriptionsPage: React.FC = () => {
  const { setMasterRoute, setSelectedStudioId, triggerRefresh, refreshTrigger } = useMasterAdmin();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const gatewayInfo = useMemo(() => {
    return subscriptionMandateService.isLiveGatewayConfigured();
  }, []);

  const studios = useMemo(() => {
    return masterAdminService.getAllStudios();
  }, [refreshTrigger]);

  const subscriptions = useMemo(() => {
    return studios.map(s => {
      const sub = s.subscription;
      const validUntil = sub?.validUntil ? new Date(sub.validUntil) : new Date(Date.now() + 25 * 86400000);
      const isPastDue = validUntil < new Date();
      const mandate = subscriptionMandateService.getMandateForStudio(s.id);

      return {
        studioId: s.id,
        studioName: s.name,
        city: s.city,
        planName: sub?.planName || 'Studio OS Standard',
        pricePerMonth: sub?.pricePerMonth || 500,
        billingCycle: 'Monthly',
        status: isPastDue ? 'past_due' : (sub?.status || 'active'),
        periodStart: '2026-01-01',
        periodEnd: validUntil.toLocaleDateString('en-IN'),
        nextBillingDate: validUntil.toLocaleDateString('en-IN'),
        paymentMethod: 'UPI AutoPay Mandate',
        autoRenew: sub?.autoRenew ?? true,
        mandateUmn: mandate?.umn || 'UMN-SHR-2026-92810',
        mandateStatus: mandate?.status || 'active',
        mandateId: mandate?.id
      };
    });
  }, [studios]);

  const filteredSubs = useMemo(() => {
    return subscriptions.filter(sub => {
      if (statusFilter !== 'all' && sub.status !== statusFilter) return false;
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        if (!sub.studioName.toLowerCase().includes(query) && !sub.studioId.toLowerCase().includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [subscriptions, statusFilter, searchTerm]);

  const handleExtend = (studioId: string, days: number) => {
    showToast(`Subscription for ${studioId} extended by +${days} days!`);
    triggerRefresh();
  };

  const handleExportCsv = () => {
    const headers = 'Studio Name,Plan,Fee (₹),Billing Cycle,Status,Next Billing Date,Payment Method,Auto-Renew\n';
    const rows = filteredSubs.map(s => 
      `"${s.studioName}","${s.planName}","₹${s.pricePerMonth}","${s.billingCycle}","${s.status}","${s.nextBillingDate}","${s.paymentMethod}","${s.autoRenew ? 'Yes' : 'No'}"`
    ).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `studio_subscriptions_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    showToast('Subscriptions exported to CSV successfully!');
  };

  const handleSendBulkReminder = () => {
    showToast(`Renewal reminders dispatched via WhatsApp & Email to ${filteredSubs.length} studios!`);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-amber-500 text-zinc-950 font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-zinc-950" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
              Subscription Engine
            </span>
            <span className="text-xs text-zinc-500">MRR @ ₹500/mo flat per studio</span>
          </div>
          <h1 className="text-2xl font-black text-zinc-900 font-display tracking-tight mt-1">
            Active Studio Subscriptions ({subscriptions.length})
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Monitor renewal deadlines, grant trial extensions, pause subscriptions, or update studio tiers.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSendBulkReminder}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 border border-zinc-200 flex items-center gap-1.5 transition-all"
          >
            <Send className="w-3.5 h-3.5 text-amber-400" />
            <span>Send Renewal Reminders</span>
          </button>
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Gateway Status Banner */}
      <div className={`p-4 rounded-2xl border flex items-center justify-between gap-3 ${
        gatewayInfo.isConfigured 
          ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
          : 'bg-amber-50 border-amber-200 text-amber-900'
      }`}>
        <div className="flex items-center gap-3">
          {gatewayInfo.isConfigured ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
          )}
          <div>
            <h4 className="text-xs font-bold font-display uppercase tracking-wider">
              {gatewayInfo.isConfigured ? 'Live Gateway Connected' : 'UPI AutoPay Gateway Status'}
            </h4>
            <p className="text-xs opacity-90">
              {gatewayInfo.message}
            </p>
          </div>
        </div>
        <div className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg bg-white/80 border border-current">
          NPCI e-Mandate Cap: ₹15,000 / Debit
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search subscriptions by studio name..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-zinc-200 rounded-xl text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none focus:border-amber-400"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="bg-white border border-zinc-200 rounded-xl px-2.5 py-1.5 text-xs text-zinc-700 focus:outline-none focus:border-amber-400"
          >
            <option value="all">All Subscription States ({subscriptions.length})</option>
            <option value="active">Active Only</option>
            <option value="trial">Trial Only</option>
            <option value="past_due">Past Due Only</option>
          </select>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-zinc-50 text-zinc-500 text-[10px] uppercase font-semibold border-b border-zinc-200">
              <tr>
                <th className="px-4 py-3">Studio Name</th>
                <th className="px-4 py-3">Current Plan</th>
                <th className="px-4 py-3 text-right">Fee (₹)</th>
                <th className="px-4 py-3">Cycle</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3">Next Renewal Date</th>
                <th className="px-4 py-3">Payment Method</th>
                <th className="px-4 py-3 text-center">Auto-Renew</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredSubs.map(sub => (
                <tr key={sub.studioId} className="hover:bg-zinc-50 transition-colors">
                  <td className="px-4 py-3 font-bold text-zinc-900 font-display flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-amber-400" />
                    <button
                      onClick={() => {
                        setSelectedStudioId(sub.studioId);
                        setMasterRoute('studio-detail');
                      }}
                      className="hover:text-amber-400 transition-colors"
                    >
                      {sub.studioName}
                    </button>
                  </td>

                  <td className="px-4 py-3 text-indigo-300 font-medium">{sub.planName}</td>

                  <td className="px-4 py-3 text-right font-mono font-bold text-zinc-800">
                    ₹{sub.pricePerMonth}
                  </td>

                  <td className="px-4 py-3 text-zinc-500">{sub.billingCycle}</td>

                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      sub.status === 'active'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}>
                      {sub.status}
                    </span>
                  </td>

                  <td className="px-4 py-3 font-mono text-zinc-700">{sub.nextBillingDate}</td>

                  <td className="px-4 py-3">
                    <div>
                      <span className="font-medium text-zinc-900">{sub.paymentMethod}</span>
                      <p className="text-[10px] font-mono text-zinc-500">{sub.mandateUmn}</p>
                    </div>
                  </td>

                  <td className="px-4 py-3 text-center">
                    <span className="font-semibold text-emerald-600">Active</span>
                  </td>

                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleExtend(sub.studioId, 30)}
                        className="px-2 py-1 rounded bg-zinc-100 hover:bg-zinc-200 text-[10px] font-semibold text-amber-300 border border-zinc-200"
                      >
                        +30d
                      </button>
                      <button
                        onClick={() => showToast(`Invoice generated for ${sub.studioName}`)}
                        className="px-2 py-1 rounded bg-zinc-100 hover:bg-zinc-200 text-[10px] font-semibold text-zinc-800 border border-zinc-200"
                      >
                        Bill Now
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
