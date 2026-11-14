import { 
  PayrollRun, 
  PayrollRunSchema, 
  PayrollEntry, 
  PayrollEntrySchema,
  SalaryTransaction, 
  SalaryTransactionSchema,
  Role
} from '../types/schema';
import { TenantStore } from './tenantStore';
import { auditService } from './auditService';
import { salaryService } from './salaryService';
import { employeeService } from './employeeService';

export class PayrollService {
  private assertAuthorizedRole(role?: Role | null): void {
    if (!role) {
      throw new Error('[Security Exception]: Access Denied. No authorization role provided.');
    }
    const isOwnerOrSuper = role.name === 'Studio Owner' || role.name === 'Super Admin' || role.name === 'Accountant';
    const hasPayrollPermission = role.permissions?.payroll?.view === true || role.permissions?.payroll?.manage === true;
    if (!isOwnerOrSuper && !hasPayrollPermission) {
      throw new Error(`[Security Exception]: Access Denied. Role "${role.name}" is forbidden from viewing or executing studio payroll.`);
    }
  }

  listPayrollRuns(studioId: string, currentRole?: Role | null): PayrollRun[] {
    if (!studioId) throw new Error('[payrollService]: studioId is required');
    this.assertAuthorizedRole(currentRole);
    return TenantStore.get<PayrollRun>(studioId, 'payrollRuns');
  }

  getPayrollRun(studioId: string, runId: string, currentRole?: Role | null): PayrollRun | null {
    const all = this.listPayrollRuns(studioId, currentRole);
    return all.find(r => r.id === runId) || null;
  }

  generatePayrollRun(
    studioId: string,
    params: { month?: number | string; year?: number | string; createdBy?: string }
  ): PayrollRun & { totalNetSalary: number } {
    const y = params.year || new Date().getFullYear();
    const m = String(params.month || (new Date().getMonth() + 1)).padStart(2, '0');
    const monthStr = `${y}-${m}`;
    const ownerRole = { id: 'role_owner', name: 'Studio Owner', permissions: [] };
    const run = this.generateMonthlyPayrollRun(studioId, monthStr, `${monthStr} Studio Payroll Run`, ownerRole as any);
    return {
      ...run,
      totalNetSalary: run.totalNetPayable
    };
  }

