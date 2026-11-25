import { auth, db } from '../lib/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';

export type PlatformAccountType = 'MASTER_ADMIN' | 'STUDIO_OWNER' | 'EMPLOYEE';
export type AccountStatus = 'active' | 'deactivated' | 'suspended';

export interface PlatformAccountRecord {
  uid: string;
  id: string;
  accountType: PlatformAccountType;
  loginId: string;
  contactEmail: string;
  email: string;
  phone: string;
  displayName: string;
  studioId: string | null;
  studioName: string | null;
  roleId: string;
  roleTitle: string;
  employeeId?: string | null;
  department?: string | null;
  designation?: string | null;
  status: AccountStatus;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

export interface AccountBusinessSummary {
  customersCount: number;
  bookingsCount: number;
  quotationsCount: number;
  invoicesCount: number;
  paymentsCount: number;
  employeesCount: number;
  totalPaidInr: number;
  totalInvoicedInr: number;
}

export interface AccountDetailPayload {
  uid: string;
  accountType: PlatformAccountType;
  displayName: string;
  loginId: string;
  contactEmail: string;
  phone: string;
  roleTitle: string;
  status: AccountStatus;
  createdAt: string | null;
  updatedAt: string | null;
  lastLoginAt: string | null;
  providers: string[];
  studio: {
    id: string;
    name: string;
    city: string;
    state: string;
    subscriptionStatus: string;
    lifecycleStatus: string;
    createdAt: string | null;
  } | null;
  businessSummary: AccountBusinessSummary | null;
  employeeDetails: {
    employeeId: string;
    employeeNumber: string;
    department: string;
    designation: string;
    roleName: string;
    employmentStatus: string;
    dateOfJoining: string | null;
  } | null;
}

export const MASTER_ADMIN_EMAIL = 'jarsaniya.abhay@gmail.com';

export function deriveLoginId(data: Record<string, any>): string {
  if (data.loginId && String(data.loginId).trim()) {
    return String(data.loginId).trim();
  }
  const email = String(data.email || '').trim().toLowerCase();
  if (email.endsWith('@studio-os.internal')) {
    return email.replace(/@studio-os\.internal$/i, '');
  }
  return email;
}

export function normalizeFirestoreAccount(
  uid: string,
  data: Record<string, any>,
  studioNameMap?: Map<string, string>
): PlatformAccountRecord {
  const email = String(data.email || '').trim().toLowerCase();
  const isInternalEmail = email.endsWith('@studio-os.internal');
  const loginId = deriveLoginId({ ...data, email });
  const rawType = String(data.accountType || '').toUpperCase();
  const accountType: PlatformAccountType =
    rawType === 'MASTER_ADMIN' || email === MASTER_ADMIN_EMAIL
      ? 'MASTER_ADMIN'
      : rawType === 'EMPLOYEE'
        ? 'EMPLOYEE'
        : 'STUDIO_OWNER';

  const status: AccountStatus =
    data.status === 'deactivated' || data.isActive === false
      ? 'deactivated'
      : data.status === 'suspended'
        ? 'suspended'
        : 'active';

  const studioId = data.studioId || null;
  const resolvedStudioName =
    data.studioName ||
    (studioId && studioNameMap?.get(studioId)) ||
    null;

  return {
    uid,
    id: uid,
    accountType,
    loginId,
    contactEmail: isInternalEmail ? '' : email,
    email,
    phone: String(data.phone || data.mobile || '').trim(),
    displayName: String(data.displayName || data.name || loginId || 'User').trim(),
    studioId,
    studioName: resolvedStudioName,
    roleId:
      data.roleId ||
      data.role ||
      (accountType === 'MASTER_ADMIN'
        ? 'master_super_admin'
        : accountType === 'STUDIO_OWNER'
          ? 'owner'
          : 'employee'),
    roleTitle:
      data.roleTitle ||
      data.roleName ||
      data.designation ||
      (accountType === 'MASTER_ADMIN'
        ? 'Master Super Admin'
        : accountType === 'STUDIO_OWNER'
          ? 'Studio Owner'
          : 'Employee'),
    employeeId: data.employeeId || null,
    department: data.department || null,
    designation: data.designation || null,
    status,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || data.createdAt || new Date().toISOString(),
    lastLoginAt: data.lastLoginAt || null
  };
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  const currentUser = auth?.currentUser;
  if (currentUser) {
    const token = await currentUser.getIdToken();
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

class MasterAccountsService {
  subscribeAccounts(
    onData: (accounts: PlatformAccountRecord[]) => void,
    onError?: (err: Error) => void
  ): Unsubscribe {
    if (!db) {
      onData([]);
      return () => {};
    }

    let studioNameMap = new Map<string, string>();
    let latestUsersDocs: Array<{ id: string; data: Record<string, any> }> = [];

    const emit = () => {
      const normalized = latestUsersDocs.map((d) =>
        normalizeFirestoreAccount(d.id, d.data, studioNameMap)
      );
      onData(normalized);
    };

    const unsubStudios = onSnapshot(
      collection(db, 'studios'),
      (snap) => {
        const nextMap = new Map<string, string>();
        snap.docs.forEach((d) => {
          const s = d.data() || {};
          nextMap.set(d.id, s.name || d.id);
        });
        studioNameMap = nextMap;
        if (latestUsersDocs.length > 0) emit();
      },
      (err) => {
        console.warn('[MasterAccountsService] studios snapshot error:', err.message);
      }
    );

    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        latestUsersDocs = snap.docs.map((d) => ({
          id: d.id,
          data: d.data() || {}
        }));
        emit();
      },
      (err) => {
        console.error('[MasterAccountsService] users snapshot error:', err);
        onError?.(err);
      }
    );

    return () => {
      unsubStudios();
      unsubUsers();
    };
  }

  async getAccountDetail(uid: string): Promise<AccountDetailPayload> {
    try {
      const headers = await getAuthHeaders();
      const resp = await fetch(`/api/accounts/detail?uid=${encodeURIComponent(uid)}`, {
        method: 'GET',
        headers
      });
      if (resp.ok) {
        const json = await resp.json();
        if (json.success && json.detail) {
          return json.detail;
        }
      }
    } catch {
      // Fallback to direct Firestore read below
    }

    if (!db) {
      throw new Error('Firestore is not initialized.');
    }

    const userSnap = await getDoc(doc(db, 'users', uid));
    if (!userSnap.exists()) {
      throw new Error('Account not found.');
    }

    const base = normalizeFirestoreAccount(uid, userSnap.data() || {});
    let studio: AccountDetailPayload['studio'] = null;
    let businessSummary: AccountBusinessSummary | null = null;
    let employeeDetails: AccountDetailPayload['employeeDetails'] = null;

    if (base.studioId) {
      const studioRef = doc(db, 'studios', base.studioId);
      const studioSnap = await getDoc(studioRef);
      if (studioSnap.exists()) {
        const s = studioSnap.data() || {};
        studio = {
          id: base.studioId,
          name: s.name || base.studioName || base.studioId,
          city: s.city || '',
          state: s.state || '',
          subscriptionStatus: s.subscriptionStatus || 'trial',
          lifecycleStatus: s.lifecycleStatus || 'active',
          createdAt: s.createdAt || null
        };
      }

      if (base.accountType === 'STUDIO_OWNER') {
        const [customersSnap, bookingsSnap, quotationsSnap, invoicesSnap, paymentsSnap, employeesSnap] =
          await Promise.all([
            getDocs(collection(db, 'studios', base.studioId, 'customers')),
            getDocs(collection(db, 'studios', base.studioId, 'bookings')),
            getDocs(collection(db, 'studios', base.studioId, 'quotations')),
            getDocs(collection(db, 'studios', base.studioId, 'invoices')),
            getDocs(collection(db, 'studios', base.studioId, 'payments')),
            getDocs(collection(db, 'studios', base.studioId, 'employees'))
          ]);

        const totalPaidInr = paymentsSnap.docs.reduce((sum, d) => sum + (Number(d.data()?.amount) || 0), 0);
        const totalInvoicedInr = invoicesSnap.docs.reduce(
          (sum, d) => sum + (Number(d.data()?.totalAmount || d.data()?.amount) || 0),
          0
        );

        businessSummary = {
          customersCount: customersSnap.size,
          bookingsCount: bookingsSnap.size,
          quotationsCount: quotationsSnap.size,
          invoicesCount: invoicesSnap.size,
          paymentsCount: paymentsSnap.size,
          employeesCount: employeesSnap.size,
          totalPaidInr,
          totalInvoicedInr
        };
      } else if (base.accountType === 'EMPLOYEE' && base.employeeId) {
        const empSnap = await getDoc(doc(db, 'studios', base.studioId, 'employees', base.employeeId));
        if (empSnap.exists()) {
          const e = empSnap.data() || {};
          employeeDetails = {
            employeeId: base.employeeId,
            employeeNumber: e.employeeNumber || '',
            department: e.department || base.department || '',
            designation: e.designation || base.designation || '',
            roleName: e.roleName || base.roleTitle || '',
            employmentStatus: e.employmentStatus || 'active',
            dateOfJoining: e.dateOfJoining || null
          };
        }
      }
    }

    return {
      uid: base.uid,
      accountType: base.accountType,
      displayName: base.displayName,
      loginId: base.loginId,
      contactEmail: base.contactEmail,
      phone: base.phone,
      roleTitle: base.roleTitle,
      status: base.status,
      createdAt: base.createdAt,
      updatedAt: base.updatedAt,
      lastLoginAt: base.lastLoginAt,
      providers: [],
      studio,
      businessSummary,
      employeeDetails
    };
  }

  async updateAccount(payload: {
    uid: string;
    displayName?: string;
    phone?: string;
    loginId?: string;
    status?: AccountStatus;
  }): Promise<void> {
    const headers = await getAuthHeaders();
    const resp = await fetch('/api/accounts/update', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok || !json.success) {
      throw new Error(json.error || 'Failed to update account.');
    }
  }

  async resetPassword(uid: string, newPassword?: string): Promise<string> {
    const headers = await getAuthHeaders();
    const resp = await fetch('/api/accounts/reset-password', {
      method: 'POST',
      headers,
      body: JSON.stringify({ uid, newPassword })
    });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok || !json.success) {
      throw new Error(json.error || 'Failed to reset password.');
    }
    return json.temporaryPassword;
  }

  async deleteAccount(uid: string): Promise<void> {
    const headers = await getAuthHeaders();
    const resp = await fetch('/api/accounts/delete', {
      method: 'POST',
      headers,
      body: JSON.stringify({ uid })
    });
    const json = await resp.json().catch(() => ({}));
    if (!resp.ok || !json.success) {
      throw new Error(json.error || 'Failed to delete account.');
    }
  }
}

export const masterAccountsService = new MasterAccountsService();
