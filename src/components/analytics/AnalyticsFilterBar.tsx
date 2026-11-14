import React from 'react';
import { AnalyticsFilter, AnalyticsDatePreset } from '../../types/schema';
import { Calendar, Filter, RotateCcw, Building2, Tag, Layers } from 'lucide-react';

interface AnalyticsFilterBarProps {
  filter: AnalyticsFilter;
  onFilterChange: (newFilter: AnalyticsFilter) => void;
  branches?: { id: string; name: string }[];
  categories?: string[];
}

const PRESET_LABELS: { preset: AnalyticsDatePreset; label: string }[] = [
  { preset: 'today', label: 'Today' },
  { preset: 'yesterday', label: 'Yesterday' },
  { preset: 'this_week', label: 'This Week' },
  { preset: 'last_week', label: 'Last Week' },
  { preset: 'this_month', label: 'This Month' },
  { preset: 'last_month', label: 'Last Month' },
  { preset: 'this_quarter', label: 'This Qtr' },
  { preset: 'this_year', label: 'This Year' },
  { preset: 'financial_year', label: 'FY (Apr-Mar)' },
  { preset: 'custom', label: 'Custom' }
];

export const AnalyticsFilterBar: React.FC<AnalyticsFilterBarProps> = ({
  filter,
  onFilterChange,
  branches = [],
  categories = []
}) => {
  const handlePresetSelect = (preset: AnalyticsDatePreset) => {
    onFilterChange({
      ...filter,
      preset
    });
  };

  const handleReset = () => {
    const today = new Date().toISOString().split('T')[0];
    onFilterChange({
      preset: 'this_month',
      startDate: `${today.substring(0, 7)}-01`,
      endDate: today,
      branchId: undefined,
      eventCategory: undefined,
      eventStatus: undefined
    });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm mb-6 space-y-4">
      {/* Preset Pills */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider mr-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> Date Preset:
          </span>
          {PRESET_LABELS.map(p => {
            const isActive = filter.preset === p.preset;
            return (
              <button
                key={p.preset}
                type="button"
                onClick={() => handlePresetSelect(p.preset)}
                className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleReset}
          className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 py-1 px-2 rounded hover:bg-slate-100"
          title="Reset to default filter"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset
        </button>
      </div>

      {/* Date Range Inputs & Dimension Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2 border-t border-slate-100 text-sm">
        {filter.preset === 'custom' ? (
          <>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Start Date</label>
              <input
                type="date"
                value={filter.startDate}
                onChange={e => onFilterChange({ ...filter, startDate: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">End Date</label>
              <input
                type="date"
                value={filter.endDate}
                onChange={e => onFilterChange({ ...filter, endDate: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </>
        ) : (
          <div className="md:col-span-2 flex items-center text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200/60">
            <span className="font-medium text-slate-700 mr-2">Active Range:</span>
            <span>{filter.startDate} to {filter.endDate}</span>
          </div>
        )}

        {/* Branch Filter */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
            <Building2 className="w-3 h-3" /> Branch
          </label>
          <select
            value={filter.branchId || ''}
            onChange={e => onFilterChange({ ...filter, branchId: e.target.value || undefined })}
            className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 bg-white"
          >
            <option value="">All Branches</option>
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>

        {/* Category Filter */}
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
            <Tag className="w-3 h-3" /> Event Category
          </label>
          <select
            value={filter.eventCategory || ''}
            onChange={e => onFilterChange({ ...filter, eventCategory: e.target.value || undefined })}
            className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500 bg-white"
          >
            <option value="">All Categories</option>
            {categories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
