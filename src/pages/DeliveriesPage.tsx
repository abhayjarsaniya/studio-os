import React, { useState, useMemo } from 'react';
import { useStudio } from '../context/StudioContext';
import { useApp } from '../context/AppContext';
import { bookingProductionService } from '../services/bookingProductionService';
import { 
  DeliverableSpecification, 
  DeliveryStage, 
  DeliveryPriority, 
  DELIVERY_STAGE_LABELS, 
  DELIVERY_PRIORITY_LABELS 
} from '../types/bookingProduction';
import { 
  PackageCheck, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Calendar, 
  ExternalLink, 
  Sparkles, 
  User, 
  Layers, 
  ArrowRight,
  ShieldCheck,
  Check,
  X
} from 'lucide-react';

export const DeliveriesPage: React.FC = () => {
  const { currentStudio } = useStudio();
  const { setActiveTab, employees } = useApp();
  const studioId = currentStudio?.id || 'studio_royal_frames_001';

  const [stageFilter, setStageFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // Delivery update modal
  const [activeDeliverable, setActiveDeliverable] = useState<DeliverableSpecification | null>(null);
  const [modalForm, setModalForm] = useState({
    stage: 'delivered' as DeliveryStage,
    completedQty: 0,
    fileLinkRef: '',
    verifiedBy: 'Studio Owner',
    deliveryNotes: ''
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const deliverables = useMemo(() => {
    return bookingProductionService.listDeliverables(studioId);
  }, [studioId, refreshKey]);

  const metrics = useMemo(() => {
    return bookingProductionService.getProductionMetrics(studioId);
  }, [studioId, refreshKey]);

  const filteredDeliverables = useMemo(() => {
    return deliverables.filter(d => {
      if (stageFilter !== 'all' && d.stage !== stageFilter) return false;
      if (priorityFilter !== 'all' && d.priority !== priorityFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          d.name.toLowerCase().includes(q) ||
          (d.functionName && d.functionName.toLowerCase().includes(q)) ||
          d.deliveryMethod.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [deliverables, stageFilter, priorityFilter, searchTerm]);

  const handleOpenDeliverModal = (del: DeliverableSpecification) => {
    setActiveDeliverable(del);
    setModalForm({
      stage: 'delivered',
      completedQty: del.completedQty || del.requiredQty,
      fileLinkRef: del.fileLinkRef || '',
      verifiedBy: 'Studio Owner',
      deliveryNotes: del.deliveryNotes || ''
    });
  };

  const handleSaveDeliver = () => {
    if (!activeDeliverable) return;
    bookingProductionService.updateDeliverableStage(studioId, activeDeliverable.bookingId, activeDeliverable.id, {
      stage: modalForm.stage,
      completedQty: Number(modalForm.completedQty),
      fileLinkRef: modalForm.fileLinkRef,
      verifiedBy: modalForm.verifiedBy,
      deliveryNotes: modalForm.deliveryNotes
    });
    setActiveDeliverable(null);
    showToast(`Deliverable "${activeDeliverable.name}" status updated to ${DELIVERY_STAGE_LABELS[modalForm.stage]}!`);
    setRefreshKey(k => k + 1);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 text-white font-medium text-xs px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 border border-zinc-800 animate-in fade-in">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-zinc-900 text-white">
              Production & Logistics
            </span>
            <span className="text-xs text-zinc-500">11-Stage Production Lifecycle</span>
          </div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight mt-1">
            Deliveries & Production Checklist ({deliverables.length})
          </h1>
        </div>

        <button
          onClick={() => setActiveTab('bookings')}
          className="px-4 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold text-xs flex items-center gap-1.5 transition-all self-start sm:self-auto"
        >
          <span>View All Bookings</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Production Overview Metrics KPI Cards - Responsive Horizontal Scrollable on Mobile */}
      <div className="flex sm:grid overflow-x-auto sm:overflow-visible gap-2 sm:gap-3 pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 no-scrollbar touch-scroll sm:grid-cols-4 lg:grid-cols-6">
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-zinc-200 shadow-2xs shrink-0 min-w-[140px] sm:min-w-0">
          <span className="text-xs text-zinc-500 block font-semibold uppercase">Pending Items</span>
          <span className="text-2xl font-black text-zinc-900 mt-1 block font-tabular tabular-nums">{metrics.pendingDeliveriesCount}</span>
          <span className="text-xs text-amber-600 font-medium">In queue</span>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-zinc-200 shadow-2xs shrink-0 min-w-[140px] sm:min-w-0">
          <span className="text-xs text-rose-600 block font-semibold uppercase">Same-Day Priority</span>
          <span className="text-2xl font-black text-rose-600 mt-1 block font-tabular tabular-nums">{metrics.sameDayCount}</span>
          <span className="text-xs text-rose-600 font-medium">Instant turnaround</span>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-zinc-200 shadow-2xs shrink-0 min-w-[140px] sm:min-w-0">
          <span className="text-xs text-amber-600 block font-semibold uppercase">Due Tomorrow</span>
          <span className="text-2xl font-black text-amber-600 mt-1 block font-tabular tabular-nums">{metrics.dueTomorrowCount}</span>
          <span className="text-xs text-zinc-400 font-medium">24h deadline</span>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-zinc-200 shadow-2xs shrink-0 min-w-[140px] sm:min-w-0">
          <span className="text-xs text-indigo-600 block font-semibold uppercase">Editing In Progress</span>
          <span className="text-2xl font-black text-indigo-600 mt-1 block font-tabular tabular-nums">{metrics.editingInProgressCount}</span>
          <span className="text-xs text-zinc-400 font-medium">Post-production</span>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-zinc-200 shadow-2xs shrink-0 min-w-[140px] sm:min-w-0">
          <span className="text-xs text-purple-600 block font-semibold uppercase">Albums Pending</span>
          <span className="text-2xl font-black text-purple-600 mt-1 block font-tabular tabular-nums">{metrics.albumsPendingCount}</span>
          <span className="text-xs text-zinc-400 font-medium">Print & bind</span>
        </div>

        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-zinc-200 shadow-2xs shrink-0 min-w-[140px] sm:min-w-0">
          <span className="text-xs text-emerald-600 block font-semibold uppercase">Completed</span>
          <span className="text-2xl font-black text-emerald-600 mt-1 block font-tabular tabular-nums">{metrics.completedDeliveriesCount}</span>
          <span className="text-xs text-emerald-600 font-medium">{metrics.onTimePercentage}% on-time</span>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white border border-zinc-200 rounded-2xl p-3 sm:p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3.5 sm:top-2.5" />
          <input
            type="text"
            placeholder="Search deliverable name, function, or method..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 min-h-[44px] sm:min-h-[38px] bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-800 focus:outline-none focus:border-zinc-900"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Stage Filter */}
          <select
            value={stageFilter}
            onChange={e => setStageFilter(e.target.value)}
            className="flex-1 sm:flex-initial min-h-[44px] sm:min-h-[38px] bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-700 focus:outline-none focus:border-zinc-900"
          >
            <option value="all">All Stages ({deliverables.length})</option>
            {Object.entries(DELIVERY_STAGE_LABELS).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={e => setPriorityFilter(e.target.value)}
            className="flex-1 sm:flex-initial min-h-[44px] sm:min-h-[38px] bg-zinc-50 border border-zinc-200 rounded-xl px-3 py-2 text-xs text-zinc-700 focus:outline-none focus:border-zinc-900"
          >
            <option value="all">All Priorities</option>
            {Object.entries(DELIVERY_PRIORITY_LABELS).map(([k, label]) => (
              <option key={k} value={k}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Deliverables Checklist Table & Mobile List */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden shadow-2xs">
        {/* Mobile List View (Zero sideways scroll on phones) */}
        <div className="sm:hidden divide-y divide-zinc-100">
          {filteredDeliverables.length === 0 ? (
            <div className="p-8 text-center text-zinc-400 text-xs">
              No deliverables found matching the criteria.
            </div>
          ) : (
            filteredDeliverables.map(del => {
              const isSameDay = del.priority === 'instant_same_day';
              const isComplete = del.isDelivered;
              const isPartial = del.isPartiallyDelivered;

              return (
                <div key={del.id} className="p-3.5 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-base text-zinc-900 flex items-center gap-1.5">
                        {isComplete ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : isPartial ? (
                          <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                        ) : (
                          <div className="w-2.5 h-2.5 rounded-full bg-zinc-300 shrink-0" />
                        )}
                        <span>{del.name}</span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {del.functionName || 'Main Event'} • {del.deliveryMethod}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase inline-block ${
                        isComplete ? 'bg-emerald-100 text-emerald-800' : isPartial ? 'bg-amber-100 text-amber-800' : 'bg-zinc-100 text-zinc-600'
                      }`}>
                        {DELIVERY_STAGE_LABELS[del.stage] || del.stage}
                      </span>
                      <span className={`block mt-1 px-1.5 py-0.5 rounded text-[12px] font-black uppercase ${
                        isSameDay 
                          ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                          : del.priority === 'urgent'
                          ? 'bg-amber-100 text-amber-800'
                          : 'text-zinc-400'
                      }`}>
                        {DELIVERY_PRIORITY_LABELS[del.priority] || del.priority}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1 border-t border-zinc-50">
                    <span className="text-zinc-600 font-mono">
                      Qty: {del.completedQty} / {del.requiredQty} {del.unit}
                    </span>
                    <span className="text-zinc-600 font-mono">
                      Due: {del.calculatedDeadline}
                    </span>
                  </div>

                  <div className="pt-1">
                    <button
                      onClick={() => handleOpenDeliverModal(del)}
                      className="w-full min-h-[44px] px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs shadow-xs flex items-center justify-center gap-1.5 touch-manipulation active:scale-95 cursor-pointer"
                    >
                      <span>Update Delivery Status</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase font-bold border-b border-zinc-200">
              <tr>
                <th className="px-4 py-3">Deliverable Item</th>
                <th className="px-4 py-3">Function / Ceremony</th>
                <th className="px-4 py-3 text-center">Required Qty</th>
                <th className="px-4 py-3 text-center">Delivered Qty</th>
                <th className="px-4 py-3">Delivery Method</th>
                <th className="px-4 py-3">Target Deadline</th>
                <th className="px-4 py-3 text-center">Priority</th>
                <th className="px-4 py-3 text-center">Stage</th>
                <th className="px-4 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredDeliverables.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-zinc-400">
                    No deliverables found matching the criteria.
                  </td>
                </tr>
              ) : (
                filteredDeliverables.map(del => {
                  const isSameDay = del.priority === 'instant_same_day';
                  const isComplete = del.isDelivered;
                  const isPartial = del.isPartiallyDelivered;

                  return (
                    <tr key={del.id} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-zinc-900 flex items-center gap-1.5">
                          {isComplete ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          ) : isPartial ? (
                            <Clock className="w-4 h-4 text-amber-500" />
                          ) : (
                            <div className="w-2 h-2 rounded-full bg-zinc-300" />
                          )}
                          <span>{del.name}</span>
                        </div>
                        {del.fileLinkRef && (
                          <a
                            href={del.fileLinkRef}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-indigo-600 hover:underline flex items-center gap-1 mt-0.5"
                          >
                            <ExternalLink className="w-2.5 h-2.5" />
                            <span className="truncate max-w-[200px]">{del.fileLinkRef}</span>
                          </a>
                        )}
                      </td>

                      <td className="px-4 py-3 text-zinc-600">
                        {del.functionName || 'Main Event'}
                      </td>

                      <td className="px-4 py-3 text-center font-bold text-zinc-800">
                        {del.requiredQty} {del.unit}
                      </td>

                      <td className="px-4 py-3 text-center font-mono font-bold">
                        <span className={isComplete ? 'text-emerald-600' : isPartial ? 'text-amber-600' : 'text-zinc-400'}>
                          {del.completedQty} {del.unit}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-zinc-600">
                        {del.deliveryMethod}
                      </td>

                      <td className="px-4 py-3 font-mono text-zinc-700">
                        {del.calculatedDeadline}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-black uppercase ${
                          isSameDay 
                            ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                            : del.priority === 'urgent'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-zinc-100 text-zinc-600'
                        }`}>
                          {DELIVERY_PRIORITY_LABELS[del.priority] || del.priority}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                          isComplete ? 'bg-emerald-100 text-emerald-800' : isPartial ? 'bg-amber-100 text-amber-800' : 'bg-zinc-100 text-zinc-600'
                        }`}>
                          {DELIVERY_STAGE_LABELS[del.stage] || del.stage}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleOpenDeliverModal(del)}
                          className="px-3 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-xs shadow-2xs"
                        >
                          Mark Delivered
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: MARK DELIVERED / PROGRESS UPDATE */}
      {activeDeliverable && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 sm:p-6 max-w-md w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto relative animate-in fade-in zoom-in-95 duration-150">
            {/* Visible Close Button */}
            <button
              onClick={() => setActiveDeliverable(null)}
              className="absolute top-4 right-4 min-h-[44px] min-w-[44px] flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-xl transition-colors cursor-pointer touch-manipulation"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="pr-10">
              <h3 className="text-base sm:text-lg font-bold text-zinc-900 font-heading">Confirm Delivery & Update Progress</h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                {activeDeliverable.name} (Required: {activeDeliverable.requiredQty} {activeDeliverable.unit})
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-zinc-700 font-semibold mb-1">Delivered Stage</label>
                <select
                  value={modalForm.stage}
                  onChange={e => setModalForm({ ...modalForm, stage: e.target.value as any })}
                  className="w-full min-h-[44px] bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-zinc-900 focus:outline-none focus:border-zinc-900"
                >
                  <option value="delivered">Delivered to Client</option>
                  <option value="customer_confirmation">Customer Confirmation Received</option>
                  <option value="ready_for_delivery">Ready for Delivery</option>
                  <option value="editing">Editing In Progress</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-700 font-semibold mb-1">Delivered Quantity ({activeDeliverable.unit})</label>
                <input
                  type="number"
                  value={modalForm.completedQty}
                  onChange={e => setModalForm({ ...modalForm, completedQty: Number(e.target.value) })}
                  className="w-full min-h-[44px] bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-zinc-900 font-mono focus:outline-none focus:border-zinc-900"
                />
                <span className="text-xs text-zinc-400 mt-0.5 block">
                  Support partial delivery: enter less than {activeDeliverable.requiredQty} to mark partial.
                </span>
              </div>

              <div>
                <label className="block text-zinc-700 font-semibold mb-1">File / Cloud Link Reference</label>
                <input
                  type="text"
                  placeholder="https://drive.google.com/..."
                  value={modalForm.fileLinkRef}
                  onChange={e => setModalForm({ ...modalForm, fileLinkRef: e.target.value })}
                  className="w-full min-h-[44px] bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-zinc-900 font-mono focus:outline-none focus:border-zinc-900"
                />
              </div>

              <div>
                <label className="block text-zinc-700 font-semibold mb-1">Delivery Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Sent via WhatsApp link and handed over physical USB"
                  value={modalForm.deliveryNotes}
                  onChange={e => setModalForm({ ...modalForm, deliveryNotes: e.target.value })}
                  className="w-full bg-zinc-50 border border-zinc-300 rounded-xl p-3 text-zinc-900 focus:outline-none focus:border-zinc-900"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2 border-t border-zinc-100">
              <button
                onClick={() => setActiveDeliverable(null)}
                className="w-full sm:w-auto min-h-[48px] sm:min-h-[42px] px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-zinc-700 hover:bg-zinc-100 border border-zinc-200 flex items-center justify-center touch-manipulation active:scale-95 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveDeliver}
                className="w-full sm:w-auto min-h-[48px] sm:min-h-[42px] px-6 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs sm:text-sm font-bold shadow-xs flex items-center justify-center touch-manipulation active:scale-95 cursor-pointer"
              >
                Save Confirmation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
