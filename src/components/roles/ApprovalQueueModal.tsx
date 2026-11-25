import React, { useState } from 'react';
import { ApprovalRequest, ApprovalStatus } from '../../types/schema';
import { Button } from '../ui/Button';
import { useModalLifecycle } from '../../hooks/useModalLifecycle';
import { 
  X, 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText, 
  DollarSign, 
  Calendar, 
  AlertTriangle,
  UserCheck
} from 'lucide-react';

interface ApprovalQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  requests: ApprovalRequest[];
  onApprove: (requestId: string, remarks?: string) => void;
  onReject: (requestId: string, remarks?: string) => void;
}

export const ApprovalQueueModal: React.FC<ApprovalQueueModalProps> = ({
  isOpen,
  onClose,
  requests,
  onApprove,
  onReject
}) => {
  const [filterStatus, setFilterStatus] = useState<ApprovalStatus | 'all'>('pending');
  const [remarksMap, setRemarksMap] = useState<Record<string, string>>({});

  const { handleAttemptClose, handleBackdropClick } = useModalLifecycle({
    isOpen,
    onClose
  });

  if (!isOpen) return null;

  const filtered = requests.filter(r => {
    if (filterStatus === 'all') return true;
    return r.status === filterStatus;
  });

  const getWorkflowBadge = (type: string) => {
    switch (type) {
      case 'event_cancellation':
        return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Event Cancellation</span>;
      case 'expense_claims':
        return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 flex items-center gap-1"><DollarSign className="w-3 h-3" /> Expense Claim</span>;
      case 'leave_requests':
        return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 flex items-center gap-1"><Calendar className="w-3 h-3" /> Leave Request</span>;
      case 'invoice_approval':
        return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 flex items-center gap-1"><FileText className="w-3 h-3" /> Invoice Approval</span>;
      case 'salary_payment_confirmation':
        return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1"><UserCheck className="w-3 h-3" /> Salary Confirmation</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-zinc-100 text-zinc-800">{type.replace('_', ' ')}</span>;
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden my-8"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 flex items-center justify-center">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900">
                Operational Approvals Queue
              </h3>
              <p className="text-xs text-zinc-500">
                Review, approve or reject shoot cancellations, expenses, leave, and invoices.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleAttemptClose}
            className="min-w-[44px] min-h-[44px] text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-100 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="px-6 py-3 border-b border-zinc-100 flex items-center gap-2">
          {(['pending', 'approved', 'rejected', 'all'] as const).map(st => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1 text-xs font-semibold rounded-lg capitalize cursor-pointer transition-colors ${
                filterStatus === st 
                  ? 'bg-zinc-900 text-white' 
                  : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
              }`}
            >
              {st} {st === 'pending' ? `(${requests.filter(r => r.status === 'pending').length})` : ''}
            </button>
          ))}
        </div>

        {/* Requests List */}
        <div className="p-6 space-y-3 max-h-[65vh] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-sm">
              No approval requests matching "{filterStatus}".
            </div>
          ) : (
            filtered.map(req => {
              const currentRemarks = remarksMap[req.id] || '';

              return (
                <div
                  key={req.id}
                  className="p-4 rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {getWorkflowBadge(req.workflowType)}
                      <h4 className="text-sm font-bold text-zinc-900">
                        {req.entityTitle}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{new Date(req.createdAt).toLocaleDateString()}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${
                        req.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                        req.status === 'rejected' ? 'bg-rose-100 text-rose-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {req.status}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs text-zinc-600 flex items-center gap-1.5">
                    <span className="font-semibold text-zinc-800">Requested by:</span>
                    <span>{req.requestedByName}</span>
                  </div>

                  {req.status === 'pending' ? (
                    <div className="pt-2 border-t border-zinc-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      <input
                        type="text"
                        placeholder="Add remarks or instructions (optional)..."
                        value={currentRemarks}
                        onChange={e => setRemarksMap({ ...remarksMap, [req.id]: e.target.value })}
                        className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-zinc-200 bg-zinc-50 focus:outline-none focus:bg-white"
                      />
                      <div className="flex items-center gap-2 self-end sm:self-auto">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onReject(req.id, currentRemarks)}
                          className="text-rose-600 border-rose-200 hover:bg-rose-50"
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1" /> Reject
                        </Button>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => onApprove(req.id, currentRemarks)}
                          className="bg-emerald-600 hover:bg-emerald-700"
                        >
                          <CheckCircle className="w-3.5 h-3.5 mr-1" /> Approve
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-zinc-500 bg-zinc-50 p-2.5 rounded-lg border border-zinc-100 flex items-center justify-between">
                      <div>
                        <span className="font-semibold">{req.status === 'approved' ? 'Approved by:' : 'Rejected by:'}</span> {req.reviewedByName || 'Admin'}
                        {req.remarks && <span className="italic ml-2 font-normal">"{req.remarks}"</span>}
                      </div>
                      <span className="text-xs">{req.reviewedAt ? new Date(req.reviewedAt).toLocaleDateString() : ''}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="px-6 py-3 border-t border-zinc-200 bg-zinc-50 flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
