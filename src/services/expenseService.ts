import { Expense, ExpenseSchema, ExpenseApprovalStatus } from '../types/schema';
import { TenantStore } from './tenantStore';
import { financialSettingsService } from './financialSettingsService';
import { auditService } from './auditService';

export const DEFAULT_20_EXPENSE_CATEGORIES = [
  'Camera Equipment',
  'Lens & Accessories',
  'Lighting Equipment',
  'Travel',
  'Accommodation',
  'Food',
  'Fuel',
  'Printing',
  'Album Production',
  'Editing Software',
  'Cloud Storage',
  'Marketing',
  'Office Rent',
  'Electricity',
  'Internet',
  'Employee Salary',
  'Freelancers',
  'Maintenance',
  'Packaging',
  'Miscellaneous'
] as const;

export interface ExpenseFilterOptions {
  category?: string;
  approvalStatus?: ExpenseApprovalStatus;
  eventId?: string;
  branchId?: string;
  relatedEmployeeId?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
}

export class ExpenseService {
  getCategories(): string[] {
    return [...DEFAULT_20_EXPENSE_CATEGORIES];
  }

  listExpenses(studioId: string, filter?: ExpenseFilterOptions): Expense[] {
    if (!studioId) throw new Error('[expenseService.listExpenses]: studioId is required');
    let expenses = TenantStore.get<Expense>(studioId, 'expenses');

    if (filter) {
      if (filter.category) {
        expenses = expenses.filter(e => e.category === filter.category);
      }
      if (filter.approvalStatus) {
        expenses = expenses.filter(e => e.approvalStatus === filter.approvalStatus);
      }
      if (filter.eventId) {
        expenses = expenses.filter(e => e.eventId === filter.eventId);
      }
      if (filter.branchId) {
        expenses = expenses.filter(e => e.branchId === filter.branchId);
      }
      if (filter.relatedEmployeeId) {
        expenses = expenses.filter(e => e.relatedEmployeeId === filter.relatedEmployeeId);
      }
      if (filter.startDate) {
        expenses = expenses.filter(e => e.expenseDate >= filter.startDate!);
      }
      if (filter.endDate) {
        expenses = expenses.filter(e => e.expenseDate <= filter.endDate!);
      }
      if (filter.minAmount !== undefined) {
        expenses = expenses.filter(e => e.amount >= filter.minAmount!);
      }
      if (filter.maxAmount !== undefined) {
        expenses = expenses.filter(e => e.amount <= filter.maxAmount!);
      }
    }

    return expenses.sort((a, b) => new Date(b.expenseDate || b.createdAt).getTime() - new Date(a.expenseDate || a.createdAt).getTime());
  }

  getExpense(studioId: string, expenseId: string): Expense | null {
    if (!studioId || !expenseId) return null;
    const expenses = this.listExpenses(studioId);
    return expenses.find(e => e.id === expenseId) || null;
  }

