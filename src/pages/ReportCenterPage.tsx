import React, { useState, useMemo } from 'react';
import { useStudio } from '../context/StudioContext';
import { useApp } from '../context/AppContext';
import { 
  reportCenterService, 
  GeneratedReportData 
} from '../services/reportCenterService';
import { 
  ReportCategory, 
  SavedReportConfig, 
  AnalyticsFilter 
} from '../types/schema';
import { CustomReportBuilderModal } from '../components/analytics/CustomReportBuilderModal';
import { 
  FileSpreadsheet, 
  Download, 
  Printer, 
  Plus, 
  Calendar, 
  Layers, 
  Copy, 
  Trash2, 
  Play, 
  CheckCircle, 
  ArrowLeft,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: ReportCategory;
}

const STANDARD_TEMPLATES: ReportTemplate[] = [
  { id: 'biz_exec', name: 'Executive Studio Overview', description: 'Consolidated studio KPIs, cash-flow profit & delivery rate', category: 'business' },
  { id: 'evt_registry', name: 'Event Shoot Registry', description: 'Comprehensive registry of events, category, venue and status', category: 'events' },
  { id: 'cust_directory', name: 'Customer Directory & LTV', description: 'Customer profiles, lifetime revenue, contact details and event history', category: 'customers' },
  { id: 'prod_tasks', name: 'Workflow Tasks & Overdue Status', description: 'Production tasks across pipelines with deadlines and completion state', category: 'production' },
  { id: 'fin_revenue', name: 'Revenue & Invoicing Ledger', description: 'Legally issued invoices, payment collections, and pending balances', category: 'finance' },
  { id: 'team_workload', name: 'Team Workload & Attendance', description: 'Aggregated assignments, task completion rates and attendance summary', category: 'team' },
  { id: 'equip_register', name: 'Equipment & Maintenance Register', description: 'Gear catalog, live availability and service maintenance status', category: 'equipment' }
];