  generateMonthlyPayrollRun(
    studioId: string,
    month: string, // YYYY-MM
    title: string,
    currentRole?: Role | null,
    processedBy: string = 'admin'
  ): PayrollRun {
    if (!studioId) throw new Error('[payrollService]: studioId is required');
    this.assertAuthorizedRole(currentRole);

    const employees = employeeService.listEmployees(studioId).filter(e => e.employmentStatus === 'active');
    const salaryProfiles = salaryService.listSalaryProfiles(studioId, currentRole);

    const runId = `run_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    let totalGross = 0;
    let totalDeductions = 0;
    let totalBonuses = 0;
    let totalNet = 0;

    const entries: PayrollEntry[] = employees.map(emp => {
      const profile = salaryProfiles.find(s => s.employeeId === emp.id);
      const salaryType = profile ? profile.salaryType : 'monthly';
      const baseSalary = profile 
        ? (salaryType === 'daily' ? profile.dailySalary * 30 : profile.monthlySalary)
        : 25000;

      const bonusAmount = profile ? (profile.bonuses || []).reduce((s, b) => s + b.amount, 0) : 0;
      const deductionAmount = profile ? (profile.deductions || []).reduce((s, d) => s + d.amount, 0) : 0;
      const advanceDeducted = profile ? (profile.advanceSalary || 0) : 0;

      const netPayable = Math.max(0, baseSalary + bonusAmount - deductionAmount - advanceDeducted);

      totalGross += baseSalary;
      totalBonuses += bonusAmount;
      totalDeductions += deductionAmount + advanceDeducted;
      totalNet += netPayable;

      const entry: PayrollEntry = {
        id: `pentry_${emp.id}_${Date.now()}`,
        studioId,
        payrollRunId: runId,
        employeeId: emp.id,
        employeeName: emp.fullName,
        department: emp.department,
        salaryType,
        baseSalary,
        workingDays: 30,
        presentDays: 30,
        paidLeaves: 0,
        unpaidLeaves: 0,
        leaveDeduction: 0,
        bonusAmount,
        deductionAmount,
        advanceDeducted,
        netPayable,
        paidAmount: 0,
        paymentStatus: 'pending',
        paymentMethod: profile ? profile.paymentMethod : 'bank_transfer'
      };

      PayrollEntrySchema.parse(entry);
      return entry;
    });

    const newRun: PayrollRun = {
      id: runId,
      studioId,
      month,
      title: title || `${month} Studio Payroll Run`,
      totalEmployees: entries.length,
      totalGrossPayable: totalGross,
      totalDeductions,
      totalBonuses,
      totalNetPayable: totalNet,
      totalPaidAmount: 0,
      status: 'draft',
      entries,
      processedBy,
      processedByName: currentRole?.name || 'Studio Admin',
      createdAt: new Date().toISOString()
    };

    PayrollRunSchema.parse(newRun);
    const existingRuns = TenantStore.get<PayrollRun>(studioId, 'payrollRuns');
    TenantStore.set(studioId, 'payrollRuns', [newRun, ...existingRuns]);

    auditService.log(
      studioId,
      processedBy,
      'GENERATE_PAYROLL_RUN',
      'payroll',
      newRun.id,
      { month, totalNetPayable: totalNet, totalEmployees: entries.length }
    );

    return newRun;
  }

  recordPaymentTransaction(
    studioId: string,
    data: Omit<SalaryTransaction, 'id' | 'studioId' | 'createdAt'>,
    currentRole?: Role | null
  ): SalaryTransaction {
    if (!studioId) throw new Error('[payrollService]: studioId is required');
    this.assertAuthorizedRole(currentRole);

    const transaction: SalaryTransaction = {
      ...data,
      id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      studioId,
      createdAt: new Date().toISOString()
    };

    SalaryTransactionSchema.parse(transaction);
    const existing = TenantStore.get<SalaryTransaction>(studioId, 'salaryTransactions');
    TenantStore.set(studioId, 'salaryTransactions', [transaction, ...existing]);

    // Update payroll entry if linked
    if (data.payrollEntryId) {
      const runs = this.listPayrollRuns(studioId, currentRole);
      let updatedRuns = false;
      for (const run of runs) {
        const entry = run.entries.find(e => e.id === data.payrollEntryId);
        if (entry) {
          entry.paidAmount += data.amount;
          if (entry.paidAmount >= entry.netPayable) {
            entry.paymentStatus = 'paid';
          } else {
            entry.paymentStatus = 'partial';
          }
          entry.paymentDate = data.paymentDate;
          entry.transactionReference = data.transactionReference;
          run.totalPaidAmount += data.amount;
          if (run.totalPaidAmount >= run.totalNetPayable) {
            run.status = 'paid';
          } else if (run.totalPaidAmount > 0) {
            run.status = 'processed';
          }
          updatedRuns = true;
          break;
        }
      }
      if (updatedRuns) {
        TenantStore.set(studioId, 'payrollRuns', runs);
      }
    }

    auditService.log(
      studioId,
      data.recordedBy,
      'RECORD_SALARY_TRANSACTION',
      'salaryTransaction',
      transaction.id,
      { employeeName: data.employeeName, amount: data.amount, type: data.type }
    );

    return transaction;
  }

  listTransactions(studioId: string, currentRole?: Role | null): SalaryTransaction[] {
    this.assertAuthorizedRole(currentRole);
    return TenantStore.get<SalaryTransaction>(studioId, 'salaryTransactions');
  }
}

export const payrollService = new PayrollService();
