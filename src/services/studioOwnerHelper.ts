import { auth } from '../lib/firebase';
import { unifiedAuthService } from './unifiedAuthService';
import { PROVISIONED_PORTAL_ACCOUNTS } from './portalAccountProvisionService';
import { TenantStore } from './tenantStore';
import { Employee, Membership } from '../types/schema';

export interface StudioOwnerProfile {
  id: string;
  uid: string;
  name: string;
  displayName: string;
  fullName: string; // e.g. "Abhay (Studio Owner)"
  email: string;
  phone: string;
  designation: string;
  department: string;
  roleId: string;
  roleName: string;
  isStudioOwner: true;
}

let inMemoryOwnerOverride: Partial<StudioOwnerProfile> | null = null;

/**
 * Configure or override Studio Owner profile dynamically (useful for tests or custom session bootstrapping)
 */
export function setDynamicStudioOwner(profile: Partial<StudioOwnerProfile> | null): void {
  inMemoryOwnerOverride = profile;
}

/**
 * Clean any existing "(Studio Owner)" suffixes to prevent duplicate appending
 */
export function sanitizeOwnerName(rawName?: string | null): string {
  if (!rawName) return 'Abhay';
  return rawName.replace(/\s*\((Studio\s*Owner|Owner)\)/gi, '').trim() || 'Abhay';
}

/**
 * Format Studio Owner display name: e.g. "Abhay (Studio Owner)"
 */
export function formatOwnerCrewDisplayName(rawName?: string | null): string {
  const clean = sanitizeOwnerName(rawName);
  return `${clean} (Studio Owner)`;
}

/**
 * Dynamically resolve the Studio Owner's actual profile details
 * Sources in priority:
 * 1. Explicit dynamic override
 * 2. Active Firebase Auth user (auth.currentUser)
 * 3. LocalStorage active session identifiers
 * 4. UnifiedAuthService active Studio Owner session
 * 5. Studio Members roster (role === 'owner')
 * 6. Provisioned Portal Accounts manifest
 * 7. Default fallback: 'Abhay'
 */
