import React, { useState } from 'react';
import { ReportCategory, SavedReportConfig, AnalyticsFilter } from '../../types/schema';
import { X, Save, Play, CheckSquare, Square, FileText } from 'lucide-react';
import { useModalLifecycle } from '../../hooks/useModalLifecycle';

interface CustomReportBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveReport: (config: Omit<SavedReportConfig, 'id' | 'studioId' | 'createdAt'>) => void;
  onRunReport: (category: ReportCategory, reportName: string, filter: AnalyticsFilter) => void;
}

const CATEGORY_FIELDS: Record<ReportCategory, { key: string; label: string }[]> = {
  events: [
    { key: 'eventNumber', label: 'Event ID' },
    { key: 'title', label: 'Event Title' },
    { key: 'customerName', label: 'Customer Name' },
    { key: 'category', label: 'Event Category' },
    { key: 'startDate', label: 'Start Date' },
    { key: 'venue', label: 'Venue' },
    { key: 'status', label: 'Status' }
  ],
  customers: [
    { key: 'name', label: 'Customer Name' },
    { key: 'phone', label: 'Phone Number' },
    { key: 'email', label: 'Email' },
    { key: 'city', label: 'City' },
    { key: 'status', label: 'Status' },
    { key: 'totalEvents', label: 'Events Count' },
    { key: 'totalSpent', label: 'Total Revenue (₹)' }
  ],
  finance: [
    { key: 'invoiceNumber', label: 'Invoice Number' },
    { key: 'customerName', label: 'Customer' },
    { key: 'invoiceDate', label: 'Invoice Date' },
    { key: 'dueDate', label: 'Due Date' },
    { key: 'totalAmount', label: 'Total Amount' },
    { key: 'paidAmount', label: 'Paid Amount' },
    { key: 'pendingAmount', label: 'Pending Due' },
    { key: 'status', label: 'Status' }
  ],
  production: [
    { key: 'taskNumber', label: 'Task ID' },
    { key: 'title', label: 'Task Title' },
    { key: 'eventName', label: 'Event' },
    { key: 'assignedToName', label: 'Assigned Crew' },
    { key: 'dueDate', label: 'Due Date' },
    { key: 'priority', label: 'Priority' },
    { key: 'status', label: 'Status' }
  ],
  team: [
    { key: 'fullName', label: 'Employee Name' },
    { key: 'designation', label: 'Designation' },
    { key: 'department', label: 'Department' },
    { key: 'assignedEventsCount', label: 'Assigned Events' },
    { key: 'totalTasksCount', label: 'Total Tasks' },
    { key: 'completedTasksCount', label: 'Completed Tasks' },
    { key: 'overdueTasksCount', label: 'Overdue Tasks' }
  ],
  business: [
    { key: 'metric', label: 'Business Metric' },
    { key: 'value', label: 'Value' }
  ],
  equipment: [
    { key: 'name', label: 'Equipment Name' },
    { key: 'category', label: 'Category' },
    { key: 'serialNumber', label: 'Serial No' },
    { key: 'status', label: 'Status' }
  ]
};

export const CustomReportBuilderModal: React.FC<CustomReportBuilderModalProps> = ({
  isOpen,
  onClose,
  onSaveReport,
  onRunReport
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ReportCategory>('events');
  const [selectedFields, setSelectedFields] = useState<string[]>([
    'eventNumber', 'title', 'customerName', 'category', 'startDate', 'status'
  ]);
  const [groupBy, setGroupBy] = useState<string>('none');
  const [sortBy, setSortBy] = useState<string>('startDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [preset, setPreset] = useState<'this_month' | 'last_month' | 'this_year' | 'financial_year'>('this_month');
  const [isDirty, setIsDirty] = useState(false);

  const { handleAttemptClose, handleBackdropClick } = useModalLifecycle({
    isOpen,
    onClose,
    isDirty,
    confirmMessage: 'Discard unsaved custom report configuration?'
  });

  if (!isOpen) return null;

  const availableFields = CATEGORY_FIELDS[category] || [];

  const handleCategoryChange = (cat: ReportCategory) => {
    setCategory(cat);
    const fields = CATEGORY_FIELDS[cat] || [];
    setSelectedFields(fields.map(f => f.key));
  };

  const toggleField = (fieldKey: string) => {
    if (selectedFields.includes(fieldKey)) {
      if (selectedFields.length > 1) {
        setSelectedFields(selectedFields.filter(k => k !== fieldKey));
      }
    } else {
      setSelectedFields([...selectedFields, fieldKey]);
    }
  };

  const getActiveFilter = (): AnalyticsFilter => {
    const today = new Date().toISOString().split('T')[0];
    return {
      preset,
      startDate: `${today.substring(0, 7)}-01`,
      endDate: today
    };
  };

  const handleRunNow = () => {
    onRunReport(category, name || `${category.toUpperCase()} Custom Report`, getActiveFilter());
    onClose();
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSaveReport({
      name: name.trim(),
      description: description.trim() || undefined,
      category,
      filters: getActiveFilter(),
      selectedFields,
      groupBy: groupBy !== 'none' ? groupBy : undefined,
      sortBy: sortBy || undefined,
      sortDirection,
      visualizationType: 'table',
      scheduledFrequency: 'none',
      createdBy: 'Studio Admin'
    });
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Custom Report Builder</h2>
              <p className="text-xs text-slate-500">Pick dataset, columns, filters and grouping</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleAttemptClose}
            className="min-w-[44px] min-h-[44px] rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-sm">
          {/* Report Name & Description */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Report Name *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Q4 Wedding Revenue & Deliveries"
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Description (Optional)</label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Purpose of this report..."
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Dataset / Category */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Dataset / Module *</label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {(['events', 'customers', 'finance', 'production', 'team', 'equipment'] as ReportCategory[]).map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleCategoryChange(cat)}
                  className={`text-xs py-2 px-2.5 rounded-lg font-medium capitalize border transition-all ${
                    category === cat
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Fields Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">Select Fields to Display</label>
              <span className="text-xs text-slate-400">
                {selectedFields.length} of {availableFields.length} selected
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200/70">
              {availableFields.map(f => {
                const checked = selectedFields.includes(f.key);
                return (
                  <label
                    key={f.key}
                    onClick={() => toggleField(f.key)}
                    className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer select-none py-1"
                  >
                    {checked ? (
                      <CheckSquare className="w-4 h-4 text-indigo-600 shrink-0" />
                    ) : (
                      <Square className="w-4 h-4 text-slate-300 shrink-0" />
                    )}
                    <span className="truncate">{f.label}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Filters & Sorting */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Date Range</label>
              <select
                value={preset}
                onChange={e => setPreset(e.target.value as any)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
              >
                <option value="this_month">This Month</option>
                <option value="last_month">Last Month</option>
                <option value="this_year">This Year</option>
                <option value="financial_year">Financial Year (Apr-Mar)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Group By</label>
              <select
                value={groupBy}
                onChange={e => setGroupBy(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
              >
                <option value="none">No Grouping</option>
                <option value="status">Status</option>
                <option value="category">Category</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Sort Direction</label>
              <select
                value={sortDirection}
                onChange={e => setSortDirection(e.target.value as any)}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between rounded-b-2xl">
          <button
            type="button"
            onClick={handleAttemptClose}
            className="text-xs text-slate-600 hover:text-slate-800 font-medium px-3 py-2 rounded-lg min-h-[44px]"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRunNow}
              className="px-3.5 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Play className="w-3.5 h-3.5" /> Run Now
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!name.trim()}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Save className="w-3.5 h-3.5" /> Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
