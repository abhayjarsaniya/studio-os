import { auth, db, googleProvider, isAuthBypassed } from '../lib/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where 
} from 'firebase/firestore';
import { signInWithPopup, signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { TenantStore } from './tenantStore';
import { unifiedAuthService } from './unifiedAuthService';
import { platformAuditService } from './platformAuditService';
import { Studio, Employee, Branch } from '../types/schema';
import { platformStudioService } from './platformStudioService';

export interface AuthorizedStudioEmail {
  id: string;
  email: string;
  ownerName?: string;
  role?: 'studio_owner' | 'employee' | 'platform_master_admin';
  status: 'enabled' | 'disabled';
  allowPasswordLogin?: boolean;
  allowGoogleLogin?: boolean;
  invitationStatus: 'not_sent' | 'sent' | 'accepted' | 'expired';
  invitationTokenHash?: string;
  invitationCreatedAt?: string;
  invitationExpiresAt?: string;
  registeredUid?: string | null;
  linkedStudioId?: string | null;
  linkedStudioName?: string | null;
  lastLoginAt?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudioInvitationRecord {
  id: string; // Token hash or doc ID
  tokenHash: string;
  type: 'studio_owner' | 'employee';
  email: string;
  ownerName?: string;
  authorizedEmailId?: string;
  studioId?: string;
  studioName?: string;
  roleId?: string;
  roleName?: string;
  department?: string;
  mobile?: string;
  status: 'pending' | 'used' | 'revoked' | 'expired';
  expiresAt: string;
  createdAt: string;
  usedAt?: string | null;
  usedByUid?: string | null;
  usedByEmail?: string | null;
}

export interface GoogleAuthUser {
  uid: string;
  email: string;
  displayName?: string | null;
  photoURL?: string | null;
}

export interface StudioRegistrationData {
  name: string;
  ownerName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pinCode?: string;
  logoUrl?: string;
  gstNumber?: string;
  website?: string;
  description?: string;
}

// Master Admin allowed email addresses
export const MASTER_ADMIN_EMAILS = [
  'jarsaniya.abhay@gmail.com',
  'abhayjarsaniya@gmail.com',
  'admin@studio-os.com',
  'masteradmin@studioos.internal'
];

export async function hashInvitationToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const subtle = (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) 
    ? globalThis.crypto.subtle 
    : (typeof crypto !== 'undefined' && crypto.subtle ? crypto.subtle : null);

  if (subtle) {
    const hashBuffer = await subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback 64-bit Murmur/FNV deterministic hash
  let h1 = 0xdeadbeef ^ token.length;
  let h2 = 0x41c6ce57 ^ token.length;
  for (let i = 0; i < token.length; i++) {
    const ch = token.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(16, '0');
}

export function generateRawInvitationToken(): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const buffer = new Uint8Array(24);
    crypto.getRandomValues(buffer);
    return Array.from(buffer).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  return `inv_${Math.random().toString(36).slice(2)}${Date.now()}${Math.random().toString(36).slice(2)}`;
}

class GoogleAuthInvitationService {
  private localKey = 'authorized_studio_emails_v1';
  private invitationsKey = 'studio_invitations_v1';

  normalizeEmail(email: string): string {
    return (email || '').trim().toLowerCase();
  }

  isGmailOrValid(email: string): boolean {
    const clean = this.normalizeEmail(email);
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean);
  }

  getBaseUrl(): string {
    if (typeof window !== 'undefined' && window.location.origin) {
      return window.location.origin;
    }
    return 'https://studio-os-lemon-nine.vercel.app';
  }

  // -------------------------------------------------------------
  // AUTHORIZED STUDIO EMAILS MANAGEMENT (Master Admin)
  // -------------------------------------------------------------

  async listAuthorizedEmails(): Promise<AuthorizedStudioEmail[]> {
    const isTest = typeof process !== 'undefined' && Boolean(process.env?.VITEST || process.env?.NODE_ENV === 'test');
    let items = (TenantStore.get('platform_system', this.localKey) as AuthorizedStudioEmail[]) || [];

    if (!isTest && db && !isAuthBypassed) {
      try {
        const snap = await getDocs(collection(db, 'authorizedStudioEmails'));
        if (!snap.empty) {
          const remoteItems: AuthorizedStudioEmail[] = snap.docs.map(d => d.data() as AuthorizedStudioEmail);
          TenantStore.set('platform_system', this.localKey, remoteItems);
          return remoteItems;
        }
      } catch (err: any) {
        console.warn('[GoogleAuthInvitationService] Firestore list notice:', err?.message);
      }
    }

    return items;
  }

  async addAuthorizedEmail(payload: {
    email: string;
    ownerName?: string;
    role?: 'studio_owner' | 'employee' | 'platform_master_admin';
    allowPasswordLogin?: boolean;
    allowGoogleLogin?: boolean;
    sendInvitationImmediately?: boolean;
    createdBy?: string;
  }): Promise<{ record: AuthorizedStudioEmail; invitationLink?: string; rawToken?: string }> {
    const cleanEmail = this.normalizeEmail(payload.email);
    if (!this.isGmailOrValid(cleanEmail)) {
      throw new Error(`Invalid email address format: "${payload.email}".`);
    }

    const all = await this.listAuthorizedEmails();
    const existing = all.find(item => item.email.toLowerCase() === cleanEmail);
    if (existing) {
      throw new Error(`The email "${cleanEmail}" is already authorized (Status: ${existing.status}). You can resend or edit its invitation.`);
    }

    const id = `auth_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const now = new Date().toISOString();

    const newRecord: AuthorizedStudioEmail = {
      id,
      email: cleanEmail,
      ownerName: payload.ownerName?.trim() || '',
      role: payload.role || 'studio_owner',
      status: 'enabled',
      allowPasswordLogin: payload.allowPasswordLogin ?? true,
      allowGoogleLogin: payload.allowGoogleLogin ?? true,
      invitationStatus: 'not_sent',
      registeredUid: null,
      linkedStudioId: null,
      linkedStudioName: null,
      createdBy: payload.createdBy || 'Master Admin',
      createdAt: now,
      updatedAt: now
    };

    let invitationLink: string | undefined;
    let rawToken: string | undefined;

    if (payload.sendInvitationImmediately) {
      rawToken = generateRawInvitationToken();
      const tokenHash = await hashInvitationToken(rawToken);
      const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      newRecord.invitationStatus = 'sent';
      newRecord.invitationTokenHash = tokenHash;
      newRecord.invitationCreatedAt = now;
      newRecord.invitationExpiresAt = expiry;

      invitationLink = `${this.getBaseUrl()}/#/signup?token=${rawToken}`;

      // Save invitation record
      const invitationRecord: StudioInvitationRecord = {
        id: tokenHash,
        tokenHash,
        type: (payload.role === 'employee' ? 'employee' : 'studio_owner'),
        email: cleanEmail,
        ownerName: payload.ownerName?.trim(),
        authorizedEmailId: id,
        status: 'pending',
        expiresAt: expiry,
        createdAt: now
      };

      await this.saveInvitationRecord(invitationRecord);
    }

    // Save authorized record
    all.unshift(newRecord);
    TenantStore.set('platform_system', this.localKey, all);

    const isTest = typeof process !== 'undefined' && Boolean(process.env?.VITEST || process.env?.NODE_ENV === 'test');
    if (!isTest && db && !isAuthBypassed) {
      try {
        await Promise.allSettled([
          setDoc(doc(db, 'authorizedStudioEmails', id), newRecord, { merge: true }),
          setDoc(doc(db, 'authorizedEmails', id), newRecord, { merge: true })
        ]);
      } catch (err: any) {
        console.warn('[GoogleAuthInvitationService] Firestore save error:', err?.message);
      }
    }

    platformAuditService.log({
      adminId: 'admin_master',
      adminName: payload.createdBy || 'Master Admin',
      action: 'AUTHORIZE_STUDIO_EMAIL',
      targetType: 'studio_owner',
      targetId: id,
      details: `Authorized email "${cleanEmail}" for Studio Owner registration.`
    });

    return { record: newRecord, invitationLink, rawToken };
  }

  async sendInvitation(
    id: string,
    expiryDays = 7,
    actingAdmin = 'Master Admin'
  ): Promise<{ success: boolean; invitationLink: string; rawToken: string; expiresAt: string }> {
    const all = await this.listAuthorizedEmails();
    const idx = all.findIndex(i => i.id === id);
    if (idx === -1) {
      throw new Error(`Authorized email record not found.`);
    }

    const record = all[idx];
    if (record.status === 'disabled') {
      throw new Error(`Cannot send invitation: this email authorization is currently disabled.`);
    }

    const rawToken = generateRawInvitationToken();
    const tokenHash = await hashInvitationToken(rawToken);
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString();

    record.invitationStatus = 'sent';
    record.invitationTokenHash = tokenHash;
    record.invitationCreatedAt = now;
    record.invitationExpiresAt = expiresAt;
    record.updatedAt = now;

    all[idx] = record;
    TenantStore.set('platform_system', this.localKey, all);

    const invitationRecord: StudioInvitationRecord = {
      id: tokenHash,
      tokenHash,
      type: 'studio_owner',
      email: record.email,
      ownerName: record.ownerName,
      authorizedEmailId: id,
      status: 'pending',
      expiresAt,
      createdAt: now
    };

    await this.saveInvitationRecord(invitationRecord);

    const isTest = typeof process !== 'undefined' && Boolean(process.env?.VITEST || process.env?.NODE_ENV === 'test');
    if (!isTest && db && !isAuthBypassed) {
      try {
        await setDoc(doc(db, 'authorizedStudioEmails', id), record, { merge: true });
      } catch (err: any) {
        console.warn('[GoogleAuthInvitationService] Firestore update error:', err?.message);
      }
    }

    const invitationLink = `${this.getBaseUrl()}/#/signup?token=${rawToken}`;

    platformAuditService.log({
      adminId: 'admin_master',
      adminName: actingAdmin,
      action: 'SEND_STUDIO_INVITATION',
      targetType: 'studio_owner',
      targetId: id,
      details: `Dispatched one-time studio registration invitation to "${record.email}".`
    });

    return { success: true, invitationLink, rawToken, expiresAt };
  }

  async resendInvitation(id: string, actingAdmin = 'Master Admin') {
    return this.sendInvitation(id, 7, actingAdmin);
  }

  async enableAuthorizedEmail(id: string, actingAdmin = 'Master Admin'): Promise<void> {
    const all = await this.listAuthorizedEmails();
    const item = all.find(i => i.id === id);
    if (!item) throw new Error('Authorized email not found.');

    item.status = 'enabled';
    item.updatedAt = new Date().toISOString();
    TenantStore.set('platform_system', this.localKey, all);

    const cachedProfiles = (TenantStore.get('platform_system', 'user_profiles') as any[]) || [];
    cachedProfiles.forEach(p => {
      if (p.email.toLowerCase() === item.email.toLowerCase()) {
        p.status = 'active';
        p.isActive = true;
      }
    });
    TenantStore.set('platform_system', 'user_profiles', cachedProfiles);

    const isTest = typeof process !== 'undefined' && Boolean(process.env?.VITEST || process.env?.NODE_ENV === 'test');
    if (!isTest && db && !isAuthBypassed) {
      try {
        await updateDoc(doc(db, 'authorizedStudioEmails', id), {
          status: 'enabled',
          updatedAt: item.updatedAt
        });
        if (item.registeredUid) {
          await updateDoc(doc(db, 'users', item.registeredUid), {
            status: 'active',
            isActive: true,
            updatedAt: item.updatedAt
          });
        }
      } catch (e: any) {
        console.warn('[enableAuthorizedEmail] Notice:', e.message);
      }
    }

    platformAuditService.log({
      adminId: 'admin_master',
      adminName: actingAdmin,
      action: 'ENABLE_AUTHORIZED_EMAIL',
      targetType: 'studio_owner',
      targetId: id,
      details: `Enabled access for authorized email "${item.email}".`
    });
  }

  async disableAuthorizedEmail(id: string, actingAdmin = 'Master Admin'): Promise<void> {
    const all = await this.listAuthorizedEmails();
    const item = all.find(i => i.id === id);
    if (!item) throw new Error('Authorized email not found.');

    item.status = 'disabled';
    item.updatedAt = new Date().toISOString();
    TenantStore.set('platform_system', this.localKey, all);

    const cachedProfiles = (TenantStore.get('platform_system', 'user_profiles') as any[]) || [];
    cachedProfiles.forEach(p => {
      if (p.email.toLowerCase() === item.email.toLowerCase()) {
        p.status = 'inactive';
        p.isActive = false;
      }
    });
    TenantStore.set('platform_system', 'user_profiles', cachedProfiles);

    const isTest = typeof process !== 'undefined' && Boolean(process.env?.VITEST || process.env?.NODE_ENV === 'test');
    if (!isTest && db && !isAuthBypassed) {
      try {
        await updateDoc(doc(db, 'authorizedStudioEmails', id), {
          status: 'disabled',
          updatedAt: item.updatedAt
        });
        if (item.registeredUid) {
          await updateDoc(doc(db, 'users', item.registeredUid), {
            status: 'inactive',
            isActive: false,
            updatedAt: item.updatedAt
          });
        }
      } catch (e: any) {
        console.warn('[disableAuthorizedEmail] Notice:', e.message);
      }
    }

    platformAuditService.log({
      adminId: 'admin_master',
      adminName: actingAdmin,
      action: 'DISABLE_AUTHORIZED_EMAIL',
      targetType: 'studio_owner',
      targetId: id,
      details: `Disabled authorized email "${item.email}". Blocked future sign-in attempts.`
    });
  }

  async editAuthorizedEmail(
    id: string,
    newEmail: string,
    newOwnerName?: string,
    actingAdmin = 'Master Admin'
  ): Promise<{ success: boolean; updatedRecord: AuthorizedStudioEmail }> {
    const cleanNew = this.normalizeEmail(newEmail);
    if (!this.isGmailOrValid(cleanNew)) {
      throw new Error(`Invalid email address: "${newEmail}".`);
    }

    const all = await this.listAuthorizedEmails();
    const idx = all.findIndex(i => i.id === id);
    if (idx === -1) throw new Error('Authorized email not found.');

    const oldEmail = all[idx].email;
    const existingConflict = all.find(i => i.id !== id && i.email === cleanNew);
    if (existingConflict) {
      throw new Error(`The email "${cleanNew}" is already registered under another authorization record.`);
    }

    const now = new Date().toISOString();
    all[idx].email = cleanNew;
    if (newOwnerName !== undefined) all[idx].ownerName = newOwnerName.trim();
    // Invalidate old token on email change
    all[idx].invitationStatus = 'not_sent';
    all[idx].invitationTokenHash = undefined;
    all[idx].invitationCreatedAt = undefined;
    all[idx].invitationExpiresAt = undefined;
    all[idx].updatedAt = now;

    TenantStore.set('platform_system', this.localKey, all);

    const isTest = typeof process !== 'undefined' && Boolean(process.env?.VITEST || process.env?.NODE_ENV === 'test');
    if (!isTest && db && !isAuthBypassed) {
      try {
        await setDoc(doc(db, 'authorizedStudioEmails', id), all[idx], { merge: true });
      } catch (e: any) {
        console.warn('[editAuthorizedEmail] Notice:', e.message);
      }
    }

    platformAuditService.log({
      adminId: 'admin_master',
      adminName: actingAdmin,
      action: 'EDIT_AUTHORIZED_EMAIL',
      targetType: 'studio_owner',
      targetId: id,
      details: `Reassigned authorized email from "${oldEmail}" to "${cleanNew}". Old invitations invalidated.`
    });

    return { success: true, updatedRecord: all[idx] };
  }

  async deleteAuthorizedEmail(id: string, actingAdmin = 'Master Admin'): Promise<void> {
    const all = await this.listAuthorizedEmails();
    const item = all.find(i => i.id === id);
    if (!item) return;

    const filtered = all.filter(i => i.id !== id);
    TenantStore.set('platform_system', this.localKey, filtered);

    const isTest = typeof process !== 'undefined' && Boolean(process.env?.VITEST || process.env?.NODE_ENV === 'test');
    if (!isTest && db && !isAuthBypassed) {
      try {
        await deleteDoc(doc(db, 'authorizedStudioEmails', id));
      } catch (e: any) {
        console.warn('[deleteAuthorizedEmail] Notice:', e.message);
      }
    }

    platformAuditService.log({
      adminId: 'admin_master',
      adminName: actingAdmin,
      action: 'DELETE_AUTHORIZED_EMAIL',
      targetType: 'studio_owner',
      targetId: id,
      details: `Deleted authorization for "${item.email}". Preserved studio business data.`
    });
  }

  async togglePasswordLogin(id: string, allow: boolean, actingAdmin = 'Master Admin'): Promise<void> {
    const all = await this.listAuthorizedEmails();
    const item = all.find(i => i.id === id);
    if (!item) throw new Error('Authorized email not found.');

    item.allowPasswordLogin = allow;
    item.updatedAt = new Date().toISOString();
    TenantStore.set('platform_system', this.localKey, all);

    const isTest = typeof process !== 'undefined' && Boolean(process.env?.VITEST || process.env?.NODE_ENV === 'test');
    if (!isTest && db && !isAuthBypassed) {
      try {
        await Promise.allSettled([
          updateDoc(doc(db, 'authorizedStudioEmails', id), {
            allowPasswordLogin: allow,
            updatedAt: item.updatedAt
          }),
          updateDoc(doc(db, 'authorizedEmails', id), {
            allowPasswordLogin: allow,
            updatedAt: item.updatedAt
          })
        ]);
      } catch (e: any) {
        console.warn('[togglePasswordLogin] Firestore notice:', e.message);
      }
    }

    platformAuditService.log({
      adminId: 'admin_master',
      adminName: actingAdmin,
      action: 'TOGGLE_PASSWORD_LOGIN',
      targetType: 'studio_owner',
      targetId: id,
      details: `${allow ? 'Enabled' : 'Disabled'} password login for "${item.email}".`
    });
  }

  async toggleGoogleLogin(id: string, allow: boolean, actingAdmin = 'Master Admin'): Promise<void> {
    const all = await this.listAuthorizedEmails();
    const item = all.find(i => i.id === id);
    if (!item) throw new Error('Authorized email not found.');

    item.allowGoogleLogin = allow;
    item.updatedAt = new Date().toISOString();
    TenantStore.set('platform_system', this.localKey, all);

    const isTest = typeof process !== 'undefined' && Boolean(process.env?.VITEST || process.env?.NODE_ENV === 'test');
    if (!isTest && db && !isAuthBypassed) {
      try {
        await Promise.allSettled([
          updateDoc(doc(db, 'authorizedStudioEmails', id), {
            allowGoogleLogin: allow,
            updatedAt: item.updatedAt
          }),
          updateDoc(doc(db, 'authorizedEmails', id), {
            allowGoogleLogin: allow,
            updatedAt: item.updatedAt
          })
        ]);
      } catch (e: any) {
        console.warn('[toggleGoogleLogin] Firestore notice:', e.message);
      }
    }

    platformAuditService.log({
      adminId: 'admin_master',
      adminName: actingAdmin,
      action: 'TOGGLE_GOOGLE_LOGIN',
      targetType: 'studio_owner',
      targetId: id,
      details: `${allow ? 'Enabled' : 'Disabled'} Google Sign-In for "${item.email}".`
    });
  }

  async resetUserPassword(email: string, actingAdmin = 'Master Admin'): Promise<{ success: boolean; message: string }> {
    const cleanEmail = this.normalizeEmail(email);
    // Dispatch Firebase password reset
    const isTest = typeof process !== 'undefined' && Boolean(process.env?.VITEST || process.env?.NODE_ENV === 'test');
    if (!isTest) {
      try {
        const { realAccountProvisionService } = await import('./realAccountProvisionService');
        await realAccountProvisionService.dispatchFirebasePasswordReset(cleanEmail);
      } catch (err: any) {
        console.warn('[resetUserPassword] Firebase dispatch notice:', err?.message);
      }
    }

    platformAuditService.log({
      adminId: 'admin_master',
      adminName: actingAdmin,
      action: 'RESET_USER_PASSWORD',
      targetType: 'studio_owner',
      targetId: cleanEmail,
      details: `Dispatched password reset instructions to "${cleanEmail}".`
    });

    return {
      success: true,
      message: `Password reset link has been dispatched to ${cleanEmail}.`
    };
  }

  async saveOrUpdateAuthorizedEmail(record: AuthorizedStudioEmail): Promise<void> {
    const all = await this.listAuthorizedEmails();
    const idx = all.findIndex(i => i.id === record.id || i.email.toLowerCase() === record.email.toLowerCase());
    if (idx >= 0) {
      all[idx] = { ...all[idx], ...record };
    } else {
      all.unshift(record);
    }
    TenantStore.set('platform_system', this.localKey, all);

    const isTest = typeof process !== 'undefined' && Boolean(process.env?.VITEST || process.env?.NODE_ENV === 'test');
    if (!isTest && db && !isAuthBypassed) {
      try {
        await Promise.allSettled([
          setDoc(doc(db, 'authorizedStudioEmails', record.id), record, { merge: true }),
          setDoc(doc(db, 'authorizedEmails', record.id), record, { merge: true })
        ]);
      } catch (e: any) {
        console.warn('[saveOrUpdateAuthorizedEmail] Firestore notice:', e.message);
      }
    }
  }

  // -------------------------------------------------------------
  // INVITATIONS VALIDATION & ACCEPTANCE
  // -------------------------------------------------------------

  async saveInvitationRecord(invitation: StudioInvitationRecord): Promise<void> {
    const all = (TenantStore.get('platform_system', this.invitationsKey) as StudioInvitationRecord[]) || [];
    const idx = all.findIndex(i => i.tokenHash === invitation.tokenHash);
    if (idx >= 0) {
      all[idx] = invitation;
    } else {
      all.push(invitation);
    }
    TenantStore.set('platform_system', this.invitationsKey, all);

    const isTest = typeof process !== 'undefined' && Boolean(process.env?.VITEST || process.env?.NODE_ENV === 'test');
    if (!isTest && db && !isAuthBypassed) {
      try {
        await setDoc(doc(db, 'studioInvitations', invitation.tokenHash), invitation, { merge: true });
      } catch (err: any) {
        console.warn('[saveInvitationRecord] Firestore notice:', err?.message);
      }
    }
  }

  async getInvitationByHash(tokenHash: string): Promise<StudioInvitationRecord | null> {
    const isTest = typeof process !== 'undefined' && Boolean(process.env?.VITEST || process.env?.NODE_ENV === 'test');
    const localAll = (TenantStore.get('platform_system', this.invitationsKey) as StudioInvitationRecord[]) || [];
    const localMatch = localAll.find(i => i.tokenHash === tokenHash);

    if (!isTest && db && !isAuthBypassed) {
      try {
        const snap = await getDoc(doc(db, 'studioInvitations', tokenHash));
        if (snap.exists()) {
          return snap.data() as StudioInvitationRecord;
        }
      } catch (err: any) {
        console.warn('[getInvitationByHash] Notice:', err?.message);
      }
    }

    return localMatch || null;
  }

  async validateInvitationToken(rawToken: string): Promise<{
    valid: boolean;
    invitation?: StudioInvitationRecord;
    authorizedEmail?: AuthorizedStudioEmail;
    error?: string;
  }> {
    if (!rawToken || rawToken.trim().length < 8) {
      return { valid: false, error: 'Invalid or missing invitation token.' };
    }

    const tokenHash = await hashInvitationToken(rawToken.trim());
    const invitation = await this.getInvitationByHash(tokenHash);

    if (!invitation) {
      return { valid: false, error: 'Invitation not found or has been revoked by Master Admin.' };
    }

    if (invitation.status === 'used') {
      return { valid: false, error: 'This invitation has already been used and is no longer valid.' };
    }

    if (invitation.status === 'revoked') {
      return { valid: false, error: 'This invitation has been revoked by Master Admin.' };
    }

    const now = new Date().getTime();
    const expiry = new Date(invitation.expiresAt).getTime();
    if (now > expiry) {
      return { valid: false, error: 'This registration invitation has expired. Please request a new invitation.' };
    }

    // If it is a studio owner invitation, verify the authorization record is still enabled
    let authRecord: AuthorizedStudioEmail | undefined;
    if (invitation.type === 'studio_owner' && invitation.authorizedEmailId) {
      const allAuth = await this.listAuthorizedEmails();
      authRecord = allAuth.find(a => a.id === invitation.authorizedEmailId);
      if (!authRecord) {
        return { valid: false, error: 'The authorization record for this email was deleted by Master Admin.' };
      }
      if (authRecord.status === 'disabled') {
        return { valid: false, error: 'This authorization has been disabled by Master Admin. Access is blocked.' };
      }
    }

    return { valid: true, invitation, authorizedEmail: authRecord };
  }

  // -------------------------------------------------------------
  // STUDIO OWNER REGISTRATION WITH GOOGLE
  // -------------------------------------------------------------

  async registerStudioWithOwner(
    rawToken: string,
    googleUser: GoogleAuthUser,
    studioData: StudioRegistrationData
  ): Promise<{ success: boolean; studioId: string; error?: string }> {
    const val = await this.validateInvitationToken(rawToken);
    if (!val.valid || !val.invitation) {
      return { success: false, studioId: '', error: val.error || 'Invitation is invalid.' };
    }

    const cleanGoogleEmail = this.normalizeEmail(googleUser.email);
    const cleanInvitedEmail = this.normalizeEmail(val.invitation.email);

    if (cleanGoogleEmail !== cleanInvitedEmail) {
      return {
        success: false,
        studioId: '',
        error: `Identity mismatch: This invitation was issued for "${cleanInvitedEmail}", but you are signed in as "${cleanGoogleEmail}". Please switch to the authorized Google account.`
      };
    }

    const studioName = studioData.name.trim();
    const ownerName = (studioData.ownerName || googleUser.displayName || 'Studio Owner').trim();
    const mobile = studioData.phone.trim();

    if (!studioName) return { success: false, studioId: '', error: 'Studio Name is required.' };
    if (!ownerName) return { success: false, studioId: '', error: 'Studio Owner Name is required.' };
    if (!mobile) return { success: false, studioId: '', error: 'Business Phone Number is required.' };

    const slug = studioName.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 16);
    const uniqueSuffix = Math.random().toString(36).slice(2, 6);
    const studioId = `studio_${slug}_${uniqueSuffix}`;
    const ownerEmpId = `emp_owner_${studioId}`;
    const now = new Date().toISOString();

    // 1. Build Studio Profile
    const newStudio: Studio = {
      id: studioId,
      tenantId: studioId,
      name: studioName,
      title: ownerName,
      tagline: studioData.description || `${studioName} Photography & Cinematography`,
      logoUrl: studioData.logoUrl,
      phone: mobile,
      email: cleanGoogleEmail,
      ownerName,
      ownerEmail: cleanGoogleEmail,
      ownerPhone: mobile,
      ownerAuthUid: googleUser.uid,
      address: studioData.address.trim(),
      city: studioData.city.trim(),
      state: studioData.state.trim() || 'Gujarat',
      gstNumber: studioData.gstNumber?.trim(),
      website: studioData.website?.trim(),
      lifecycleStatus: 'active',
      isHidden: false,
      accountStatus: 'active',
      subscription: {
        planId: 'plan_standard_500',
        planName: 'Studio OS Production',
        pricePerMonth: 500,
        currency: 'INR',
        status: 'active',
        validUntil: '2028-12-31',
        autoRenew: true
      },
      settings: {
        defaultCurrency: 'INR',
        timezone: 'Asia/Kolkata',
        dateFormat: 'DD/MM/YYYY',
        timeFormat: '12h',
        allowDirectWhatsApp: true,
        watermarkEnabled: true,
        invoicePrefix: `${slug.slice(0, 3).toUpperCase()}-INV`,
        eventPrefix: `${slug.slice(0, 3).toUpperCase()}-EV`
      },
      storageUsageMb: 0,
      storageQuotaMb: 15360,
      createdAt: now,
      updatedAt: now,
      createdBy: 'Google OAuth Registration'
    } as any;

    // 2. Build Default Branch & Employee
    const defaultBranch: Branch = {
      id: `br_${studioId}_main`,
      studioId,
      name: `${studioName} Flagship`,
      code: `${studioData.city.slice(0, 3).toUpperCase()}-01`,
      address: studioData.address,
      city: studioData.city,
      phone: mobile,
      email: cleanGoogleEmail,
      isMainBranch: true,
      isActive: true,
      createdAt: now,
      updatedAt: now
    };

    const ownerEmployee: Employee = {
      id: ownerEmpId,
      studioId,
      employeeNumber: 'EMP-001',
      fullName: ownerName,
      name: ownerName,
      phone: mobile,
      email: cleanGoogleEmail,
      designation: 'Studio Owner & Creative Director',
      department: 'Executive',
      roleName: 'Studio Owner',
      roleId: 'owner',
      roleIds: ['owner'],
      branchId: defaultBranch.id,
      employmentStatus: 'active' as any,
      joiningDate: now.split('T')[0],
      createdAt: now,
      updatedAt: now
    };

    // 3. Save to TenantStore
    TenantStore.set(studioId, 'profile', newStudio);
    TenantStore.set(studioId, 'branches', [defaultBranch]);
    TenantStore.set(studioId, 'employees', [ownerEmployee]);

    // Register studio in platform metadata
    try {
      const meta = (platformStudioService as any).getStudiosMeta();
      meta[studioId] = {
        lifecycleStatus: 'active',
        internalNotes: [`Created via Google OAuth by ${cleanGoogleEmail}`]
      };
      (platformStudioService as any).saveStudiosMeta(meta);
    } catch (e) {
      // Continue safely
    }

    // Save user profile in TenantStore cache
    const cachedProfiles = (TenantStore.get('platform_system', 'user_profiles') as any[]) || [];
    cachedProfiles.push({
      uid: googleUser.uid,
      email: cleanGoogleEmail,
      displayName: ownerName,
      role: 'studio_owner',
      accountType: 'STUDIO_OWNER',
      studioId,
      studioName,
      phone: mobile,
      portal: 'Studio Owner',
      status: 'active',
      isActive: true,
      authProvider: 'google.com',
      createdAt: now,
      updatedAt: now
    });
    TenantStore.set('platform_system', 'user_profiles', cachedProfiles);

    // 4. Mark Invitation as used
    val.invitation.status = 'used';
    val.invitation.usedAt = now;
    val.invitation.usedByUid = googleUser.uid;
    val.invitation.usedByEmail = cleanGoogleEmail;
    await this.saveInvitationRecord(val.invitation);

    // 5. Update AuthorizedStudioEmail record
    if (val.authorizedEmail) {
      val.authorizedEmail.invitationStatus = 'accepted';
      val.authorizedEmail.registeredUid = googleUser.uid;
      val.authorizedEmail.linkedStudioId = studioId;
      val.authorizedEmail.linkedStudioName = studioName;
      val.authorizedEmail.ownerName = ownerName;
      val.authorizedEmail.updatedAt = now;

      const allAuth = await this.listAuthorizedEmails();
      const idx = allAuth.findIndex(a => a.id === val.authorizedEmail!.id);
      if (idx >= 0) allAuth[idx] = val.authorizedEmail;
      TenantStore.set('platform_system', this.localKey, allAuth);
    }

    // 6. Firestore Real Writes
    const isTest = typeof process !== 'undefined' && Boolean(process.env?.VITEST || process.env?.NODE_ENV === 'test');
    if (!isTest && db && !isAuthBypassed) {
      try {
        await Promise.allSettled([
          setDoc(doc(db, 'studios', studioId), newStudio, { merge: true }),
          setDoc(doc(db, 'studioDirectory', studioId), {
            studioId,
            name: studioName,
            ownerName,
            ownerEmail: cleanGoogleEmail,
            city: studioData.city.trim(),
            state: studioData.state.trim() || 'Gujarat',
            lifecycleStatus: 'active',
            subscriptionStatus: 'active',
            registeredAt: now
          }, { merge: true }),
          setDoc(doc(db, 'studios', studioId, 'profile', studioId), newStudio, { merge: true }),
          setDoc(doc(db, 'studios', studioId, 'branches', defaultBranch.id), defaultBranch, { merge: true }),
          setDoc(doc(db, 'studios', studioId, 'employees', ownerEmployee.id), { ...ownerEmployee, authUid: googleUser.uid }, { merge: true }),
          // Root user profile
          setDoc(doc(db, 'users', googleUser.uid), {
            uid: googleUser.uid,
            email: cleanGoogleEmail,
            displayName: ownerName,
            photoURL: googleUser.photoURL || null,
            role: 'studio_owner',
            accountType: 'STUDIO_OWNER',
            studioId,
            studioName,
            phone: mobile,
            portal: 'Studio Owner',
            status: 'active',
            isActive: true,
            authProvider: 'google.com',
            createdAt: now,
            updatedAt: now
          }, { merge: true }),
          // Studio membership
          setDoc(doc(db, 'studios', studioId, 'members', googleUser.uid), {
            uid: googleUser.uid,
            email: cleanGoogleEmail,
            displayName: ownerName,
            role: 'owner',
            membershipType: 'OWNER',
            status: 'active',
            isActive: true,
            joinedAt: now
          }, { merge: true })
        ]);
      } catch (err: any) {
        console.warn('[registerStudioWithOwner] Firestore write notice:', err?.message);
      }
    }

    // 7. Register in unifiedAuthService for seamless immediate session
    unifiedAuthService.provisionStudioOwner({
      authUid: googleUser.uid,
      studioId,
      studioName,
      ownerName,
      email: cleanGoogleEmail,
      mobile,
      username: cleanGoogleEmail,
      temporaryPassword: 'GoogleOAuthUser!2026'
    });

    const storedAcc = unifiedAuthService.findAccountByIdentifier(cleanGoogleEmail);
    if (storedAcc) {
      storedAcc.status = 'active';
      storedAcc.mustChangePassword = false;
      unifiedAuthService.saveAccount(storedAcc);
    }

    // Set browser session tokens
    if (storedAcc) {
      const session = unifiedAuthService.createSession(storedAcc);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('studio_os_session_token', session.token);
        localStorage.setItem('studio_os_user_role', 'owner');
        localStorage.setItem('studio_os_active_studio_id_v2', studioId);
      }
    } else if (typeof localStorage !== 'undefined') {
      const sessionToken = `g_sess_${googleUser.uid}_${Date.now()}`;
      localStorage.setItem('studio_os_session_token', sessionToken);
      localStorage.setItem('studio_os_user_role', 'owner');
      localStorage.setItem('studio_os_active_studio_id_v2', studioId);
    }

    platformAuditService.log({
      adminId: googleUser.uid,
      adminName: ownerName,
      action: 'COMPLETE_GOOGLE_STUDIO_REGISTRATION',
      targetType: 'studio',
      targetId: studioId,
      details: `Studio "${studioName}" created via Google OAuth by ${cleanGoogleEmail} (UID: ${googleUser.uid}).`
    });

    return { success: true, studioId };
  }

  // -------------------------------------------------------------
  // EMPLOYEE INVITATION & GOOGLE REGISTRATION
  // -------------------------------------------------------------

  async createEmployeeInvitation(
    studioId: string,
    employeeData: {
      fullName: string;
      email: string;
      roleId: string;
      roleName: string;
      department?: string;
      mobile?: string;
    },
    creatorName = 'Studio Owner'
  ): Promise<{ success: boolean; invitationLink: string; rawToken: string }> {
    const cleanEmail = this.normalizeEmail(employeeData.email);
    if (!this.isGmailOrValid(cleanEmail)) {
      throw new Error(`Invalid email address: "${employeeData.email}".`);
    }

    const studioProfile = TenantStore.get(studioId, 'profile') as unknown as Studio;
    const studioName = studioProfile?.name || 'Studio OS';

    const rawToken = generateRawInvitationToken();
    const tokenHash = await hashInvitationToken(rawToken);
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const invitationRecord: StudioInvitationRecord = {
      id: tokenHash,
      tokenHash,
      type: 'employee',
      email: cleanEmail,
      ownerName: employeeData.fullName,
      studioId,
      studioName,
      roleId: employeeData.roleId,
      roleName: employeeData.roleName,
      department: employeeData.department,
      mobile: employeeData.mobile,
      status: 'pending',
      expiresAt,
      createdAt: now
    };

    await this.saveInvitationRecord(invitationRecord);
    const invitationLink = `${this.getBaseUrl()}/#/signup?token=${rawToken}`;

    platformAuditService.log({
      adminId: 'studio_owner',
      adminName: creatorName,
      action: 'INVITE_EMPLOYEE_GOOGLE',
      targetType: 'employee',
      targetId: studioId,
      details: `Created Google invitation for employee "${employeeData.fullName}" (${cleanEmail}) at studio "${studioName}".`
    });

    return { success: true, invitationLink, rawToken };
  }

  async registerEmployeeWithGoogle(
    rawToken: string,
    googleUser: GoogleAuthUser
  ): Promise<{ success: boolean; studioId: string; error?: string }> {
    const val = await this.validateInvitationToken(rawToken);
    if (!val.valid || !val.invitation || val.invitation.type !== 'employee') {
      return { success: false, studioId: '', error: val.error || 'Employee invitation is invalid.' };
    }

    const cleanGoogleEmail = this.normalizeEmail(googleUser.email);
    const cleanInvitedEmail = this.normalizeEmail(val.invitation.email);

    if (cleanGoogleEmail !== cleanInvitedEmail) {
      return {
        success: false,
        studioId: '',
        error: `Identity mismatch: This invitation was issued for "${cleanInvitedEmail}", but you are signed in as "${cleanGoogleEmail}".`
      };
    }

    const studioId = val.invitation.studioId || '';
    const employeeId = `emp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const fullName = val.invitation.ownerName || googleUser.displayName || 'Crew Member';
    const now = new Date().toISOString();

    const newEmployee: Employee = {
      id: employeeId,
      studioId,
      userId: googleUser.uid,
      employeeNumber: `CREW-${Math.floor(100 + Math.random() * 900)}`,
      fullName,
      name: fullName,
      phone: val.invitation.mobile || '',
      email: cleanGoogleEmail,
      department: val.invitation.department || 'Photography',
      designation: val.invitation.roleName || 'Crew Member',
      roleId: val.invitation.roleId || 'photographer',
      roleName: val.invitation.roleName || 'Photographer',
      branchId: 'main',
      employmentStatus: 'active',
      dateOfJoining: now.split('T')[0],
      createdAt: now,
      updatedAt: now
    } as any;

    const employees = (TenantStore.get(studioId, 'employees') as Employee[]) || [];
    employees.unshift(newEmployee);
    TenantStore.set(studioId, 'employees', employees);

    // Mark invitation used
    val.invitation.status = 'used';
    val.invitation.usedAt = now;
    val.invitation.usedByUid = googleUser.uid;
    val.invitation.usedByEmail = cleanGoogleEmail;
    await this.saveInvitationRecord(val.invitation);

    // Save employee profile in TenantStore cache
    const cachedProfiles = (TenantStore.get('platform_system', 'user_profiles') as any[]) || [];
    cachedProfiles.push({
      uid: googleUser.uid,
      email: cleanGoogleEmail,
      displayName: fullName,
      role: val.invitation.roleId || 'photographer',
      accountType: 'EMPLOYEE',
      studioId,
      studioName: val.invitation.studioName,
      employeeId,
      designation: val.invitation.roleName || 'Crew Member',
      department: val.invitation.department || 'Photography',
      phone: val.invitation.mobile || '',
      portal: 'Employee',
      status: 'active',
      isActive: true,
      authProvider: 'google.com',
      createdAt: now,
      updatedAt: now
    });
    TenantStore.set('platform_system', 'user_profiles', cachedProfiles);

    // Firestore writes
    const isTest = typeof process !== 'undefined' && Boolean(process.env?.VITEST || process.env?.NODE_ENV === 'test');
    if (!isTest && db && !isAuthBypassed) {
      try {
        await Promise.allSettled([
          setDoc(doc(db, 'studios', studioId, 'employees', employeeId), { ...newEmployee, authUid: googleUser.uid }, { merge: true }),
          setDoc(doc(db, 'users', googleUser.uid), {
            uid: googleUser.uid,
            email: cleanGoogleEmail,
            displayName: fullName,
            photoURL: googleUser.photoURL || null,
            role: val.invitation.roleId || 'photographer',
            roleId: val.invitation.roleId || 'photographer',
            roleName: val.invitation.roleName || 'Photographer',
            accountType: 'EMPLOYEE',
            studioId,
            studioName: val.invitation.studioName,
            employeeId,
            designation: val.invitation.roleName || 'Crew Member',
            department: val.invitation.department || 'Photography',
            phone: val.invitation.mobile || '',
            portal: 'Employee',
            status: 'active',
            isActive: true,
            authProvider: 'google.com',
            createdAt: now,
            updatedAt: now
          }, { merge: true }),
          setDoc(doc(db, 'studios', studioId, 'members', googleUser.uid), {
            uid: googleUser.uid,
            email: cleanGoogleEmail,
            displayName: fullName,
            role: val.invitation.roleId || 'employee',
            membershipType: 'EMPLOYEE',
            employeeId,
            status: 'active',
            isActive: true,
            joinedAt: now
          }, { merge: true })
        ]);
      } catch (e: any) {
        console.warn('[registerEmployeeWithGoogle] Firestore notice:', e.message);
      }
    }

    unifiedAuthService.provisionEmployee({
      studioId,
      studioName: val.invitation.studioName || 'Studio OS',
      employeeName: fullName,
      employeeId,
      email: cleanGoogleEmail,
      mobile: val.invitation.mobile || '',
      username: cleanGoogleEmail,
      roleId: val.invitation.roleId || 'photographer',
      roleTitle: val.invitation.roleName || 'Photographer',
      initialPassword: 'GoogleOAuthCrew!2026'
    });

    const storedEmpAcc = unifiedAuthService.findAccountByIdentifier(cleanGoogleEmail);
    if (storedEmpAcc) {
      storedEmpAcc.status = 'active';
      unifiedAuthService.saveAccount(storedEmpAcc);
      const session = unifiedAuthService.createSession(storedEmpAcc);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('studio_os_session_token', session.token);
        localStorage.setItem('studio_os_user_role', 'employee');
        localStorage.setItem('studio_os_active_studio_id_v2', studioId);
        localStorage.setItem('studio_os_active_employee_id', employeeId);
      }
    } else if (typeof localStorage !== 'undefined') {
      const sessionToken = `g_emp_${googleUser.uid}_${Date.now()}`;
      localStorage.setItem('studio_os_session_token', sessionToken);
      localStorage.setItem('studio_os_user_role', 'employee');
      localStorage.setItem('studio_os_active_studio_id_v2', studioId);
      localStorage.setItem('studio_os_active_employee_id', employeeId);
    }

    return { success: true, studioId };
  }

  // -------------------------------------------------------------
  // ONE-TAP GOOGLE LOGIN (Common Login Page)
  // -------------------------------------------------------------

  async loginWithGoogle(mockUser?: GoogleAuthUser): Promise<{
    success: boolean;
    user?: GoogleAuthUser;
    role?: string;
    studioId?: string;
    targetRoute?: string;
    error?: string;
    needsRegistration?: boolean;
    invitationToken?: string;
  }> {
    let googleUser: GoogleAuthUser;

    const isTest = typeof process !== 'undefined' && Boolean(process.env?.VITEST || process.env?.NODE_ENV === 'test');

    if (mockUser) {
      googleUser = mockUser;
    } else if (isTest || isAuthBypassed || !auth) {
      googleUser = {
        uid: 'g_uid_test_user_123',
        email: 'jarsaniya.abhay@gmail.com',
        displayName: 'Abhay Jarsaniya'
      };
    } else {
      try {
        const result = await signInWithPopup(auth, googleProvider);
        if (!result.user || !result.user.email) {
          return { success: false, error: 'Google sign-in did not return a verified email address.' };
        }
        googleUser = {
          uid: result.user.uid,
          email: result.user.email,
          displayName: result.user.displayName,
          photoURL: result.user.photoURL
        };
      } catch (authErr: any) {
        console.error('[GoogleAuth] Popup error:', authErr);
        if (authErr?.code === 'auth/popup-closed-by-user') {
          return { success: false, error: 'Sign-in cancelled. Please continue with Google when ready.' };
        }
        return { success: false, error: authErr?.message || 'Failed to authenticate with Google.' };
      }
    }

    const cleanEmail = this.normalizeEmail(googleUser.email);

    // 1. Check Master Admin Authority
    if (MASTER_ADMIN_EMAILS.includes(cleanEmail)) {
      let masterAcc = unifiedAuthService.findAccountByIdentifier(cleanEmail);
      if (!masterAcc) {
        const allAccounts = unifiedAuthService.listStoredAccounts();
        masterAcc = allAccounts.find(
          a => a.accountType === 'MASTER_ADMIN' && 
          (a.email.toLowerCase() === cleanEmail || a.loginId.toLowerCase() === cleanEmail)
        );
      }
      if (!masterAcc) {
        masterAcc = {
          id: cleanEmail === 'jarsaniya.abhay@gmail.com' ? 'admin_master_abhay' : `admin_master_${Date.now()}`,
          accountType: 'MASTER_ADMIN',
          loginId: cleanEmail,
          email: cleanEmail,
          displayName: googleUser.displayName || 'Abhay Jarsaniya (Master Admin)',
          roleId: 'master_super_admin',
          roleTitle: 'Master Super Admin',
          status: 'active',
          passwordHash: 'GOOGLE_OAUTH_MASTER_ADMIN',
          salt: 'salt_master_oauth',
          mustChangePassword: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        unifiedAuthService.saveAccount(masterAcc);
      }

      masterAcc.lastLoginAt = new Date().toISOString();
      if (googleUser.displayName && (!masterAcc.displayName || masterAcc.displayName === 'Platform Master Owner')) {
        masterAcc.displayName = googleUser.displayName;
      }
      unifiedAuthService.saveAccount(masterAcc);

      const session = unifiedAuthService.createSession(masterAcc);
      const sessionToken = session.token;

      const storage = typeof window !== 'undefined' ? window.localStorage : (typeof globalThis !== 'undefined' ? (globalThis as any).localStorage : null);
      if (storage) {
        storage.setItem('studio_os_master_token', sessionToken);
        storage.setItem('studio_os_session_token', sessionToken);
        storage.setItem('studio_os_user_role', 'platform_master_admin');
        storage.removeItem('studio_os_active_studio_id_v2');
        storage.removeItem('studio_os_active_employee_id');
      }

      // Update current_master_admin in TenantStore
      TenantStore.set('global_platform_master', 'current_master_admin', {
        id: googleUser.uid || masterAcc.id,
        name: googleUser.displayName || masterAcc.displayName || 'Abhay Jarsaniya',
        email: cleanEmail,
        role: 'master_super_admin',
        permissions: [
          'view_studios',
          'manage_studios',
          'view_subscriptions',
          'manage_subscriptions',
          'manage_plans',
          'view_revenue',
          'record_payments',
          'manage_refunds',
          'manage_announcements',
          'manage_support',
          'manage_admins',
          'view_audit_logs',
          'manage_settings',
          'manage_global_rbac',
          'manage_features',
          'view_consolidated_reports'
        ],
        status: 'active',
        createdAt: masterAcc.createdAt
      });

      // Firestore persistence: write to /users/{uid} and /masterAdmins/{uid}
      if (!isTest && db && !isAuthBypassed && googleUser.uid) {
        try {
          const now = new Date().toISOString();
          await Promise.allSettled([
            setDoc(doc(db, 'users', googleUser.uid), {
              uid: googleUser.uid,
              email: cleanEmail,
              displayName: googleUser.displayName || 'Abhay Jarsaniya',
              photoURL: googleUser.photoURL || null,
              role: 'platform_master_admin',
              accountType: 'MASTER_ADMIN',
              portal: 'Master Admin',
              status: 'active',
              isActive: true,
              authProvider: 'google.com',
              updatedAt: now
            }, { merge: true }),
            setDoc(doc(db, 'masterAdmins', googleUser.uid), {
              uid: googleUser.uid,
              email: cleanEmail,
              displayName: googleUser.displayName || 'Abhay Jarsaniya',
              role: 'master_super_admin',
              accountType: 'MASTER_ADMIN',
              status: 'active',
              isActive: true,
              authProvider: 'google.com',
              updatedAt: now
            }, { merge: true })
          ]);
        } catch (e: any) {
          console.warn('[loginWithGoogle] Master Admin Firestore write notice:', e.message);
        }
      }

      return {
        success: true,
        user: googleUser,
        role: 'platform_master_admin',
        targetRoute: '#/master/dashboard'
      };
    }

    // 2. Check if user profile already exists in Firestore `/users/{uid}`
    let userProfile: any = null;
    if (!isTest && db && !isAuthBypassed) {
      try {
        const uSnap = await getDoc(doc(db, 'users', googleUser.uid));
        if (uSnap.exists()) {
          userProfile = uSnap.data();
        } else {
          // Fallback query by email if account was previously created with email/password
          const q = query(collection(db, 'users'), where('email', '==', cleanEmail));
          const qSnap = await getDocs(q);
          if (!qSnap.empty) {
            userProfile = qSnap.docs[0].data();
            // Link UID to this document
            await setDoc(doc(db, 'users', googleUser.uid), {
              ...userProfile,
              uid: googleUser.uid,
              authProvider: 'google.com',
              updatedAt: new Date().toISOString()
            }, { merge: true });
          }
        }
      } catch (err: any) {
        console.warn('[loginWithGoogle] Firestore lookup notice:', err.message);
      }
    }

    // Check TenantStore cachedProfiles
    if (!userProfile) {
      const cachedProfiles = (TenantStore.get('platform_system', 'user_profiles') as any[]) || [];
      const matchCached = cachedProfiles.find(p => p.uid === googleUser.uid || p.email.toLowerCase() === cleanEmail);
      if (matchCached) {
        userProfile = matchCached;
      }
    }

    // Check TenantStore fallback or migration mapping
    if (!userProfile) {
      const allStudios = platformStudioService.listStudios();
      const matchedStudio = allStudios.find(s => 
        s.ownerEmail?.toLowerCase() === cleanEmail || (s as any).email?.toLowerCase() === cleanEmail
      );
      if (matchedStudio) {
        userProfile = {
          uid: googleUser.uid,
          email: cleanEmail,
          displayName: matchedStudio.ownerName || matchedStudio.name,
          role: 'studio_owner',
          accountType: 'STUDIO_OWNER',
          studioId: matchedStudio.id,
          studioName: matchedStudio.name,
          status: 'active'
        };
      }
    }

    // Check Employee match across studios
    if (!userProfile) {
      const allStudios = platformStudioService.listStudios();
      for (const st of allStudios) {
        const emps = (TenantStore.get(st.id, 'employees') as Employee[]) || [];
        const emp = emps.find(e => this.normalizeEmail(e.email) === cleanEmail);
        if (emp) {
          userProfile = {
            uid: googleUser.uid,
            email: cleanEmail,
            displayName: emp.fullName,
            role: emp.roleId || 'photographer',
            accountType: 'EMPLOYEE',
            studioId: st.id,
            studioName: st.name,
            employeeId: emp.id,
            status: emp.employmentStatus === 'inactive' ? 'inactive' : 'active'
          };
          break;
        }
      }
    }

    // 3. If User Profile exists, check authorization & status
    if (userProfile) {
      // Check if Master Admin disabled this authorized email or restricted Google Sign-In
      const allAuth = await this.listAuthorizedEmails();
      const authRecord = allAuth.find(a => a.email.toLowerCase() === cleanEmail);
      if (authRecord && authRecord.status === 'disabled') {
        return {
          success: false,
          error: 'Your account is currently inactive. Please contact the platform administrator to reactivate your access.'
        };
      }

      if (authRecord && authRecord.allowGoogleLogin === false) {
        return {
          success: false,
          error: 'Google Sign-In has not been enabled for this email by the platform administrator. Please sign in with your email and password or contact your administrator.'
        };
      }

      if (userProfile.status === 'inactive' || userProfile.status === 'disabled') {
        return {
          success: false,
          error: 'Your account is currently inactive. Please contact the platform administrator to reactivate your access.'
        };
      }

      const studioId = userProfile.studioId || '';
      const isOwner = userProfile.role === 'studio_owner' || userProfile.accountType === 'STUDIO_OWNER';
      const role = isOwner ? 'owner' : 'employee';
      const targetRoute = isOwner ? '#/app/dashboard' : '#/employee/dashboard';

      // Ensure account in unifiedAuthService
      let userAcc = unifiedAuthService.findAccountByIdentifier(cleanEmail);
      if (!userAcc && isOwner) {
        userAcc = unifiedAuthService.provisionStudioOwner({
          authUid: googleUser.uid,
          studioId,
          studioName: userProfile.studioName || 'Studio OS',
          ownerName: userProfile.displayName || 'Studio Owner',
          email: cleanEmail,
          mobile: userProfile.phone || '9876543210',
          username: cleanEmail,
          temporaryPassword: 'GoogleOAuth2026!'
        }).account;
      }
      if (!userAcc && !isOwner) {
        userAcc = unifiedAuthService.provisionEmployee({
          studioId,
          studioName: userProfile.studioName || 'Studio OS',
          employeeName: userProfile.displayName || 'Crew Member',
          employeeId: userProfile.employeeId || `emp_${Date.now()}`,
          email: cleanEmail,
          mobile: userProfile.phone || '',
          username: cleanEmail,
          roleId: userProfile.role || 'photographer',
          roleTitle: userProfile.designation || 'Photographer',
          initialPassword: 'GoogleOAuthCrew!2026'
        }).account;
      }

      if (userAcc) {
        userAcc.status = 'active';
        unifiedAuthService.saveAccount(userAcc);
      }

      const session = userAcc ? unifiedAuthService.createSession(userAcc) : null;
      const sessionToken = session?.token || `g_sess_${googleUser.uid}_${Date.now()}`;

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('studio_os_session_token', sessionToken);
        localStorage.setItem('studio_os_user_role', role);
        if (studioId) {
          localStorage.setItem('studio_os_active_studio_id_v2', studioId);
        }
      }

      if (authRecord) {
        authRecord.lastLoginAt = new Date().toISOString();
        this.saveOrUpdateAuthorizedEmail(authRecord);
      }

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('studio_os_auth_changed'));
        window.dispatchEvent(new CustomEvent('studio_data_updated', { detail: { studioId } }));
      }

      return {
        success: true,
        user: googleUser,
        role,
        studioId,
        targetRoute
      };
    }

    // 4. User is NOT yet registered. Check if email is in `authorizedStudioEmails`
    const allAuth = await this.listAuthorizedEmails();
    const authorized = allAuth.find(a => a.email.toLowerCase() === cleanEmail);

    if (authorized) {
      if (authorized.status === 'disabled') {
        return {
          success: false,
          error: 'Your account is currently inactive. Please contact the platform administrator to reactivate your access.'
        };
      }

      if (authorized.allowGoogleLogin === false) {
        return {
          success: false,
          error: 'Google Sign-In has not been enabled for this email by the platform administrator. Please sign in with your email and password or contact your administrator.'
        };
      }

      // Authorized, but needs to complete one-time registration
      return {
        success: false,
        needsRegistration: true,
        user: googleUser,
        error: `Welcome ${googleUser.displayName || cleanEmail}! Your email is authorized, but you haven't completed your studio setup yet. Please use your registration invitation link or contact Master Admin.`
      };
    }

    // 5. Arbitrary Google account: Reject access cleanly
    return {
      success: false,
      error: `This Google account (${cleanEmail}) is not authorized to access Studio OS. Please contact Master Admin or your Studio Administrator for an invitation link.`
    };
  }

  // -------------------------------------------------------------
  // EMAIL + PASSWORD LOGIN (Common Login Page)
  // -------------------------------------------------------------

  async loginWithPassword(email: string, password: string): Promise<{
    success: boolean;
    role?: string;
    studioId?: string;
    targetRoute?: string;
    error?: string;
  }> {
    const cleanEmail = this.normalizeEmail(email);
    if (!cleanEmail || !password) {
      return { success: false, error: 'Please enter both your email address and password.' };
    }

    // 1. Check Master Admin Credentials
    if (MASTER_ADMIN_EMAILS.includes(cleanEmail)) {
      const res = unifiedAuthService.loginMasterAdmin(cleanEmail, password);
      if (res.success && res.session) {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('studio_os_master_token', res.session.token);
          localStorage.setItem('studio_os_session_token', res.session.token);
          localStorage.setItem('studio_os_user_role', 'platform_master_admin');
          localStorage.removeItem('studio_os_active_studio_id_v2');
          localStorage.removeItem('studio_os_active_employee_id');
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('studio_os_auth_changed'));
          window.dispatchEvent(new Event('studio_data_updated'));
        }
        return {
          success: true,
          role: 'platform_master_admin',
          targetRoute: '#/master/dashboard'
        };
      }
      return { success: false, error: res.error || 'Invalid Master Admin credentials.' };
    }

    // 2. Check Authorization & Password Method Policy
    const allAuth = await this.listAuthorizedEmails();
    const authRecord = allAuth.find(a => a.email.toLowerCase() === cleanEmail);

    if (authRecord) {
      if (authRecord.status === 'disabled') {
        return {
          success: false,
          error: 'Your account is currently inactive. Please contact the platform administrator to reactivate your access.'
        };
      }

      if (authRecord.allowPasswordLogin === false) {
        return {
          success: false,
          error: 'Password login has been disabled for this account by the platform administrator. Please use Google Sign-In or contact your administrator.'
        };
      }
    }

    // 3. Try Firebase Auth (if online & enabled)
    const isTest = typeof process !== 'undefined' && Boolean(process.env?.VITEST || process.env?.NODE_ENV === 'test');
    if (!isTest && auth && !isAuthBypassed) {
      try {
        await signInWithEmailAndPassword(auth, cleanEmail, password);
      } catch (fbErr: any) {
        console.warn('[loginWithPassword] Firebase auth attempt:', fbErr?.code || fbErr?.message);
      }
    }

    // 4. Authenticate against Unified Auth Service
    const authRes = unifiedAuthService.login(cleanEmail, password);
    if (!authRes.success || !authRes.session) {
      return { success: false, error: authRes.error || 'Invalid email or password.' };
    }

    const session = authRes.session;
    const isOwner = session.account.accountType === 'STUDIO_OWNER';
    const role = isOwner ? 'owner' : 'employee';
    const studioId = session.account.studioId || '';
    const targetRoute = isOwner ? '#/app/dashboard' : '#/employee/dashboard';

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('studio_os_session_token', session.token);
      localStorage.setItem('studio_os_user_role', role);
      if (studioId) {
        localStorage.setItem('studio_os_active_studio_id_v2', studioId);
      }
    }

    if (authRecord) {
      authRecord.lastLoginAt = new Date().toISOString();
      await this.saveOrUpdateAuthorizedEmail(authRecord);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('studio_os_auth_changed'));
      window.dispatchEvent(new CustomEvent('studio_data_updated', { detail: { studioId } }));
    }

    return {
      success: true,
      role,
      studioId,
      targetRoute
    };
  }

  async logout(): Promise<void> {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('studio_os_session_token');
      localStorage.removeItem('studio_os_master_token');
      localStorage.removeItem('studio_os_user_role');
      localStorage.removeItem('studio_os_active_studio_id_v2');
    }
    if (auth && !isAuthBypassed) {
      try {
        await signOut(auth);
      } catch (e) {
        // Continue safely
      }
    }
  }
}

export const googleAuthInvitationService = new GoogleAuthInvitationService();