export function getStudioOwnerProfile(studioId: string = 'studio_shreeji_films'): StudioOwnerProfile {
  // 1. Explicit in-memory override
  if (inMemoryOwnerOverride?.name || inMemoryOwnerOverride?.id) {
    const rawName = inMemoryOwnerOverride.name || inMemoryOwnerOverride.displayName || 'Abhay';
    const cleanName = sanitizeOwnerName(rawName);
    const ownerId = inMemoryOwnerOverride.id || inMemoryOwnerOverride.uid || '9NJ9xM4Aradq2gqW7ySTHLLdDin2';
    return {
      id: ownerId,
      uid: ownerId,
      name: cleanName,
      displayName: cleanName,
      fullName: formatOwnerCrewDisplayName(cleanName),
      email: inMemoryOwnerOverride.email || 'owner@shreejifilms.in',
      phone: inMemoryOwnerOverride.phone || '+91 98250 20000',
      designation: inMemoryOwnerOverride.designation || 'Studio Owner',
      department: inMemoryOwnerOverride.department || 'Management',
      roleId: 'studio_owner',
      roleName: 'Studio Owner',
      isStudioOwner: true
    };
  }

  let resolvedName: string | null = null;
  let resolvedUid: string | null = null;
  let resolvedEmail: string | null = null;
  let resolvedPhone: string | null = null;

  // 2. Active Firebase Auth User
  try {
    if (auth && auth.currentUser) {
      if (auth.currentUser.displayName) {
        resolvedName = auth.currentUser.displayName;
      }
      if (auth.currentUser.uid) {
        resolvedUid = auth.currentUser.uid;
      }
      if (auth.currentUser.email) {
        resolvedEmail = auth.currentUser.email;
      }
      if (auth.currentUser.phoneNumber) {
        resolvedPhone = auth.currentUser.phoneNumber;
      }
    }
  } catch {
    // Non-browser / test environment fallback
  }

  // 3. LocalStorage Keys
  try {
    const storage = typeof localStorage !== 'undefined' ? localStorage : (typeof window !== 'undefined' ? window.localStorage : null);
    if (storage) {
      const storedName = storage.getItem('studio_os_owner_name') || storage.getItem('studio_os_user_name');
      const storedUid = storage.getItem('studio_os_owner_uid') || storage.getItem('studio_os_user_uid');
      const storedEmail = storage.getItem('studio_os_owner_email') || storage.getItem('studio_os_user_email');
      const storedPhone = storage.getItem('studio_os_owner_phone') || storage.getItem('studio_os_user_phone');

      if (!resolvedName && storedName) resolvedName = storedName;
      if (!resolvedUid && storedUid) resolvedUid = storedUid;
      if (!resolvedEmail && storedEmail) resolvedEmail = storedEmail;
      if (!resolvedPhone && storedPhone) resolvedPhone = storedPhone;
    }
  } catch {
    // LocalStorage unavailable
  }

  // 4. UnifiedAuthService Active Session
  try {
    const ownerSession = unifiedAuthService.getStudioOwnerSession();
    if (ownerSession?.account) {
      if (!resolvedName && ownerSession.account.displayName) {
        resolvedName = ownerSession.account.displayName;
      }
      if (!resolvedUid && ownerSession.account.id) {
        resolvedUid = ownerSession.account.id;
      }
      if (!resolvedEmail && ownerSession.account.email) {
        resolvedEmail = ownerSession.account.email;
      }
      if (!resolvedPhone && ownerSession.account.phone) {
        resolvedPhone = ownerSession.account.phone;
      }
    }
  } catch {
    // unifiedAuthService note
  }

  // 5. Studio Members Roster
  try {
    const members = TenantStore.get<Membership>(studioId, 'members') || [];
    const ownerMember = members.find(m => m.role === 'owner' || (m.roleIds && m.roleIds.includes('owner')));
    if (ownerMember) {
      if (!resolvedName && ownerMember.displayName) resolvedName = ownerMember.displayName;
      if (!resolvedUid && (ownerMember.userId || ownerMember.id)) resolvedUid = ownerMember.userId || ownerMember.id;
      if (!resolvedEmail && ownerMember.email) resolvedEmail = ownerMember.email;
      if (!resolvedPhone && ownerMember.phone) resolvedPhone = ownerMember.phone;
    }
  } catch {
    // TenantStore note
  }

  // 6. Provisioned Portal Accounts
  const provisionedOwner = PROVISIONED_PORTAL_ACCOUNTS.find(a => a.accountType === 'STUDIO_OWNER');
  if (provisionedOwner) {
    if (!resolvedUid) resolvedUid = provisionedOwner.uid;
    if (!resolvedEmail) resolvedEmail = provisionedOwner.email;
    // Note: If resolvedName is not set from active session/auth, check if provisioned has a name
    if (!resolvedName) resolvedName = provisionedOwner.displayName;
  }

  // 7. Dynamic Default Fallback
  const cleanName = sanitizeOwnerName(resolvedName || 'Abhay');
  const finalUid = resolvedUid || '9NJ9xM4Aradq2gqW7ySTHLLdDin2';

  return {
    id: finalUid,
    uid: finalUid,
    name: cleanName,
    displayName: cleanName,
    fullName: formatOwnerCrewDisplayName(cleanName),
    email: resolvedEmail || 'owner@shreejifilms.in',
    phone: resolvedPhone || '+91 98250 20000',
    designation: 'Studio Owner',
    department: 'Management',
    roleId: 'studio_owner',
    roleName: 'Studio Owner',
    isStudioOwner: true
  };
}

/**
 * Returns an Employee representation of the Studio Owner to prepend to crew rosters
 */
export function getStudioOwnerCrewMember(studioId: string = 'studio_shreeji_films'): Employee {
  const profile = getStudioOwnerProfile(studioId);

  return {
    id: profile.id,
    studioId,
    userId: profile.id,
    employeeNumber: 'OWNER-001',
    fullName: profile.fullName,
    phone: profile.phone,
    email: profile.email,
    joiningDate: '2020-01-01',
    department: 'Management',
    designation: 'Studio Owner',
    roleId: 'studio_owner',
    roleName: 'Studio Owner',
    employmentStatus: 'active',
    createdAt: '2020-01-01T00:00:00Z',
    updatedAt: new Date().toISOString(),
    isStudioOwner: true,
    rawOwnerName: profile.name
  } as unknown as Employee;
}

/**
 * Check if a given employee ID belongs to the Studio Owner
 */
export function isStudioOwnerId(employeeId: string, studioId: string = 'studio_shreeji_films'): boolean {
  if (!employeeId) return false;
  const owner = getStudioOwnerProfile(studioId);
  return (
    employeeId === owner.id ||
    employeeId === owner.uid ||
    employeeId === '9NJ9xM4Aradq2gqW7ySTHLLdDin2' ||
    employeeId.startsWith('usr_owner_')
  );
}
