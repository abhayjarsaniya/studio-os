import React, { useState, useMemo } from 'react';
import { usePlatform } from '../../context/PlatformContext';
import { platformStudioService, StudioListItem } from '../../services/platformStudioService';
import { StudioLifecycleStatus } from '../../types/schema';
import { 
  Building2, 
  Search, 
  Filter, 
  MoreVertical, 
  ShieldAlert, 
  CheckCircle, 
  Ban, 
  Archive, 
  FileText, 
  RotateCcw,
  Plus,
  KeyRound,
  Eye,
  EyeOff,
  Calendar,
  CreditCard,
  Copy,
  Check
} from 'lucide-react';

export const PlatformStudiosPage: React.FC = () => {
  const { setPlatformRoute, setSelectedStudioId, triggerRefresh, refreshTrigger, canAdmin } = usePlatform();

  const [searchTerm, setSearchTerm] = useState('');
  const [lifecycleFilter, setLifecycleFilter] = useState<string>('all');
  const [cityFilter, setCityFilter] = useState<string>('all');
  const [activeActionStudio, setActiveActionStudio] = useState<StudioListItem | null>(null);
  const [actionType, setActionType] = useState<'suspend' | 'activate' | 'archive' | 'note' | 'hide' | 'unhide' | null>(null);
  const [actionReason, setActionReason] = useState('');

  // Password reset credentials state
  const [resetResult, setResetResult] = useState<{
    studioName: string;
    ownerEmail: string;
    tempPassword: string;
  } | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const studios = useMemo(() => {
    return platformStudioService.listStudios({
      search: searchTerm.trim() || undefined,
      lifecycleStatus: lifecycleFilter !== 'all' ? (lifecycleFilter as StudioLifecycleStatus) : undefined,
      city: cityFilter !== 'all' ? cityFilter : undefined
    });
  }, [searchTerm, lifecycleFilter, cityFilter, refreshTrigger]);

  const handleOpenStudio = (studioId: string) => {
    setSelectedStudioId(studioId);
    setPlatformRoute('studio-detail');
  };

  const handleResetOwnerPassword = (s: StudioListItem) => {
    if (!window.confirm(`Reset Studio Owner password for "${s.name}"? A new temporary password will be generated.`)) {
      return;
    }
    const res = platformStudioService.resetStudioOwnerCredentials(s.id);
    if (res.success && res.temporaryPassword) {
      setResetResult({
        studioName: s.name,
        ownerEmail: res.ownerEmail,
        tempPassword: res.temporaryPassword
      });
      triggerRefresh();
    } else {
      alert((res as any).error || 'Failed to reset credentials.');
    }
  };

  const handleConfirmAction = () => {
    if (!activeActionStudio || !actionType) return;

    if (actionType === 'note') {
      if (!actionReason.trim()) return;
      platformStudioService.addInternalNote(activeActionStudio.id, actionReason.trim());
    } else if (actionType === 'suspend') {
      platformStudioService.updateStudioStatus(activeActionStudio.id, 'suspended', actionReason || 'Suspended by Master Admin');
    } else if (actionType === 'activate' || actionType === 'unhide') {
      platformStudioService.updateStudioStatus(activeActionStudio.id, 'active', actionReason || 'Reactivated by Master Admin');
    } else if (actionType === 'hide') {
      platformStudioService.hideStudio(activeActionStudio.id, actionReason || 'Hidden by Master Admin');
    } else if (actionType === 'archive') {
      platformStudioService.updateStudioStatus(activeActionStudio.id, 'archived', actionReason || 'Archived by Master Admin');
    }

    setActiveActionStudio(null);
    setActionType(null);
    setActionReason('');
    triggerRefresh();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-7 h-7 text-indigo-600" />
            Photography Studios Management
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Centralized directory of all registered photography studio tenants, lifecycle status, and subscription health.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs font-semibold text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
            {studios.length} Studios Found
          </div>
          {canAdmin('manage_studios') && (
            <button
              onClick={() => setPlatformRoute('create-studio')}
              className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Studio
            </button>
          )}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search by studio name, studio ID, owner phone, or email..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={lifecycleFilter}
            onChange={e => setLifecycleFilter(e.target.value)}
            className="w-full sm:w-auto text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white"
          >
            <option value="all">All Lifecycle States</option>
            <option value="active">Active</option>
            <option value="hidden">Hidden</option>
            <option value="suspended">Suspended</option>
            <option value="pending_activation">Pending Activation</option>
            <option value="archived">Archived</option>
          </select>

          <select
            value={cityFilter}
            onChange={e => setCityFilter(e.target.value)}
            className="w-full sm:w-auto text-xs border border-slate-200 rounded-xl px-3 py-2 bg-white"
          >
            <option value="all">All Cities</option>
            <option value="Ahmedabad">Ahmedabad</option>
            <option value="Surat">Surat</option>
            <option value="Vadodara">Vadodara</option>
            <option value="Rajkot">Rajkot</option>
            <option value="Gandhinagar">Gandhinagar</option>
            <option value="Mumbai">Mumbai</option>
          </select>
        </div>
      </div>

      {/* Studios Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Studio & ID</th>
                <th className="px-4 py-3">Owner Contact</th>
                <th className="px-4 py-3">Subscription</th>
                <th className="px-4 py-3 text-center">Events / Bookings</th>
                <th className="px-4 py-3 text-right">Received / Outstanding</th>
                <th className="px-4 py-3 text-center">Visibility</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {studios.map(s => {
                const isActive = s.lifecycleStatus === 'active';
                const isHidden = s.lifecycleStatus === 'hidden' || s.visibility === 'hidden';
                const isSuspended = s.lifecycleStatus === 'suspended';
                const isArchived = s.lifecycleStatus === 'archived';

                return (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Studio Name & ID */}
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-900 text-sm">{s.name}</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">{s.id}</div>
                      <div className="text-xs text-slate-500">{s.city} • Reg {s.registeredAt}</div>
                    </td>

                    {/* Owner Contact */}
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-800">{s.ownerName}</div>
                      <div className="text-xs text-slate-500">{s.ownerEmail}</div>
                      <div className="text-xs text-slate-600 font-mono">{s.ownerPhone || s.phone || 'N/A'}</div>
                    </td>

                    {/* Subscription */}
                    <td className="px-4 py-3.5">
                      <span className="font-bold text-slate-900">{s.planName}</span>
                      <span className="text-xs text-indigo-600 block font-medium">₹{s.planPrice}/mo</span>
                      <span className={`block text-xs font-bold uppercase ${
                        s.subscriptionStatus === 'active' ? 'text-emerald-600' : 'text-amber-600'
                      }`}>
                        {s.subscriptionStatus}
                      </span>
                    </td>

                    {/* Events & Bookings count */}
                    <td className="px-4 py-3.5 text-center">
                      <div className="font-bold text-slate-900">{s.eventsCount ?? 0} Events</div>
                      <div className="text-xs text-slate-500 font-medium">{s.bookingsCount ?? 0} Bookings</div>
                    </td>

                    {/* Received & Outstanding */}
                    <td className="px-4 py-3.5 text-right">
                      <div className="font-bold text-emerald-700">₹{(s.totalReceivedAmount ?? 0).toLocaleString('en-IN')}</div>
                      <div className="text-xs text-rose-600 font-semibold">
                        Out: ₹{(s.outstandingAmount ?? 0).toLocaleString('en-IN')}
                      </div>
                    </td>

                    {/* Visibility */}
                    <td className="px-4 py-3.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1 ${
                        isHidden
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        {isHidden ? 'Hidden' : 'Visible'}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1 ${
                        isActive
                          ? 'bg-emerald-100 text-emerald-800'
                          : isHidden
                          ? 'bg-purple-100 text-purple-800'
                          : isSuspended
                          ? 'bg-rose-100 text-rose-800'
                          : isArchived
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {isActive && <CheckCircle className="w-3 h-3 text-emerald-600" />}
                        {isSuspended && <Ban className="w-3 h-3 text-rose-600" />}
                        {isArchived && <Archive className="w-3 h-3 text-slate-500" />}
                        {s.lifecycleStatus.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end flex-wrap gap-1">
                        <button
                          onClick={() => handleOpenStudio(s.id)}
                          className="px-2.5 py-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                          title="View / Edit Studio Details"
                        >
                          View / Edit
                        </button>

                        <button
                          onClick={() => {
                            setSelectedStudioId(s.id);
                            setPlatformRoute('events');
                          }}
                          className="px-2 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                          title="View Studio Events"
                        >
                          Events
                        </button>

                        {canAdmin('manage_studios') && (
                          <>
                            {isHidden ? (
                              <button
                                onClick={() => {
                                  setActiveActionStudio(s);
                                  setActionType('unhide');
                                }}
                                className="px-2 py-1 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg"
                                title="Unhide Studio (Restore to directory)"
                              >
                                Unhide
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setActiveActionStudio(s);
                                  setActionType('hide');
                                }}
                                className="px-2 py-1 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg"
                                title="Hide Studio from directory"
                              >
                                Hide
                              </button>
                            )}

                            {isActive ? (
                              <button
                                onClick={() => {
                                  setActiveActionStudio(s);
                                  setActionType('suspend');
                                }}
                                className="px-2 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg"
                                title="Suspend Studio"
                              >
                                Suspend
                              </button>
                            ) : isSuspended ? (
                              <button
                                onClick={() => {
                                  setActiveActionStudio(s);
                                  setActionType('activate');
                                }}
                                className="px-2 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg"
                                title="Reactivate Studio"
                              >
                                Reactivate
                              </button>
                            ) : null}

                            <button
                              onClick={() => handleResetOwnerPassword(s)}
                              className="px-2 py-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg"
                              title="Reset Studio Owner temporary credentials"
                            >
                              <KeyRound className="w-3.5 h-3.5 inline mr-1" />
                              Reset Auth
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      {activeActionStudio && actionType && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-2 capitalize">
              {actionType} Studio: {activeActionStudio.name}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Please provide an administrative reason or internal note for this state transition.
            </p>

            <textarea
              rows={3}
              value={actionReason}
              onChange={e => setActionReason(e.target.value)}
              placeholder="e.g., Requested by owner, billing dispute, seasonal maintenance..."
              className="w-full text-xs p-3 border border-slate-200 rounded-xl focus:ring-1 focus:ring-indigo-500 mb-4"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setActiveActionStudio(null);
                  setActionType(null);
                  setActionReason('');
                }}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmAction}
                className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Owner Password Success Modal */}
      {resetResult && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <KeyRound className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 text-center mb-1">
              Studio Owner Password Reset
            </h3>
            <p className="text-xs text-slate-500 text-center mb-4">
              A temporary password was generated for <strong>{resetResult.studioName}</strong>. The owner will be required to change it upon first login.
            </p>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 mb-4 font-mono text-xs">
              <div className="flex justify-between items-center text-slate-600">
                <span>Email:</span>
                <span className="font-bold text-slate-900">{resetResult.ownerEmail}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Temp Password:</span>
                <span className="font-bold text-indigo-600 select-all">{resetResult.tempPassword}</span>
              </div>
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText(`Studio: ${resetResult.studioName}\nEmail: ${resetResult.ownerEmail}\nTemp Password: ${resetResult.tempPassword}`);
                setCopiedKey(true);
                setTimeout(() => setCopiedKey(false), 2000);
              }}
              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl flex items-center justify-center gap-2 mb-3"
            >
              {copiedKey ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              {copiedKey ? 'Copied to Clipboard' : 'Copy Credentials'}
            </button>

            <button
              onClick={() => setResetResult(null)}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl"
            >
              Done & Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