export const ReportCenterPage: React.FC = () => {
  const { currentStudio } = useStudio();
  const { setActiveTab } = useApp();
  const studioId = currentStudio?.id || 'studio_royal_001';

  const [selectedCategory, setSelectedCategory] = useState<ReportCategory>('business');
  const [activeReport, setActiveReport] = useState<GeneratedReportData | null>(null);
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const todayStr = new Date().toISOString().split('T')[0];
  const [filter, setFilter] = useState<AnalyticsFilter>({
    preset: 'this_month',
    startDate: `${todayStr.substring(0, 7)}-01`,
    endDate: todayStr
  });

  const [savedReports, setSavedReports] = useState<SavedReportConfig[]>(() => {
    return reportCenterService.listSavedReports(studioId);
  });

  const refreshSavedReports = () => {
    setSavedReports(reportCenterService.listSavedReports(studioId));
  };

  const handleRunTemplate = (template: ReportTemplate) => {
    const reportData = reportCenterService.generateReport(
      studioId,
      template.category,
      template.name,
      filter
    );
    setActiveReport(reportData);
    setCurrentPage(1);
  };

  const handleRunCustom = (category: ReportCategory, name: string, activeFilter: AnalyticsFilter) => {
    const reportData = reportCenterService.generateReport(
      studioId,
      category,
      name,
      activeFilter
    );
    setActiveReport(reportData);
    setCurrentPage(1);
  };

  const handleSaveReport = (config: Omit<SavedReportConfig, 'id' | 'studioId' | 'createdAt'>) => {
    reportCenterService.createSavedReport(studioId, config);
    refreshSavedReports();
  };

  const handleDeleteSaved = (id: string) => {
    if (window.confirm('Are you sure you want to delete this saved report configuration?')) {
      reportCenterService.deleteSavedReport(studioId, id);
      refreshSavedReports();
    }
  };

  const handleDuplicateSaved = (id: string) => {
    reportCenterService.duplicateSavedReport(studioId, id);
    refreshSavedReports();
  };

  // Safe CSV Download (Formula Injection Protected)
  const handleExportCSV = () => {
    if (!activeReport) return;
    const csvContent = reportCenterService.exportToCSV(activeReport);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${activeReport.name.replace(/\s+/g, '_')}_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Print / PDF Export
  const handlePrint = () => {
    if (!activeReport) return;
    const html = reportCenterService.generatePrintableHTML(activeReport);
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  // Paginated Rows
  const paginatedRows = useMemo(() => {
    if (!activeReport) return [];
    const start = (currentPage - 1) * pageSize;
    return activeReport.rows.slice(start, start + pageSize);
  }, [activeReport, currentPage]);

  const totalPages = activeReport ? Math.max(1, Math.ceil(activeReport.rows.length / pageSize)) : 1;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-7 h-7 text-indigo-600" />
            Report Center & Data Export
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('analytics')}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Analytics
          </button>
          <button
            onClick={() => setIsBuilderOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Create Custom Report
          </button>
        </div>
      </div>

      {/* Main View: Report Runner or Category Selector */}
      {!activeReport ? (
        <div className="space-y-6">
          {/* Categories Selector */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Report Categories
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {(['business', 'events', 'customers', 'production', 'finance', 'team', 'equipment'] as ReportCategory[]).map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-xs py-2 px-3 rounded-lg font-semibold capitalize border transition-all text-center ${
                    selectedCategory === cat
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Standard Templates for Selected Category */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-slate-800">
              Standard {selectedCategory.toUpperCase()} Templates
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {STANDARD_TEMPLATES.filter(t => t.category === selectedCategory).map(template => (
                <div
                  key={template.id}
                  className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-indigo-300 transition-all flex flex-col justify-between"
                >
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{template.name}</h3>
                    <p className="text-xs text-slate-500 mt-1">{template.description}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-400">Default columns included</span>
                    <button
                      onClick={() => handleRunTemplate(template)}
                      className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-colors"
                    >
                      <Play className="w-3.5 h-3.5" /> Run Report
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Saved Custom Reports Section */}
          <div className="space-y-3 pt-4 border-t border-slate-200">
            <h2 className="text-sm font-bold text-slate-800 flex items-center justify-between">
              <span>Saved Custom Configurations ({savedReports.length})</span>
            </h2>

            {savedReports.length === 0 ? (
              <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-6 text-center text-xs text-slate-500">
                No custom reports saved yet. Click "Create Custom Report" to save reusable report templates.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedReports.map(rep => (
                  <div
                    key={rep.id}
                    className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-900">{rep.name}</h3>
                        <span className="text-xs font-bold uppercase bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                          {rep.category}
                        </span>
                      </div>
                      {rep.description && (
                        <p className="text-xs text-slate-500 mt-1">{rep.description}</p>
                      )}
                      <div className="text-xs text-slate-400 mt-2">
                        Fields: {rep.selectedFields.join(', ')}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDuplicateSaved(rep.id)}
                          className="p-1.5 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-100"
                          title="Duplicate"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteSaved(rep.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <button
                        onClick={() => handleRunCustom(rep.category, rep.name, rep.filters)}
                        className="px-3 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg text-xs font-bold inline-flex items-center gap-1 transition-colors shadow-xs"
                      >
                        <Play className="w-3.5 h-3.5" /> Run Saved
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Report Output & Export Preview */
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <button
                onClick={() => setActiveReport(null)}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold inline-flex items-center gap-1 mb-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Close Preview & Return
              </button>
              <h2 className="text-base font-black text-slate-900">{activeReport.name}</h2>
              <div className="text-xs text-slate-400">
                {activeReport.totalRecords} records generated on {new Date(activeReport.generatedAt).toLocaleString('en-IN')}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold rounded-lg inline-flex items-center gap-1.5 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" /> Print / PDF
              </button>
              <button
                onClick={handleExportCSV}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg inline-flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Download className="w-3.5 h-3.5" /> Export Safe CSV
              </button>
            </div>
          </div>

          {/* Summary Strip */}
          {Object.keys(activeReport.summary).length > 0 && (
            <div className="flex items-center gap-3 flex-wrap">
              {Object.entries(activeReport.summary).map(([key, val]) => (
                <div key={key} className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs">
                  <span className="text-slate-500 font-medium block">{key}</span>
                  <span className="text-slate-900 font-bold text-sm mt-0.5 block">{String(val)}</span>
                </div>
              ))}
            </div>
          )}

          {/* Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider">
                  <tr>
                    {activeReport.columns.map(c => (
                      <th
                        key={c.key}
                        className={`px-4 py-3 ${c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left'}`}
                      >
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedRows.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80">
                      {activeReport.columns.map(c => (
                        <td
                          key={c.key}
                          className={`px-4 py-3 ${c.align === 'right' ? 'text-right' : c.align === 'center' ? 'text-center' : 'text-left'}`}
                        >
                          {row[c.key] !== undefined && row[c.key] !== null ? String(row[c.key]) : '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {paginatedRows.length === 0 && (
                    <tr>
                      <td colSpan={activeReport.columns.length} className="text-center py-8 text-slate-400">
                        No records match the current filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
                <span>Page {currentPage} of {totalPages}</span>
                <div className="flex items-center gap-1">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className="p-1 rounded hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className="p-1 rounded hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Custom Report Builder Modal */}
      <CustomReportBuilderModal
        isOpen={isBuilderOpen}
        onClose={() => setIsBuilderOpen(false)}
        onSaveReport={handleSaveReport}
        onRunReport={handleRunCustom}
      />
    </div>
  );
};
