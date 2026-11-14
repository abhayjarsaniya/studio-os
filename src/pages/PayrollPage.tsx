import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { SalaryProfile, PayrollRun, PaymentMethod } from '../types';
import { formatCurrency } from '../utils/formatters';
import { 
  ShieldCheck, 
  DollarSign, 
  Plus, 
  Calendar, 
  CreditCard, 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Download, 
  Users, 
  ArrowUpRight, 
  Lock,
  Building2,
  Sparkles,
  X
} from 'lucide-react';
import { Button } from '../components/ui/Button';

export const PayrollPage: React.FC = () => {
  const { 
    canViewSalary, 
    canManagePayroll, 
    salaryProfiles, 
    payrollRuns, 
    generateMonthlyPayrollRun, 
    recordSalaryTransaction, 
    saveSalaryProfile, 
    employees, 
    currentUser,
    currentRole 
  } = useApp();

  const [activeTab, setActiveTab] = useState<'runs' | 'profiles' | 'transactions'>('runs');
  const [selectedMonth, setSelectedMonth] = useState('2026-11');
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('bank_transfer');
  const [payReference, setPayReference] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<SalaryProfile | null>(null);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);

  // Profile Edit State
  const [profileBaseSalary, setProfileBaseSalary] = useState(50000);
  const [profileSalaryType, setProfileSalaryType] = useState<'monthly' | 'daily'>('monthly');
  const [profilePayMethod, setProfilePayMethod] = useState<PaymentMethod>('bank_transfer');
  const [profileBonus, setProfileBonus] = useState(0);
  const [profileDeduction, setProfileDeduction] = useState(0);

  // STRICT ACCESS CONTROL CHECK:
  // If user role is NOT authorized, NEVER display or render salary information!
  if (!canViewSalary) {
    return (
      <div className="max-w-xl mx-auto my-12 p-8 rounded-3xl bg-white border border-rose-200 text-center space-y-4 shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-zinc-900 font-display">Restricted Administrative Area</h3>
          <p className="text-xs text-zinc-500">
            Access to confidential Studio Payroll and Employee Salary Profiles is restricted strictly to Studio Owners, Master Admins, and authorized Finance Managers.
          </p>
        </div>
        <div className="p-3 bg-zinc-50 rounded-xl text-zinc-600 text-xs font-mono">
          Current Role: <strong className="text-zinc-900">{currentRole}</strong> (Unauthorized)
        </div>
      </div>
    );
  }

  const latestRun = payrollRuns[0];

  const handleGenerateRun = (e: React.FormEvent) => {
    e.preventDefault();
    generateMonthlyPayrollRun(selectedMonth, `${selectedMonth} Studio Payroll Run`);
    setIsGenerateModalOpen(false);
  };

  const handleOpenPayModal = (entry: any) => {
    setSelectedEntry(entry);
    setPayAmount(entry.netPayable - entry.paidAmount);
    setPayMethod(entry.paymentMethod || 'bank_transfer');
    setPayReference(`UTR-${Date.now().toString().slice(-6)}`);
    setIsPayModalOpen(true);
  };

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEntry) return;

    recordSalaryTransaction({
      employeeId: selectedEntry.employeeId,
      employeeName: selectedEntry.employeeName,
      payrollEntryId: selectedEntry.id,
      amount: Number(payAmount),
      type: 'salary_payment',
      paymentMethod: payMethod,
      transactionReference: payReference,
      paymentDate: new Date().toISOString().split('T')[0],
      recordedBy: currentUser.name,
      notes: `Monthly payroll payment for ${selectedEntry.employeeName}`
    });

    setIsPayModalOpen(false);
    setSelectedEntry(null);
  };

  const handleOpenEditProfile = (p: SalaryProfile) => {
    setSelectedProfile(p);
    setProfileBaseSalary(p.monthlySalary || (p.dailySalary ? p.dailySalary * 30 : 50000));
    setProfileSalaryType(p.salaryType === 'daily' ? 'daily' : 'monthly');
    setProfilePayMethod(p.paymentMethod);
    setProfileBonus((p.bonuses || []).reduce((s, b) => s + b.amount, 0));
    setProfileDeduction((p.deductions || []).reduce((s, d) => s + d.amount, 0));
    setIsEditProfileOpen(true);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfile) return;

    saveSalaryProfile({
      employeeId: selectedProfile.employeeId,
      employeeName: selectedProfile.employeeName,
      salaryType: profileSalaryType,
      monthlySalary: profileSalaryType === 'monthly' ? Number(profileBaseSalary) : 0,
      dailySalary: profileSalaryType === 'daily' ? Math.round(Number(profileBaseSalary) / 30) : 0,
      paymentMethod: profilePayMethod,
      salaryStartDate: selectedProfile.salaryStartDate || '2026-01-01',
      allowances: selectedProfile.allowances || [],
      bonuses: profileBonus > 0 ? [{ id: 'b_1', name: 'Performance Bonus', amount: Number(profileBonus) }] : [],
      deductions: profileDeduction > 0 ? [{ id: 'd_1', name: 'Tax / TDS Deduction', amount: Number(profileDeduction) }] : [],
      advanceSalary: selectedProfile.advanceSalary || 0,
      leaveAdjustments: 0,
      netPayableSalary: 0,
      paymentStatus: 'pending'
    });

    setIsEditProfileOpen(false);
    setSelectedProfile(null);
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 font-display flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-emerald-600" />
              Confidential Payroll & Salary Management
            </h2>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Admin Only
            </span>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Process monthly studio payroll, manage staff compensation packages, record bank transfers and export financial audit logs
          </p>
        </div>

        {canManagePayroll && (
          <Button
            variant="primary"
            size="sm"
            className="bg-zinc-900 text-white self-start sm:self-auto cursor-pointer"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsGenerateModalOpen(true)}
          >
            Generate Monthly Payroll
          </Button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-zinc-200 space-y-1">
          <span className="text-[11px] font-bold text-zinc-400 uppercase">Total Payroll Runs</span>
          <p className="text-xl font-bold font-mono text-zinc-900">{payrollRuns.length}</p>
          <p className="text-[10px] text-zinc-500">Recorded cycles</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-zinc-200 space-y-1">
          <span className="text-[11px] font-bold text-zinc-400 uppercase">Active Crew Profiles</span>
          <p className="text-xl font-bold font-mono text-zinc-900">{salaryProfiles.length}</p>
          <p className="text-[10px] text-zinc-500">Staff under payroll</p>
        </div>

        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-1">
          <span className="text-[11px] font-bold text-emerald-800 uppercase">Latest Net Payable</span>
          <p className="text-xl font-bold font-mono text-emerald-700">
            {latestRun ? formatCurrency(latestRun.totalNetPayable) : '₹0'}
          </p>
          <p className="text-[10px] text-emerald-600">{latestRun?.month || 'No active run'}</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-zinc-200 space-y-1">
          <span className="text-[11px] font-bold text-zinc-400 uppercase">Disbursed Amount</span>
          <p className="text-xl font-bold font-mono text-zinc-900">
            {latestRun ? formatCurrency(latestRun.totalPaidAmount) : '₹0'}
          </p>
          <p className="text-[10px] text-zinc-500">Processed payments</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-200 text-xs font-semibold overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('runs')}
          className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer ${
            activeTab === 'runs'
              ? 'border-zinc-900 text-zinc-900'
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          Monthly Payroll Runs
        </button>

        <button
          onClick={() => setActiveTab('profiles')}
          className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer ${
            activeTab === 'profiles'
              ? 'border-zinc-900 text-zinc-900'
              : 'border-transparent text-zinc-500 hover:text-zinc-800'
          }`}
        >
          Staff Compensation Profiles
        </button>
      </div>

      {/* Tab 1: Monthly Payroll Runs */}
      {activeTab === 'runs' && (
        <div className="space-y-4">
          {payrollRuns.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-zinc-200 space-y-2">
              <CreditCard className="w-8 h-8 text-zinc-400 mx-auto" />
              <p className="text-xs font-bold text-zinc-700">No Payroll Runs Generated Yet</p>
              <p className="text-xs text-zinc-500">Click &ldquo;Generate Monthly Payroll&rdquo; to process this month&apos;s salaries.</p>
            </div>
          ) : (
            payrollRuns.map(run => (
              <div key={run.id} className="p-4 sm:p-5 rounded-2xl bg-white border border-zinc-200 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-zinc-900">{run.title}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        run.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        run.status === 'processed' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {run.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Cycle: {run.month} • {run.totalEmployees} Employees • Processed by {run.processedByName || run.processedBy}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <div>
                      <span className="text-zinc-400">Total Net:</span>{' '}
                      <strong className="text-zinc-900 font-mono">{formatCurrency(run.totalNetPayable)}</strong>
                    </div>
                    <div>
                      <span className="text-zinc-400">Paid:</span>{' '}
                      <strong className="text-emerald-700 font-mono">{formatCurrency(run.totalPaidAmount)}</strong>
                    </div>
                  </div>
                </div>

                {/* Entries Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 uppercase text-[10px]">
                      <tr>
                        <th className="p-2.5">Staff Member</th>
                        <th className="p-2.5">Base Salary</th>
                        <th className="p-2.5">Bonuses</th>
                        <th className="p-2.5">Deductions</th>
                        <th className="p-2.5">Net Payable</th>
                        <th className="p-2.5">Paid Amount</th>
                        <th className="p-2.5">Status</th>
                        <th className="p-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {run.entries.map(entry => (
                        <tr key={entry.id} className="hover:bg-zinc-50/50">
                          <td className="p-2.5">
                            <p className="font-bold text-zinc-900">{entry.employeeName}</p>
                            <p className="text-[10px] text-zinc-400">{entry.department}</p>
                          </td>
                          <td className="p-2.5 font-mono">{formatCurrency(entry.baseSalary)}</td>
                          <td className="p-2.5 font-mono text-emerald-600">+{formatCurrency(entry.bonusAmount)}</td>
                          <td className="p-2.5 font-mono text-rose-600">-{formatCurrency(entry.deductionAmount + entry.advanceDeducted)}</td>
                          <td className="p-2.5 font-mono font-bold text-zinc-900">{formatCurrency(entry.netPayable)}</td>
                          <td className="p-2.5 font-mono text-emerald-700">{formatCurrency(entry.paidAmount)}</td>
                          <td className="p-2.5">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              entry.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-700' :
                              entry.paymentStatus === 'partial' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                            }`}>
                              {entry.paymentStatus.toUpperCase()}
                            </span>
                          </td>
                          <td className="p-2.5 text-right">
                            {entry.paymentStatus !== 'paid' && (
                              <Button
                                variant="outline"
                                size="xs"
                                className="bg-zinc-900 text-white hover:bg-black"
                                onClick={() => handleOpenPayModal(entry)}
                              >
                                Record Payment
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Staff Compensation Profiles */}
      {activeTab === 'profiles' && (
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-zinc-200 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <h3 className="text-sm font-bold text-zinc-900 uppercase tracking-wider text-zinc-400">
              Employee Salary Profiles ({salaryProfiles.length})
            </h3>
            <span className="text-xs text-zinc-500">Configured base pay, allowances and default methods</span>
          </div>

          <div className="divide-y divide-zinc-100">
            {salaryProfiles.map(p => (
              <div key={p.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-sm text-zinc-900">{p.employeeName}</p>
                    <span className="text-[10px] font-semibold text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded">
                      {p.salaryType === 'daily' ? 'Daily Wage' : 'Monthly Salary'}
                    </span>
                  </div>
                  <p className="text-zinc-500 mt-0.5">
                    Base: <strong className="font-mono text-zinc-800">{formatCurrency(p.monthlySalary || (p.dailySalary * 30))}</strong> • Method: <span className="capitalize">{p.paymentMethod.replace('_', ' ')}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="xs"
                    onClick={() => handleOpenEditProfile(p)}
                  >
                    Configure Compensation
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generate Payroll Modal */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 space-y-4 shadow-xl border border-zinc-200">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-zinc-900">Generate Monthly Payroll Run</h3>
              <button onClick={() => setIsGenerateModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleGenerateRun} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Payroll Cycle Month *</label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={e => setSelectedMonth(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs"
                />
              </div>
              <p className="text-zinc-500">
                This will automatically calculate salaries, bonuses, and deductions for all {employees.length} active studio employees.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsGenerateModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" className="bg-zinc-900 text-white">
                  Execute Payroll Run
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {isPayModalOpen && selectedEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 space-y-4 shadow-xl border border-zinc-200">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-zinc-900">Record Salary Payment</h3>
              <button onClick={() => setIsPayModalOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleConfirmPayment} className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200">
                <p className="font-bold text-zinc-900">{selectedEntry.employeeName}</p>
                <p className="text-zinc-500">Total Net Payable: {formatCurrency(selectedEntry.netPayable)}</p>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Payment Amount (₹) *</label>
                <input
                  type="number"
                  value={payAmount}
                  onChange={e => setPayAmount(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Payment Method</label>
                <select
                  value={payMethod}
                  onChange={e => setPayMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs bg-white"
                >
                  <option value="bank_transfer">Bank Transfer (NEFT/RTGS/IMPS)</option>
                  <option value="upi">UPI / QR Payment</option>
                  <option value="cash">Cash Disbursement</option>
                  <option value="cheque">Bank Cheque</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Bank Transaction Reference / UTR</label>
                <input
                  type="text"
                  value={payReference}
                  onChange={e => setPayReference(e.target.value)}
                  placeholder="e.g. UTR-293847291"
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsPayModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" className="bg-emerald-600 text-white hover:bg-emerald-700">
                  Confirm Payment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Compensation Profile Modal */}
      {isEditProfileOpen && selectedProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 space-y-4 shadow-xl border border-zinc-200">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-zinc-900">Configure Staff Compensation</h3>
              <button onClick={() => setIsEditProfileOpen(false)} className="text-zinc-400 hover:text-zinc-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveProfile} className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-200">
                <p className="font-bold text-zinc-900">{selectedProfile.employeeName}</p>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Base Monthly Salary (₹) *</label>
                <input
                  type="number"
                  value={profileBaseSalary}
                  onChange={e => setProfileBaseSalary(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Bonus Allowance (₹)</label>
                  <input
                    type="number"
                    value={profileBonus}
                    onChange={e => setProfileBonus(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-xl border border-zinc-300 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">TDS / Deductions (₹)</label>
                  <input
                    type="number"
                    value={profileDeduction}
                    onChange={e => setProfileDeduction(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded-xl border border-zinc-300 text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Payment Method</label>
                <select
                  value={profilePayMethod}
                  onChange={e => setProfilePayMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 rounded-xl border border-zinc-300 text-xs bg-white"
                >
                  <option value="bank_transfer">Bank Transfer (NEFT/IMPS)</option>
                  <option value="upi">UPI</option>
                  <option value="cash">Cash</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsEditProfileOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" className="bg-zinc-900 text-white">
                  Save Compensation
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
