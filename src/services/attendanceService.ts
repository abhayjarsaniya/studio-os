import { AttendanceRecord, AttendanceRecordSchema, AttendanceStatus } from '../types/schema';
import { TenantStore } from './tenantStore';

export class AttendanceService {
  listAttendance(studioId: string, date?: string): AttendanceRecord[] {
    if (!studioId) throw new Error('[attendanceService.listAttendance]: studioId is required');
    const all = TenantStore.get<AttendanceRecord>(studioId, 'attendance');
    if (date) {
      return all.filter(a => a.date === date);
    }
    return all.sort((a, b) => b.date.localeCompare(a.date));
  }

  getEmployeeAttendance(studioId: string, employeeId: string): AttendanceRecord[] {
    const all = this.listAttendance(studioId);
    return all.filter(a => a.employeeId === employeeId);
  }

  markAttendance(
    studioId: string,
    data: Omit<AttendanceRecord, 'id' | 'studioId'>
  ): AttendanceRecord {
    if (!studioId) throw new Error('[attendanceService.markAttendance]: studioId is required');
    const all = this.listAttendance(studioId);
    const existingIndex = all.findIndex(a => a.employeeId === data.employeeId && a.date === data.date);

    if (existingIndex !== -1) {
      const updated: AttendanceRecord = {
        ...all[existingIndex],
        ...data
      };
      AttendanceRecordSchema.parse(updated);
      all[existingIndex] = updated;
      TenantStore.set(studioId, 'attendance', all);
      return updated;
    }

    const newRecord: AttendanceRecord = {
      ...data,
      id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      studioId
    };

    AttendanceRecordSchema.parse(newRecord);
    TenantStore.set(studioId, 'attendance', [newRecord, ...all]);
    return newRecord;
  }
}

export const attendanceService = new AttendanceService();
