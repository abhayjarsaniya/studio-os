import { db } from '../lib/firebase';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  Unsubscribe
} from 'firebase/firestore';

export type PayrollStatus = 'pending' | 'processing' | 'paid';

export interface PayrollCorrectionEntry {
  timestamp: string;
  actingUser: string;
  previousNetPayable: number;
  newNetPayable: number;
  reason: string;
}

export interface LivePayrollRecord {
  id: string; // Deterministic: pay_{employeeId}_{month}
  studioId: string;
  studioName: string;
  employeeId: string;
  employeeName: string;
  role: string;
  month: string; // YYYY-MM
  baseSalary: number;
  bonus: number;
  incentives: number;
  deductions: number;
  netPayable: number;
  status: PayrollStatus;
  paymentMethod: string;
  paymentReference: string;
  paymentDate: string;
  notes?: string;
  correctionHistory?: PayrollCorrectionEntry[];
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export interface LiveEmployeeOption {
  id: string;
  studioId: string;
  fullName: string;
  role: string;
  monthlySalary: number;
  status: string;
}

export function calculateNetPayable(params: {
  baseSalary: number;
  bonus: number;
  incentives: number;
  deductions: number;
}): number {
  const base = Math.max(0, Number(params.baseSalary) || 0);
  const bonus = Math.max(0, Number(params.bonus) || 0);
  const incentives = Math.max(0, Number(params.incentives) || 0);
  const deductions = Math.max(0, Number(params.deductions) || 0);
  return Math.max(0, Math.round((base + bonus + incentives - deductions) * 100) / 100);
}

export function buildDeterministicPayrollId(employeeId: string, month: string): string {
  const cleanEmp = String(employeeId || '').replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanMonth = String(month || '').replace(/[^0-9-]/g, '');
  return `pay_${cleanEmp}_${cleanMonth}`;
}

async function logPayrollAudit(params: {
  actingUser: string;
  role: string;
  studioId: string;
  recordId: string;
  operation: string;
  previousValues?: any;
  newValues?: any;
}) {
  if (!db) return;
  const logId = `paylog_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  await setDoc(doc(db, 'platformAuditLogs', logId), {
    ...params,
    module: 'payroll',
    timestamp: new Date().toISOString()
  }).catch(() => {});
}

class LivePayrollService {
  subscribeStudioPayroll(
    studioId: string,
    onData: (records: LivePayrollRecord[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    if (!db || !studioId) {
      onData([]);
      return () => {};
    }

    return onSnapshot(
      collection(db, 'studios', studioId, 'payrollRecords'),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<LivePayrollRecord, 'id'>) }))
          .sort((a, b) => (b.month || '').localeCompare(a.month || '') || (b.updatedAt || '').localeCompare(a.updatedAt || ''));
        onData(list);
      },
      (err) => {
        console.error('[LivePayrollService] studio payroll snapshot error:', err);
        onError?.(err);
      }
    );
  }

  subscribeAllStudiosPayroll(
    onData: (
      records: LivePayrollRecord[],
      studios: Array<{ id: string; name: string }>,
      employeesByStudio: Record<string, LiveEmployeeOption[]>
    ) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    if (!db) {
      onData([], [], {});
      return () => {};
    }

    const subUnsubs = new Map<string, () => void>();
    const recordsByStudio = new Map<string, LivePayrollRecord[]>();
    const employeesMap: Record<string, LiveEmployeeOption[]> = {};
    let studioList: Array<{ id: string; name: string }> = [];

    const emit = () => {
      const merged: LivePayrollRecord[] = [];
      recordsByStudio.forEach((arr) => merged.push(...arr));
      merged.sort((a, b) => (b.month || '').localeCompare(a.month || '') || (b.updatedAt || '').localeCompare(a.updatedAt || ''));
      onData(merged, studioList, { ...employeesMap });
    };

    const unsubStudios = onSnapshot(
      collection(db, 'studios'),
      (snap) => {
        const activeIds = new Set<string>();
        studioList = snap.docs
          .map((d) => ({ id: d.id, name: d.data()?.name || d.id }))
          .sort((a, b) => a.name.localeCompare(b.name));

        studioList.forEach((st) => {
          activeIds.add(st.id);
          if (!subUnsubs.has(st.id)) {
            const uPay = onSnapshot(
              collection(db, 'studios', st.id, 'payrollRecords'),
              (pSnap) => {
                recordsByStudio.set(
                  st.id,
                  pSnap.docs.map((pd) => ({
                    id: pd.id,
                    ...(pd.data() as Omit<LivePayrollRecord, 'id'>),
                    studioId: st.id,
                    studioName: pd.data()?.studioName || st.name
                  }))
                );
                emit();
              },
              (err) => console.warn(`[LivePayrollService] studio ${st.id} payroll error:`, err.message)
            );

            const uEmp = onSnapshot(
              collection(db, 'studios', st.id, 'employees'),
              (eSnap) => {
                employeesMap[st.id] = eSnap.docs.map((ed) => {
                  const e = ed.data() || {};
                  return {
                    id: ed.id,
                    studioId: st.id,
                    fullName: e.fullName || e.name || 'Staff Member',
                    role: e.designation || e.roleName || e.roleId || 'Team Member',
                    monthlySalary: Number(e.monthlySalary) || 0,
                    status: e.employmentStatus || 'active'
                  };
                });
                emit();
              },
              (err) => console.warn(`[LivePayrollService] studio ${st.id} employees error:`, err.message)
            );

            subUnsubs.set(st.id, () => {
              uPay();
              uEmp();
            });
          }
        });

        // Clean up removed studios
        Array.from(subUnsubs.keys()).forEach((sid) => {
          if (!activeIds.has(sid)) {
            subUnsubs.get(sid)?.();
            subUnsubs.delete(sid);
            recordsByStudio.delete(sid);
            delete employeesMap[sid];
          }
        });

        emit();
      },
      (err) => {
        console.error('[LivePayrollService] studios snapshot error:', err);
        onError?.(err);
      }
    );

    return () => {
      unsubStudios();
      subUnsubs.forEach((fn) => fn());
      subUnsubs.clear();
    };
  }

  async createPayrollRecord(params: {
    studioId: string;
    studioName: string;
    employeeId: string;
    employeeName: string;
    role: string;
    month: string;
    baseSalary: number;
    bonus?: number;
    incentives?: number;
    deductions?: number;
    status?: PayrollStatus;
    paymentMethod?: string;
    paymentReference?: string;
    paymentDate?: string;
    notes?: string;
    actingUser: string;
    actingRole: string;
  }): Promise<LivePayrollRecord> {
    if (!db) throw new Error('Firestore is not initialized.');
    if (!params.studioId || !params.employeeId || !params.month) {
      throw new Error('Studio, Employee, and Payroll Month are required.');
    }

    const recordId = buildDeterministicPayrollId(params.employeeId, params.month);
    const ref = doc(db, 'studios', params.studioId, 'payrollRecords', recordId);
    const existingSnap = await getDoc(ref);
    if (existingSnap.exists()) {
      throw new Error(
        `A payroll entry for ${params.employeeName} (${params.month}) already exists. Edit the existing entry instead.`
      );
    }

    const now = new Date().toISOString();
    const baseSalary = Math.max(0, Number(params.baseSalary) || 0);
    const bonus = Math.max(0, Number(params.bonus) || 0);
    const incentives = Math.max(0, Number(params.incentives) || 0);
    const deductions = Math.max(0, Number(params.deductions) || 0);
    const netPayable = calculateNetPayable({ baseSalary, bonus, incentives, deductions });
    const status: PayrollStatus = params.status || 'pending';

    const record: LivePayrollRecord = {
      id: recordId,
      studioId: params.studioId,
      studioName: params.studioName,
      employeeId: params.employeeId,
      employeeName: params.employeeName,
      role: params.role || 'Team Member',
      month: params.month,
      baseSalary,
      bonus,
      incentives,
      deductions,
      netPayable,
      status,
      paymentMethod: params.paymentMethod || 'Bank Transfer (NEFT)',
      paymentReference: params.paymentReference || '',
      paymentDate: status === 'paid' ? (params.paymentDate || now.split('T')[0]) : (params.paymentDate || ''),
      notes: params.notes || '',
      correctionHistory: [],
      createdAt: now,
      updatedAt: now,
      updatedBy: params.actingUser
    };

    await setDoc(ref, record);
    await logPayrollAudit({
      actingUser: params.actingUser,
      role: params.actingRole,
      studioId: params.studioId,
      recordId,
      operation: 'CREATE_PAYROLL',
      newValues: { employeeName: record.employeeName, month: record.month, netPayable, status }
    });

    return record;
  }

  async updatePayrollRecord(params: {
    studioId: string;
    recordId: string;
    updates: Partial<
      Pick<
        LivePayrollRecord,
        | 'baseSalary'
        | 'bonus'
        | 'incentives'
        | 'deductions'
        | 'status'
        | 'paymentMethod'
        | 'paymentReference'
        | 'paymentDate'
        | 'notes'
      >
    >;
    correctionReason?: string;
    actingUser: string;
    actingRole: string;
  }): Promise<LivePayrollRecord> {
    if (!db) throw new Error('Firestore is not initialized.');
    const ref = doc(db, 'studios', params.studioId, 'payrollRecords', params.recordId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Payroll record not found.');

    const existing = snap.data() as LivePayrollRecord;
    const baseSalary = params.updates.baseSalary !== undefined ? Math.max(0, Number(params.updates.baseSalary) || 0) : existing.baseSalary;
    const bonus = params.updates.bonus !== undefined ? Math.max(0, Number(params.updates.bonus) || 0) : existing.bonus;
    const incentives = params.updates.incentives !== undefined ? Math.max(0, Number(params.updates.incentives) || 0) : (existing.incentives || 0);
    const deductions = params.updates.deductions !== undefined ? Math.max(0, Number(params.updates.deductions) || 0) : existing.deductions;
    const netPayable = calculateNetPayable({ baseSalary, bonus, incentives, deductions });

    const now = new Date().toISOString();
    const correctionHistory = [...(existing.correctionHistory || [])];
    if (existing.status === 'paid' && netPayable !== existing.netPayable) {
      correctionHistory.push({
        timestamp: now,
        actingUser: params.actingUser,
        previousNetPayable: existing.netPayable,
        newNetPayable: netPayable,
        reason: params.correctionReason || 'Audited payroll correction after payment'
      });
    }

    const nextStatus = params.updates.status || existing.status;
    const nextPaymentDate =
      params.updates.paymentDate !== undefined
        ? params.updates.paymentDate
        : nextStatus === 'paid' && !existing.paymentDate
          ? now.split('T')[0]
          : existing.paymentDate;

    const merged: LivePayrollRecord = {
      ...existing,
      baseSalary,
      bonus,
      incentives,
      deductions,
      netPayable,
      status: nextStatus,
      paymentMethod: params.updates.paymentMethod ?? existing.paymentMethod,
      paymentReference: params.updates.paymentReference ?? existing.paymentReference,
      paymentDate: nextPaymentDate,
      notes: params.updates.notes ?? existing.notes,
      correctionHistory,
      updatedAt: now,
      updatedBy: params.actingUser
    };

    await setDoc(ref, merged, { merge: true });
    await logPayrollAudit({
      actingUser: params.actingUser,
      role: params.actingRole,
      studioId: params.studioId,
      recordId: params.recordId,
      operation: existing.status === 'paid' ? 'AUDITED_PAYROLL_CORRECTION' : 'UPDATE_PAYROLL',
      previousValues: {
        baseSalary: existing.baseSalary,
        bonus: existing.bonus,
        incentives: existing.incentives || 0,
        deductions: existing.deductions,
        netPayable: existing.netPayable,
        status: existing.status
      },
      newValues: {
        baseSalary,
        bonus,
        incentives,
        deductions,
        netPayable,
        status: nextStatus
      }
    });

    return merged;
  }

  async deletePayrollRecord(params: {
    studioId: string;
    recordId: string;
    actingUser: string;
    actingRole: string;
    allowPaidDelete?: boolean;
  }): Promise<void> {
    if (!db) throw new Error('Firestore is not initialized.');
    const ref = doc(db, 'studios', params.studioId, 'payrollRecords', params.recordId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;

    const existing = snap.data() as LivePayrollRecord;
    if (existing.status === 'paid' && !params.allowPaidDelete) {
      throw new Error('Paid payroll records preserve payment history and cannot be deleted directly by Studio Owners.');
    }

    await deleteDoc(ref);
    await logPayrollAudit({
      actingUser: params.actingUser,
      role: params.actingRole,
      studioId: params.studioId,
      recordId: params.recordId,
      operation: 'DELETE_PAYROLL',
      previousValues: { employeeName: existing.employeeName, month: existing.month, netPayable: existing.netPayable, status: existing.status }
    });
  }

  async listStudioEmployees(studioId: string): Promise<LiveEmployeeOption[]> {
    if (!db || !studioId) return [];
    const snap = await getDocs(collection(db, 'studios', studioId, 'employees'));
    return snap.docs.map((d) => {
      const e = d.data() || {};
      return {
        id: d.id,
        studioId,
        fullName: e.fullName || e.name || 'Staff Member',
        role: e.designation || e.roleName || e.roleId || 'Team Member',
        monthlySalary: Number(e.monthlySalary) || 0,
        status: e.employmentStatus || 'active'
      };
    });
  }
}

export const livePayrollService = new LivePayrollService();
