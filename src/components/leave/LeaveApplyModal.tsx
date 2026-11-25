import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { LeaveType } from '../../types';
import { 
  X, 
  Calendar, 
  FileText, 
  AlertCircle, 
  Sparkles, 
  Clock 
} from 'lucide-react';
import { Button } from '../ui/Button';
import { useModalLifecycle } from '../../hooks/useModalLifecycle';

interface LeaveApplyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LeaveApplyModal: React.FC<LeaveApplyModalProps> = ({
  isOpen,
  onClose
}) => {
  const { 
    leaveTypes, 
    applyLeave, 
    currentUser, 
    employees 
  } = useApp();

  const currentEmp = employees.find(e => e.userId === currentUser.id || e.id === currentUser.id) || employees[0];

  const [leaveTypeId, setLeaveTypeId] = useState(leaveTypes[0]?.id || '');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const { handleAttemptClose, handleBackdropClick } = useModalLifecycle({
    isOpen,
    onClose,
    isDirty,
    confirmMessage: 'Discard unsaved leave application?'
  });

  if (!isOpen) return null;

  const calculateDays = (s: string, e: string) => {
    const d1 = new Date(s);
    const d2 = new Date(e);
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return 1;
    const diff = Math.ceil((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, diff);
  };

  const totalDays = calculateDays(startDate, endDate);
  const selectedType = leaveTypes.find(t => t.id === leaveTypeId) || leaveTypes[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide a reason for your leave request.');
      return;
    }
    if (endDate < startDate) {
      setError('End date cannot be earlier than start date.');
      return;
    }

    try {
      applyLeave({
        employeeId: currentEmp?.id || 'emp_royal_3',
        employeeName: currentEmp?.fullName || currentUser.name,
        leaveTypeId: selectedType?.id || 'lt_casual',
        leaveTypeName: selectedType?.name || 'Casual Leave',
        startDate,
        endDate,
        totalDays,
        reason: reason.trim(),
        documentUrl: documentUrl.trim() || undefined
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit leave request');
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="bg-white rounded-2xl w-full max-w-lg flex flex-col shadow-2xl border border-zinc-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 bg-zinc-50/50">
          <div>
            <h3 className="text-base font-bold text-zinc-900 font-display flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              Apply for Leave
            </h3>
            <p className="text-xs text-zinc-500">
              Submit your time-off request for review and studio scheduling
            </p>
          </div>
          <button
            type="button"
            onClick={handleAttemptClose}
            className="min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form 
          onSubmit={handleSubmit} 
          onChange={() => !isDirty && setIsDirty(true)}
          className="p-5 space-y-4 text-xs sm:text-sm"
        >
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Leave Type */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Select Leave Type *
            </label>
            <select
              value={leaveTypeId}
              onChange={e => setLeaveTypeId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-xs sm:text-sm bg-white"
            >
              {leaveTypes.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.isPaid ? 'Paid' : 'Unpaid'} • {t.defaultAllowancePerYear} Days/Year)
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-xs sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                End Date *
              </label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-xs sm:text-sm"
              />
            </div>
          </div>

          {/* Total Days Calculated */}
          <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center justify-between text-xs">
            <span className="text-zinc-600 font-medium">Requested Duration:</span>
            <span className="font-bold text-zinc-900 font-mono text-sm">{totalDays} {totalDays === 1 ? 'Day' : 'Days'}</span>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Reason for Absence *
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={3}
              placeholder="Please provide details for the studio operations team..."
              required
              className="w-full px-3 py-2 rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-900 text-xs"
            />
          </div>

          {/* Supporting Document */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Supporting Document URL (Optional)
            </label>
            <input
              type="url"
              value={documentUrl}
              onChange={e => setDocumentUrl(e.target.value)}
              placeholder="e.g. Doctor's note or medical certificate link"
              className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAttemptClose}
              className="min-h-[44px]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="bg-zinc-900 text-white"
            >
              Submit Request
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
