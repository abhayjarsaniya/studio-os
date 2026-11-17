import React, { useState, useMemo } from 'react';
import { masterAdminService } from '../../services/masterAdminService';
import { masterExportService, ExportColumn } from '../../services/masterExportService';
import { platformAuditService } from '../../services/platformAuditService';
import { TenantStore } from '../../services/tenantStore';
import { Employee, PayrollRun, PayrollEntry } from '../../types/schema';
import { 
  Receipt, 
  Search, 
  Filter, 
  Download, 
  FileText, 
  Plus, 
  CreditCard, 
  Calendar, 
  Users, 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight, 
  Trash2, 
  Edit3, 
  X, 
  Clock, 
  Sparkles,
  ShieldCheck,
  IndianRupee,
  Lock
} from 'lucide-react';

interface UnifiedPayrollRecord {
  id: string;
  studioId: string;
  studioName: string;
  employeeId: string;
  employeeName: string;
  role: string;
  month: string; // YYYY-MM
  baseSalary: number;
  bonus: number;
  deductions: number;
  netSalary: number;
  status: 'paid' | 'pending' | 'processing';
  paymentMethod: string;
  transactionRef: string;
  disbursedAt?: string;
}

export const MasterPayrollPage: React.FC = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudio, setSelectedStudio] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedMonth, setSelectedMonth] = useState('2026-11');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<UnifiedPayrollRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<UnifiedPayrollRecord | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    studioId: 'studio_shreeji_films',
    employeeId: '',
    month: '2026-11',
    baseSalary: 35000,
    bonus: 2000,
    deductions: 500,
    status: 'paid' as 'paid' | 'pending' | 'processing',
    paymentMethod: 'Bank Transfer (IMPS)',
    transactionRef: `SAL_${Date.now().toString().slice(-6)}`
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const studios = useMemo(() => {
    return masterAdminService.getAllStudios();
  }, [refreshKey]);

  // Aggregate employees across studios
  const allEmployees = useMemo(() => {
    const map = new Map<string, { name: string; role: string; salary: number; studioId: string }>();
    studios.forEach(st => {
      const emps = TenantStore.get<Employee>(st.id, 'employees') || [];
      emps.forEach(e => {
        const empName = e.fullName || (e as any).name || 'Staff Member';
        const empRole = e.designation || (e as any).role || e.roleName || 'Team Member';
        const empSalary = (e as any).monthlySalary || 30000;
        map.set(e.id, {
          name: empName,
          role: empRole,
          salary: empSalary,
          studioId: st.id
        });
      });
    });
    return map;
  }, [studios, refreshKey]);

  // Load real payroll records from TenantStore across all studios
  const allPayrollRecords = useMemo(() => {
    const list: UnifiedPayrollRecord[] = [];
    studios.forEach(st => {
      // Check stored custom payroll entries in studio storage
      const entries = TenantStore.get<UnifiedPayrollRecord>(st.id, 'master_payroll_records') || [];
      if (entries.length > 0) {
        list.push(...entries);
      } else {
        // Seed default records for active employees if empty
        const emps = TenantStore.get<Employee>(st.id, 'employees') || [];
        emps.forEach((emp, idx) => {
          const empName = emp.fullName || (emp as any).name || 'Staff Member';
          const empRole = emp.designation || (emp as any).role || emp.roleName || 'Team Member';
          const base = (emp as any).monthlySalary || 35000;
          const bonus = idx % 2 === 0 ? 2500 : 0;
          const deductions = 500;
          const net = base + bonus - deductions;
          list.push({
            id: `pay_${st.id}_${emp.id}_2026_11`,
            studioId: st.id,
            studioName: st.name,
            employeeId: emp.id,
            employeeName: empName,
            role: empRole,
            month: '2026-11',
            baseSalary: base,
            bonus,
            deductions,
            netSalary: net,
            status: idx === 0 ? 'paid' : (idx === 1 ? 'processing' : 'paid'),
            paymentMethod: 'Bank Transfer (NEFT)',
            transactionRef: `SAL_HDFC_${100000 + idx}`,
            disbursedAt: '2026-11-05'
          });
        });
      }
    });
    return list;
  }, [studios, refreshKey]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return allPayrollRecords.filter(r => {
      if (selectedStudio !== 'all' && r.studioId !== selectedStudio) return false;
      if (selectedStatus !== 'all' && r.status !== selectedStatus) return false;
      if (selectedMonth !== 'all' && r.month !== selectedMonth) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          r.employeeName.toLowerCase().includes(q) ||
          r.role.toLowerCase().includes(q) ||
          r.studioName.toLowerCase().includes(q) ||
          r.transactionRef.toLowerCase().includes(q)
        );
      }
      return true;
    }).sort((a, b) => b.month.localeCompare(a.month));
  }, [allPayrollRecords, selectedStudio, selectedStatus, selectedMonth, searchTerm]);

  // Financial KPIs
  const kpis = useMemo(() => {
    const totalOutflow = filteredRecords.reduce((sum, r) => sum + r.netSalary, 0);
    const totalDisbursed = filteredRecords.filter(r => r.status === 'paid').reduce((sum, r) => sum + r.netSalary, 0);
    const pendingDisbursement = filteredRecords.filter(r => r.status !== 'paid').reduce((sum, r) => sum + r.netSalary, 0);
    const staffCount = filteredRecords.length;
    return { totalOutflow, totalDisbursed, pendingDisbursement, staffCount };
  }, [filteredRecords]);

  // Pagination
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(start, start + itemsPerPage);
  }, [filteredRecords, currentPage]);

  const handleSavePayroll = () => {
    const targetStudioId = formData.studioId;
    const empInfo = allEmployees.get(formData.employeeId);
    const targetStudio = studios.find(s => s.id === targetStudioId);

    const net = Number(formData.baseSalary) + Number(formData.bonus) - Number(formData.deductions);

    const currentRecords = TenantStore.get<UnifiedPayrollRecord>(targetStudioId, 'master_payroll_records') || [];

    if (editingRecord) {
      const updated = currentRecords.map(r => {
        if (r.id === editingRecord.id) {
          return {
            ...r,
            month: formData.month,
            baseSalary: Number(formData.baseSalary),
            bonus: Number(formData.bonus),
            deductions: Number(formData.deductions),
            netSalary: net,
            status: formData.status,
            paymentMethod: formData.paymentMethod,
            transactionRef: formData.transactionRef
          };
        }
        return r;
      });
      TenantStore.set(targetStudioId, 'master_payroll_records', updated);
      platformAuditService.logAction('Master Admin', 'UPDATE_PAYROLL_ENTRY', 'payroll', editingRecord.id, `Updated payroll for ${editingRecord.employeeName} (${formData.month})`);
      showToast('Payroll record updated successfully.');
    } else {
      const newRec: UnifiedPayrollRecord = {
        id: `pay_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        studioId: targetStudioId,
        studioName: targetStudio?.name || 'Studio OS Studio',
        employeeId: formData.employeeId || 'emp_default',
        employeeName: empInfo?.name || 'Studio Staff',
        role: empInfo?.role || 'Team Member',
        month: formData.month,
        baseSalary: Number(formData.baseSalary),
        bonus: Number(formData.bonus),
        deductions: Number(formData.deductions),
        netSalary: net,
        status: formData.status,
        paymentMethod: formData.paymentMethod,
        transactionRef: formData.transactionRef,
        disbursedAt: formData.status === 'paid' ? new Date().toISOString().slice(0, 10) : undefined
      };
      TenantStore.set(targetStudioId, 'master_payroll_records', [newRec, ...currentRecords]);
      platformAuditService.logAction('Master Admin', 'CREATE_PAYROLL_ENTRY', 'payroll', newRec.id, `Created payroll for ${newRec.employeeName} (${formData.month})`);
      showToast('New payroll disbursement entry recorded.');
    }

    setIsAddModalOpen(false);
    setEditingRecord(null);
    setRefreshKey(k => k + 1);
  };

  const handleDeletePayroll = () => {
    if (!deletingRecord) return;
    const current = TenantStore.get<UnifiedPayrollRecord>(deletingRecord.studioId, 'master_payroll_records') || [];
    const filtered = current.filter(r => r.id !== deletingRecord.id);
    TenantStore.set(deletingRecord.studioId, 'master_payroll_records', filtered);
    platformAuditService.logAction('Master Admin', 'DELETE_PAYROLL_ENTRY', 'payroll', deletingRecord.id, `Deleted payroll for ${deletingRecord.employeeName}`);
    showToast(`Payroll record deleted.`);
    setDeletingRecord(null);
    setRefreshKey(k => k + 1);
  };

  const handleExport = (type: 'pdf' | 'excel') => {
    const exportColumns: ExportColumn[] = [
      { key: 'employeeName', label: 'Employee Name' },
      { key: 'role', label: 'Role' },
      { key: 'studioName', label: 'Studio Name' },
      { key: 'month', label: 'Period' },
      { key: 'baseSalaryFormatted', label: 'Base Pay', align: 'right', format: 'currency' },
      { key: 'bonusFormatted', label: 'Bonus/Incentive', align: 'right', format: 'currency' },
      { key: 'deductionsFormatted', label: 'Deductions', align: 'right', format: 'currency' },
      { key: 'netSalaryFormatted', label: 'Net Payable', align: 'right', format: 'currency' },
      { key: 'status', label: 'Payment Status' },
      { key: 'transactionRef', label: 'Reference / UTR' }
    ];

    const exportRows = filteredRecords.map(r => ({
      ...r,
      baseSalaryFormatted: `₹${r.baseSalary.toLocaleString('en-IN')}`,
      bonusFormatted: `₹${r.bonus.toLocaleString('en-IN')}`,
      deductionsFormatted: `₹${r.deductions.toLocaleString('en-IN')}`,
      netSalaryFormatted: `₹${r.netSalary.toLocaleString('en-IN')}`
    }));

    const options = {
      filename: `Platform_Payroll_${selectedMonth}`,
      title: 'Global Employee Payroll & Compensation Ledger',
      subtitle: `Master financial disbursement summary for ${selectedMonth}`,
      filterSummary: `Studio: ${selectedStudio} | Month: ${selectedMonth} | Status: ${selectedStatus}`,
      columns: exportColumns,
      rows: exportRows,
      summaryMetrics: [
        { label: 'Total Payroll', value: `₹${kpis.totalOutflow.toLocaleString('en-IN')}` },
        { label: 'Disbursed', value: `₹${kpis.totalDisbursed.toLocaleString('en-IN')}` },
        { label: 'Pending Payout', value: `₹${kpis.pendingDisbursement.toLocaleString('en-IN')}` },
        { label: 'Staff Count', value: kpis.staffCount }
      ],
      totals: {
        employeeName: 'TOTAL OUTFLOW',
        netSalaryFormatted: `₹${kpis.totalOutflow.toLocaleString('en-IN')}`
      }
    };

    if (type === 'excel') masterExportService.exportToExcel(options);
    else masterExportService.exportToPDF(options);
  };

  return (
    <div className="space-y-6 pb-20 w-full font-sans">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-zinc-900 text-white font-bold px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2 border border-orange-500/30 text-xs">
          <Sparkles className="w-4 h-4 text-orange-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-orange-50 text-orange-800 border border-orange-200 flex items-center gap-1">
              <Lock className="w-3 h-3 text-orange-600" />
              <span>Privileged Financial Ledger</span>
            </span>
            <span className="text-xs text-zinc-500 font-medium">Restricted to Level 1 Master Admin</span>
          </div>
          <h1 className="text-2xl font-black text-zinc-900 font-display tracking-tight mt-1">
            Payroll Administration
          </h1>
          <p className="text-xs text-zinc-500 mt-0.5">
            Cross-studio employee salary audits, bonus incentives, deductions, and payment settlements.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => handleExport('excel')}
            className="min-h-[42px] px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 text-xs font-bold flex items-center gap-2 shadow-2xs transition-all cursor-pointer active:scale-95"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Export Excel</span>
          </button>
          <button
            onClick={() => handleExport('pdf')}
            className="min-h-[42px] px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-50 text-zinc-700 border border-zinc-200 text-xs font-bold flex items-center gap-2 shadow-2xs transition-all cursor-pointer active:scale-95"
          >
            <FileText className="w-4 h-4 text-rose-600" />
            <span>Export PDF</span>
          </button>
          <button
            onClick={() => {
              const firstSt = studios[0]?.id || 'studio_shreeji_films';
              const firstEmps = TenantStore.get<Employee>(firstSt, 'employees') || [];
              setEditingRecord(null);
              setFormData({
                studioId: firstSt,
                employeeId: firstEmps[0]?.id || '',
                month: '2026-11',
                baseSalary: (firstEmps[0] as any)?.monthlySalary || 35000,
                bonus: 2000,
                deductions: 500,
                status: 'paid',
                paymentMethod: 'Bank Transfer (IMPS)',
                transactionRef: `SAL_${Date.now().toString().slice(-6)}`
              });
              setIsAddModalOpen(true);
            }}
            className="min-h-[42px] px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-orange-500/20 transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Payroll Entry</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-2xs">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Total Payroll Outflow</span>
          <div className="text-2xl font-black text-zinc-900 mt-1 font-display">₹{(kpis.totalOutflow / 100000).toFixed(2)}L</div>
          <span className="text-xs text-zinc-500 mt-0.5 block">{kpis.staffCount} salaries for {selectedMonth}</span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-2xs">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Total Disbursed</span>
          <div className="text-2xl font-black text-emerald-600 mt-1 font-display">₹{(kpis.totalDisbursed / 100000).toFixed(2)}L</div>
          <span className="text-xs text-emerald-600 font-bold mt-0.5 block">Bank settlements complete</span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-2xs">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Pending Payout</span>
          <div className="text-2xl font-black text-rose-600 mt-1 font-display">₹{(kpis.pendingDisbursement / 100000).toFixed(2)}L</div>
          <span className="text-xs text-zinc-500 mt-0.5 block">Awaiting payment run</span>
        </div>
        <div className="p-4 rounded-2xl bg-white border border-zinc-200 shadow-2xs">
          <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider block">Audited Studios</span>
          <div className="text-2xl font-black text-orange-600 mt-1 font-display">{studios.length}</div>
          <span className="text-xs text-zinc-500 mt-0.5 block">All active tenants</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="p-4 bg-white border border-zinc-200 rounded-2xl shadow-2xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by employee name, role, studio, or UTR..."
            value={searchTerm}
            onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-800 focus:outline-none focus:bg-white min-h-[40px]"
          />
        </div>

        <select
          value={selectedStudio}
          onChange={e => { setSelectedStudio(e.target.value); setCurrentPage(1); }}
          className="min-h-[40px] px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 focus:outline-none focus:bg-white"
        >
          <option value="all">All Studios ({studios.length})</option>
          {studios.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <select
          value={selectedMonth}
          onChange={e => { setSelectedMonth(e.target.value); setCurrentPage(1); }}
          className="min-h-[40px] px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 focus:outline-none focus:bg-white"
        >
          <option value="all">All Periods</option>
          <option value="2026-11">November 2026</option>
          <option value="2026-10">October 2026</option>
          <option value="2026-09">September 2026</option>
        </select>

        <select
          value={selectedStatus}
          onChange={e => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
          className="min-h-[40px] px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-bold text-zinc-800 focus:outline-none focus:bg-white"
        >
          <option value="all">All Statuses</option>
          <option value="paid">Paid</option>
          <option value="processing">Processing</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {/* Table Section */}
      <div className="bg-white border border-zinc-200 rounded-2xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-zinc-50/80 border-b border-zinc-200 text-zinc-500 font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Studio</th>
                <th className="py-3 px-4">Period</th>
                <th className="py-3 px-4 text-right">Base Salary</th>
                <th className="py-3 px-4 text-right">Bonus</th>
                <th className="py-3 px-4 text-right">Deductions</th>
                <th className="py-3 px-4 text-right">Net Payable</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Reference</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-zinc-400 font-medium">
                    No payroll entries found for selected criteria.
                  </td>
                </tr>
              ) : (
                paginatedRecords.map(r => (
                  <tr key={r.id} className="hover:bg-orange-50/20 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-zinc-900">{r.employeeName}</div>
                      <div className="text-zinc-400 text-xs">{r.role}</div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-zinc-800">{r.studioName}</td>
                    <td className="py-3.5 px-4 font-mono font-medium text-zinc-600">{r.month}</td>
                    <td className="py-3.5 px-4 text-right font-medium text-zinc-700">₹{r.baseSalary.toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-4 text-right font-medium text-emerald-600">+₹{r.bonus.toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-4 text-right font-medium text-rose-600">-₹{r.deductions.toLocaleString('en-IN')}</td>
                    <td className="py-3.5 px-4 text-right font-black text-zinc-900 text-sm">
                      ₹{r.netSalary.toLocaleString('en-IN')}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase border ${
                        r.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        r.status === 'processing' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-rose-50 text-rose-700 border-rose-200'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-zinc-500">
                      <div>{r.transactionRef}</div>
                      <div className="text-zinc-400">{r.paymentMethod}</div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setEditingRecord(r);
                            setFormData({
                              studioId: r.studioId,
                              employeeId: r.employeeId,
                              month: r.month,
                              baseSalary: r.baseSalary,
                              bonus: r.bonus,
                              deductions: r.deductions,
                              status: r.status,
                              paymentMethod: r.paymentMethod,
                              transactionRef: r.transactionRef
                            });
                            setIsAddModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 cursor-pointer"
                          title="Edit Payroll"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingRecord(r)}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          title="Delete Payroll"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-3.5 border-t border-zinc-100 flex items-center justify-between text-xs text-zinc-500">
          <span>Showing page {currentPage} of {totalPages} ({filteredRecords.length} records)</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-zinc-200 hover:bg-zinc-50 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-zinc-900">
                  {editingRecord ? 'Edit Payroll Entry' : 'New Payroll Disbursement'}
                </h3>
                <p className="text-xs text-zinc-500">Recorded into studio compensation ledger</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-zinc-400 hover:text-zinc-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-zinc-700 block mb-1">Target Studio</label>
                <select
                  value={formData.studioId}
                  disabled={Boolean(editingRecord)}
                  onChange={e => {
                    const stId = e.target.value;
                    const emps = TenantStore.get<Employee>(stId, 'employees') || [];
                    setFormData(d => ({
                      ...d,
                      studioId: stId,
                      employeeId: emps[0]?.id || '',
                      baseSalary: (emps[0] as any)?.monthlySalary || 35000
                    }));
                  }}
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-bold"
                >
                  {studios.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.city})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-zinc-700 block mb-1">Employee</label>
                <select
                  value={formData.employeeId}
                  disabled={Boolean(editingRecord)}
                  onChange={e => {
                    const emp = allEmployees.get(e.target.value);
                    setFormData(d => ({
                      ...d,
                      employeeId: e.target.value,
                      baseSalary: emp?.salary || 35000
                    }));
                  }}
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-bold"
                >
                  {(TenantStore.get<Employee>(formData.studioId, 'employees') || []).map(emp => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName || (emp as any).name} ({emp.designation || (emp as any).role || 'Staff'}) — Base ₹{((emp as any).monthlySalary || 35000).toLocaleString('en-IN')}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Payroll Period</label>
                  <select
                    value={formData.month}
                    onChange={e => setFormData(d => ({ ...d, month: e.target.value }))}
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl"
                  >
                    <option value="2026-11">November 2026</option>
                    <option value="2026-10">October 2026</option>
                    <option value="2026-09">September 2026</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Base Salary (₹)</label>
                  <input
                    type="number"
                    value={formData.baseSalary}
                    onChange={e => setFormData(d => ({ ...d, baseSalary: Number(e.target.value) }))}
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Bonus / Incentive (₹)</label>
                  <input
                    type="number"
                    value={formData.bonus}
                    onChange={e => setFormData(d => ({ ...d, bonus: Number(e.target.value) }))}
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-bold text-emerald-600"
                  />
                </div>
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Deductions / Advances (₹)</label>
                  <input
                    type="number"
                    value={formData.deductions}
                    onChange={e => setFormData(d => ({ ...d, deductions: Number(e.target.value) }))}
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-bold text-rose-600"
                  />
                </div>
              </div>

              <div className="p-3 bg-zinc-50 rounded-xl border border-zinc-200 flex items-center justify-between">
                <span className="font-bold text-zinc-700">Calculated Net Payable:</span>
                <span className="font-black text-sm text-zinc-900">
                  ₹{(Number(formData.baseSalary) + Number(formData.bonus) - Number(formData.deductions)).toLocaleString('en-IN')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Disbursement Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData(d => ({ ...d, status: e.target.value as any }))}
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-bold"
                  >
                    <option value="paid">Paid</option>
                    <option value="processing">Processing</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-zinc-700 block mb-1">Payment Method</label>
                  <select
                    value={formData.paymentMethod}
                    onChange={e => setFormData(d => ({ ...d, paymentMethod: e.target.value }))}
                    className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl"
                  >
                    <option value="Bank Transfer (IMPS)">Bank Transfer (IMPS)</option>
                    <option value="Bank Transfer (NEFT)">Bank Transfer (NEFT)</option>
                    <option value="UPI">UPI Transfer</option>
                    <option value="Cheque">Cheque Deposit</option>
                    <option value="Cash">Cash Voucher</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-zinc-700 block mb-1">Bank Reference / UTR Number</label>
                <input
                  type="text"
                  value={formData.transactionRef}
                  onChange={e => setFormData(d => ({ ...d, transactionRef: e.target.value }))}
                  placeholder="e.g. HDFC/IMPS/591029102931"
                  className="w-full p-2.5 bg-zinc-50 border border-zinc-200 rounded-xl font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-100">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePayroll}
                className="px-5 py-2 text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white rounded-xl shadow-xs cursor-pointer active:scale-95"
              >
                {editingRecord ? 'Save Changes' : 'Record Disbursement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingRecord && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center border border-rose-200">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900">Delete Payroll Record</h3>
                <p className="text-xs text-zinc-500">Remove salary entry from studio ledger</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200 text-xs space-y-1">
              <div><strong>Employee:</strong> {deletingRecord.employeeName}</div>
              <div><strong>Period:</strong> {deletingRecord.month}</div>
              <div><strong>Net Paid:</strong> ₹{deletingRecord.netSalary.toLocaleString('en-IN')}</div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={() => setDeletingRecord(null)}
                className="px-4 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePayroll}
                className="px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs cursor-pointer active:scale-95"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
