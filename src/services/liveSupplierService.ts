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
import { SupplierCategory } from '../types/schema';

export interface LiveSupplierRecord {
  id: string;
  studioId: string;
  studioName: string;
  businessName: string;
  category: SupplierCategory;
  contactPerson: string;
  phone: string;
  email: string;
  city: string;
  address: string;
  services: string;
  baseDayRate: number;
  isActive: boolean;
  isArchived?: boolean;
  notes: string;
  rating: number;
  createdAt: string;
  updatedAt: string;
  updatedBy: string;
}

export function normalizePhone(phone: string): string {
  return String(phone || '').replace(/\D/g, '').slice(-10);
}

async function logSupplierAudit(params: {
  actingUser: string;
  role: string;
  studioId: string;
  recordId: string;
  operation: string;
  previousValues?: any;
  newValues?: any;
}) {
  if (!db) return;
  const logId = `supplog_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  await setDoc(doc(db, 'platformAuditLogs', logId), {
    ...params,
    module: 'suppliers',
    timestamp: new Date().toISOString()
  }).catch(() => {});
}

class LiveSupplierService {
  subscribeStudioSuppliers(
    studioId: string,
    onData: (suppliers: LiveSupplierRecord[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    if (!db || !studioId) {
      onData([]);
      return () => {};
    }

    return onSnapshot(
      collection(db, 'studios', studioId, 'suppliers'),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Omit<LiveSupplierRecord, 'id'>) }))
          .filter((s) => !s.isArchived)
          .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        onData(list);
      },
      (err) => {
        console.error('[LiveSupplierService] studio suppliers snapshot error:', err);
        onError?.(err);
      }
    );
  }

  subscribeAllStudiosSuppliers(
    onData: (suppliers: LiveSupplierRecord[], studios: Array<{ id: string; name: string }>) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    if (!db) {
      onData([], []);
      return () => {};
    }

    const subUnsubs = new Map<string, () => void>();
    const suppliersByStudio = new Map<string, LiveSupplierRecord[]>();
    let studioList: Array<{ id: string; name: string }> = [];

    const emit = () => {
      const merged: LiveSupplierRecord[] = [];
      suppliersByStudio.forEach((arr) => merged.push(...arr));
      merged.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      onData(merged, studioList);
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
            const unsub = onSnapshot(
              collection(db, 'studios', st.id, 'suppliers'),
              (sSnap) => {
                suppliersByStudio.set(
                  st.id,
                  sSnap.docs
                    .map((sd) => ({
                      id: sd.id,
                      ...(sd.data() as Omit<LiveSupplierRecord, 'id'>),
                      studioId: st.id,
                      studioName: sd.data()?.studioName || st.name
                    }))
                    .filter((s) => !s.isArchived)
                );
                emit();
              },
              (err) => console.warn(`[LiveSupplierService] studio ${st.id} suppliers error:`, err.message)
            );
            subUnsubs.set(st.id, unsub);
          }
        });

        Array.from(subUnsubs.keys()).forEach((sid) => {
          if (!activeIds.has(sid)) {
            subUnsubs.get(sid)?.();
            subUnsubs.delete(sid);
            suppliersByStudio.delete(sid);
          }
        });

        emit();
      },
      (err) => {
        console.error('[LiveSupplierService] studios snapshot error:', err);
        onError?.(err);
      }
    );

    return () => {
      unsubStudios();
      subUnsubs.forEach((fn) => fn());
      subUnsubs.clear();
    };
  }

  async createSupplier(params: {
    studioId: string;
    studioName: string;
    businessName: string;
    category: SupplierCategory;
    contactPerson: string;
    phone: string;
    email?: string;
    city?: string;
    address?: string;
    services?: string;
    baseDayRate?: number;
    notes?: string;
    isActive?: boolean;
    actingUser: string;
    actingRole: string;
  }): Promise<LiveSupplierRecord> {
    if (!db) throw new Error('Firestore is not initialized.');
    const businessName = params.businessName.trim();
    const contactPerson = params.contactPerson.trim();
    const phone = params.phone.trim();
    if (!params.studioId || !businessName || !contactPerson || !phone) {
      throw new Error('Studio, Business Name, Contact Person, and Phone are required.');
    }

    // Duplicate prevention within the studio
    const existingSnap = await getDocs(collection(db, 'studios', params.studioId, 'suppliers'));
    const normPhone = normalizePhone(phone);
    const normName = businessName.toLowerCase();
    const dup = existingSnap.docs.find((d) => {
      const s = d.data() || {};
      if (s.isArchived) return false;
      const sameName = String(s.businessName || '').trim().toLowerCase() === normName;
      const samePhone = normPhone && normalizePhone(s.phone || '') === normPhone;
      return sameName || samePhone;
    });
    if (dup) {
      throw new Error(`Supplier "${businessName}" or phone "${phone}" already exists in this studio.`);
    }

    const id = `supp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();
    const record: LiveSupplierRecord = {
      id,
      studioId: params.studioId,
      studioName: params.studioName,
      businessName,
      category: params.category,
      contactPerson,
      phone,
      email: (params.email || '').trim(),
      city: (params.city || '').trim(),
      address: (params.address || '').trim(),
      services: (params.services || '').trim(),
      baseDayRate: Math.max(0, Number(params.baseDayRate) || 0),
      isActive: params.isActive ?? true,
      isArchived: false,
      notes: (params.notes || '').trim(),
      rating: 5,
      createdAt: now,
      updatedAt: now,
      updatedBy: params.actingUser
    };

    await setDoc(doc(db, 'studios', params.studioId, 'suppliers', id), record);
    await logSupplierAudit({
      actingUser: params.actingUser,
      role: params.actingRole,
      studioId: params.studioId,
      recordId: id,
      operation: 'CREATE_SUPPLIER',
      newValues: { businessName, category: record.category, phone }
    });

    return record;
  }

  async updateSupplier(params: {
    studioId: string;
    supplierId: string;
    updates: Partial<
      Pick<
        LiveSupplierRecord,
        | 'businessName'
        | 'category'
        | 'contactPerson'
        | 'phone'
        | 'email'
        | 'city'
        | 'address'
        | 'services'
        | 'baseDayRate'
        | 'isActive'
        | 'notes'
        | 'studioName'
      >
    >;
    actingUser: string;
    actingRole: string;
  }): Promise<LiveSupplierRecord> {
    if (!db) throw new Error('Firestore is not initialized.');
    const ref = doc(db, 'studios', params.studioId, 'suppliers', params.supplierId);
    const snap = await getDoc(ref);
    if (!snap.exists()) throw new Error('Supplier not found.');

    const existing = snap.data() as LiveSupplierRecord;
    const now = new Date().toISOString();
    const merged: LiveSupplierRecord = {
      ...existing,
      ...params.updates,
      baseDayRate:
        params.updates.baseDayRate !== undefined
          ? Math.max(0, Number(params.updates.baseDayRate) || 0)
          : existing.baseDayRate,
      updatedAt: now,
      updatedBy: params.actingUser
    };

    await setDoc(ref, merged, { merge: true });
    await logSupplierAudit({
      actingUser: params.actingUser,
      role: params.actingRole,
      studioId: params.studioId,
      recordId: params.supplierId,
      operation: 'UPDATE_SUPPLIER',
      previousValues: { businessName: existing.businessName, isActive: existing.isActive, baseDayRate: existing.baseDayRate },
      newValues: { businessName: merged.businessName, isActive: merged.isActive, baseDayRate: merged.baseDayRate }
    });

    return merged;
  }

  async deleteOrArchiveSupplier(params: {
    studioId: string;
    supplierId: string;
    actingUser: string;
    actingRole: string;
  }): Promise<{ archived: boolean }> {
    if (!db) throw new Error('Firestore is not initialized.');
    const ref = doc(db, 'studios', params.studioId, 'suppliers', params.supplierId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return { archived: false };

    const existing = snap.data() as LiveSupplierRecord;

    // Check if supplier is referenced in any studio bookings
    const bookingsSnap = await getDocs(collection(db, 'studios', params.studioId, 'bookings')).catch(() => null);
    const isReferenced = bookingsSnap?.docs.some((b) => {
      const str = JSON.stringify(b.data() || {});
      return str.includes(params.supplierId) || (existing.businessName && str.includes(existing.businessName));
    });

    if (isReferenced) {
      await setDoc(
        ref,
        {
          isActive: false,
          isArchived: true,
          updatedAt: new Date().toISOString(),
          updatedBy: params.actingUser
        },
        { merge: true }
      );
      await logSupplierAudit({
        actingUser: params.actingUser,
        role: params.actingRole,
        studioId: params.studioId,
        recordId: params.supplierId,
        operation: 'ARCHIVE_REFERENCED_SUPPLIER',
        previousValues: { businessName: existing.businessName, isActive: existing.isActive }
      });
      return { archived: true };
    }

    await deleteDoc(ref);
    await logSupplierAudit({
      actingUser: params.actingUser,
      role: params.actingRole,
      studioId: params.studioId,
      recordId: params.supplierId,
      operation: 'DELETE_SUPPLIER',
      previousValues: { businessName: existing.businessName }
    });
    return { archived: false };
  }
}

export const liveSupplierService = new LiveSupplierService();