  createExpense(
    studioId: string,
    data: {
      title: string;
      category: string;
      amount: number;
      expenseDate?: string;
      date?: string;
      description?: string;
      vendor?: string;
      tax?: number;
      paymentMethod?: any;
      referenceNumber?: string;
      receiptUrl?: string;
      eventId?: string;
      eventName?: string;
      branchId?: string;
      branchName?: string;
      relatedEmployeeId?: string;
      relatedEmployeeName?: string;
      createdById?: string;
      createdByName?: string;
      approvalStatus?: ExpenseApprovalStatus;
    }
  ): Expense {
    if (!studioId) throw new Error('[expenseService.createExpense]: studioId is required');
    if (!data.title?.trim()) throw new Error('[expenseService.createExpense]: title is required');
    if (!data.amount || data.amount <= 0) throw new Error('[expenseService.createExpense]: amount must be positive');
    if (!data.category) throw new Error('[expenseService.createExpense]: category is required');

    const expenseNumber = financialSettingsService.generateDocumentNumber(studioId, 'EXP');
    const expenseDate = data.expenseDate || data.date || new Date().toISOString().split('T')[0];
    const initialApprovalStatus: ExpenseApprovalStatus = data.approvalStatus || 'Pending Approval';

    const newExpense: Expense = {
      id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      studioId,
      expenseNumber,
      title: data.title.trim(),
      category: data.category,
      amount: Math.round(data.amount * 100) / 100,
      tax: data.tax || 0,
      description: data.description || '',
      vendor: data.vendor || '',
      expenseDate,
      paymentMethod: data.paymentMethod || 'Cash',
      referenceNumber: data.referenceNumber || '',
      receiptUrl: data.receiptUrl || '',
      eventId: data.eventId,
      eventName: data.eventName,
      branchId: data.branchId,
      branchName: data.branchName,
      relatedEmployeeId: data.relatedEmployeeId,
      relatedEmployeeName: data.relatedEmployeeName,
      createdById: data.createdById || 'system',
      createdByName: data.createdByName || 'Staff Member',
      approvalStatus: initialApprovalStatus,
      status: initialApprovalStatus.toLowerCase().replace(/\s+/g, '_'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // If auto-approved (e.g. by Studio Owner directly creating it)
    if (initialApprovalStatus === 'Approved') {
      newExpense.approvedById = data.createdById || 'system';
      newExpense.approvedByName = data.createdByName || 'Studio Owner';
      newExpense.approvedAt = new Date().toISOString();
    }

    ExpenseSchema.parse(newExpense);

    const expenses = TenantStore.get<Expense>(studioId, 'expenses');
    TenantStore.set(studioId, 'expenses', [newExpense, ...expenses]);

    auditService.log({
      studioId,
      entityType: 'expense',
      entityId: newExpense.id,
      action: 'EXPENSE_CREATED',
      details: {
        expenseNumber: newExpense.expenseNumber,
        title: newExpense.title,
        amount: newExpense.amount,
        category: newExpense.category,
        approvalStatus: newExpense.approvalStatus
      },
      operatorId: data.createdById || 'system',
      operatorName: data.createdByName || 'Staff'
    });

    return newExpense;
  }

  approveExpense(
    studioId: string,
    expenseId: string,
    approver: {
      userId: string;
      userName: string;
      roleTitle: string;
    }
  ): Expense {
    if (!studioId) throw new Error('[expenseService.approveExpense]: studioId is required');
    const expense = this.getExpense(studioId, expenseId);
    if (!expense) throw new Error(`[expenseService.approveExpense]: Expense ${expenseId} not found`);

    if (expense.approvalStatus === 'Approved' || expense.approvalStatus === 'Paid') {
      return expense;
    }

    // Conflict of interest check: An employee cannot approve their own expense
    // UNLESS they are a Studio Owner or Super Admin or Manager.
    const isOwnerOrManager = ['Studio Owner', 'Super Admin', 'Admin', 'Manager', 'owner', 'manager', 'admin'].includes(approver.roleTitle);
    if (expense.createdById === approver.userId && !isOwnerOrManager) {
      throw new Error('[expenseService.approveExpense]: Conflict of interest: Employees cannot approve their own submitted expenses');
    }

    const updatedExpense: Expense = {
      ...expense,
      approvalStatus: 'Approved',
      status: 'approved',
      approvedById: approver.userId,
      approvedByName: approver.userName,
      approvedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const expenses = TenantStore.get<Expense>(studioId, 'expenses');
    const updated = expenses.map(e => e.id === expense.id ? updatedExpense : e);
    TenantStore.set(studioId, 'expenses', updated);

    auditService.log({
      studioId,
      entityType: 'expense',
      entityId: expense.id,
      action: 'EXPENSE_APPROVED',
      details: {
        expenseNumber: expense.expenseNumber,
        amount: expense.amount,
        approvedBy: approver.userName
      },
      operatorId: approver.userId,
      operatorName: approver.userName
    });

    return updatedExpense;
  }

  rejectExpense(
    studioId: string,
    expenseId: string,
    rejecter: {
      userId: string;
      userName: string;
      reason: string;
    }
  ): Expense {
    if (!studioId) throw new Error('[expenseService.rejectExpense]: studioId is required');
    if (!rejecter.reason?.trim()) throw new Error('[expenseService.rejectExpense]: Rejection reason is required');

    const expense = this.getExpense(studioId, expenseId);
    if (!expense) throw new Error(`[expenseService.rejectExpense]: Expense ${expenseId} not found`);

    const updatedExpense: Expense = {
      ...expense,
      approvalStatus: 'Rejected',
      status: 'rejected',
      rejectionReason: rejecter.reason.trim(),
      updatedAt: new Date().toISOString()
    };

    const expenses = TenantStore.get<Expense>(studioId, 'expenses');
    const updated = expenses.map(e => e.id === expense.id ? updatedExpense : e);
    TenantStore.set(studioId, 'expenses', updated);

    auditService.log({
      studioId,
      entityType: 'expense',
      entityId: expense.id,
      action: 'EXPENSE_REJECTED',
      details: {
        expenseNumber: expense.expenseNumber,
        reason: rejecter.reason
      },
      operatorId: rejecter.userId,
      operatorName: rejecter.userName
    });

    return updatedExpense;
  }

  markExpensePaid(
    studioId: string,
    expenseId: string,
    data: {
      paymentDate?: string;
      paidById: string;
      paidByName: string;
      paymentMethod?: any;
      referenceNumber?: string;
    }
  ): Expense {
    if (!studioId) throw new Error('[expenseService.markExpensePaid]: studioId is required');
    const expense = this.getExpense(studioId, expenseId);
    if (!expense) throw new Error(`[expenseService.markExpensePaid]: Expense ${expenseId} not found`);

    if (expense.approvalStatus !== 'Approved') {
      throw new Error(`[expenseService.markExpensePaid]: Expense must be approved before recording payment (current: ${expense.approvalStatus})`);
    }

    const updatedExpense: Expense = {
      ...expense,
      approvalStatus: 'Paid',
      status: 'reimbursed',
      paymentDate: data.paymentDate || new Date().toISOString().split('T')[0],
      paidById: data.paidById,
      paidByName: data.paidByName,
      paidAt: new Date().toISOString(),
      paymentMethod: data.paymentMethod || expense.paymentMethod,
      referenceNumber: data.referenceNumber || expense.referenceNumber,
      updatedAt: new Date().toISOString()
    };

    const expenses = TenantStore.get<Expense>(studioId, 'expenses');
    const updated = expenses.map(e => e.id === expense.id ? updatedExpense : e);
    TenantStore.set(studioId, 'expenses', updated);

    auditService.log({
      studioId,
      entityType: 'expense',
      entityId: expense.id,
      action: 'EXPENSE_PAID',
      details: {
        expenseNumber: expense.expenseNumber,
        amount: expense.amount,
        paidBy: data.paidByName
      },
      operatorId: data.paidById,
      operatorName: data.paidByName
    });

    return updatedExpense;
  }

  recordSalaryAsExpense(
    studioId: string,
    payrollRecord: {
      employeeId: string;
      employeeName: string;
      amount: number;
      monthYear: string;
      operatorId: string;
      operatorName: string;
    }
  ): Expense {
    return this.createExpense(studioId, {
      title: `Salary Payment - ${payrollRecord.employeeName} (${payrollRecord.monthYear})`,
      category: 'Employee Salary',
      amount: payrollRecord.amount,
      expenseDate: new Date().toISOString().split('T')[0],
      description: `Payroll disbursement for month: ${payrollRecord.monthYear}`,
      vendor: payrollRecord.employeeName,
      relatedEmployeeId: payrollRecord.employeeId,
      relatedEmployeeName: payrollRecord.employeeName,
      createdById: payrollRecord.operatorId,
      createdByName: payrollRecord.operatorName,
      approvalStatus: 'Approved' // auto-approved on payroll disbursement
    });
  }
}

export const expenseService = new ExpenseService();
