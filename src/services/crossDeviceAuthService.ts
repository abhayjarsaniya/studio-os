import { auth, db, isAuthBypassed } from '../lib/firebase';
import { 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  collection, 
  query, 
  where 
} from 'firebase/firestore';
import { signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { unifiedAuthService, hashCredential, generateCryptoSalt, UserAccount, UserSession } from './unifiedAuthService';
import { TenantStore } from './tenantStore';
import { rateLimitService } from './rateLimitService';
import { Studio } from '../types/schema';

const API_KEY = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_API_KEY) || 'AIzaSyBdN6SpgPVAVD6JPEHbnfa_I2wM6BEodhk';
const AUTH_REST_URL = 'https://identitytoolkit.googleapis.com/v1';

export interface AccountRegistryEntry {
  loginId: string;
  email: string;
  authUid: string;
  accountType: 'MASTER_ADMIN' | 'STUDIO_OWNER' | 'EMPLOYEE' | 'EXTERNAL_SUPPLIER';
  role: string;
  roleTitle: string;
  studioId?: string;
  studioName?: string;
  ownerName?: string;
  displayName: string;
  phone?: string;
  status: 'active' | 'deactivated' | 'suspended';
  passwordHash: string;
  salt: string;
  mustChangePassword?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CrossDeviceLoginResult {
  success: boolean;
  role?: string;
  studioId?: string;
  targetRoute?: string;
  session?: UserSession;
  error?: string;
}

export class CrossDeviceAuthService {
  private normalize(val: string): string {
    return (val || '').trim().toLowerCase();
  }

  /**
   * Save or update an account in the central Firestore Account Registry
   * ensuring cross-device access from any laptop, mobile, or incognito browser.
   */
  async registerInCloudRegistry(
    account: UserAccount,
    authUid?: string,
    plainPassword?: string
  ): Promise<void> {
    const isTestRunner = typeof process !== 'undefined' && Boolean(process.env?.VITEST || process.env?.NODE_ENV === 'test');
    const cleanLoginId = this.normalize(account.loginId);
    const cleanEmail = this.normalize(account.email);
    const uid = authUid || account.id;

    const registryRecord: AccountRegistryEntry = {
      loginId: cleanLoginId,
      email: cleanEmail,
      authUid: uid,
      accountType: account.accountType,
      role: account.accountType === 'STUDIO_OWNER' ? 'owner' : (account.accountType === 'MASTER_ADMIN' ? 'platform_master_admin' : 'employee'),
      roleTitle: account.roleTitle || 'Studio Member',
      studioId: account.studioId,
      studioName: account.studioName,
      ownerName: account.displayName,
      displayName: account.displayName,
      phone: account.phone,
      status: account.status || 'active',
      passwordHash: account.passwordHash,
      salt: account.salt,
      mustChangePassword: account.mustChangePassword || false,
      createdAt: account.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Save in unifiedAuthService (local cache)
    unifiedAuthService.saveAccount(account);

    // Save in Firestore centralized collections
    if (!isTestRunner && db) {
      try {
        const batchWrites = [
          setDoc(doc(db, 'accountRegistry', cleanLoginId), registryRecord, { merge: true }),
          setDoc(doc(db, 'accountRegistry', cleanEmail), registryRecord, { merge: true })
        ];

        if (uid) {
          batchWrites.push(
            setDoc(doc(db, 'users', uid), {
              uid,
              loginId: cleanLoginId,
              email: cleanEmail,
              displayName: account.displayName,
              role: registryRecord.role,
              accountType: account.accountType,
              studioId: account.studioId || null,
              studioName: account.studioName || null,
              phone: account.phone || null,
              status: account.status || 'active',
              isActive: account.status === 'active',
              updatedAt: new Date().toISOString()
            }, { merge: true })
          );
        }

        await Promise.allSettled(batchWrites);
      } catch (err: any) {
        console.warn('[CrossDeviceAuth] Registry cloud write note:', err?.message);
      }
    }

    // Sync password to Firebase Auth if plainPassword provided
    if (plainPassword && !isTestRunner) {
      try {
        await fetch(`${AUTH_REST_URL}/accounts:update?key=${API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: cleanEmail,
            password: plainPassword,
            returnSecureToken: false
          })
        });
      } catch {
        // Safe continuation
      }
    }
  }

  /**
   * Update status of all accounts belonging to a studio in the central Firestore Account Registry
   */
  async updateStudioAccountStatus(
    studioId: string,
    status: 'active' | 'deactivated' | 'suspended'
  ): Promise<void> {
    const isTestRunner = typeof process !== 'undefined' && Boolean(process.env?.VITEST || process.env?.NODE_ENV === 'test');
    
    // Update local accounts
    const accounts = ((unifiedAuthService as any).listStoredAccounts?.() as UserAccount[] || []).filter(a => a.studioId === studioId);
    accounts.forEach(acc => {
      acc.status = status;
      unifiedAuthService.saveAccount(acc);
    });

    if (!isTestRunner && db) {
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('studioId', '==', studioId));
        const snap = await getDocs(q);
        const updates: Promise<any>[] = [];
        snap.forEach(d => {
          const u = d.data();
          updates.push(setDoc(doc(db, 'users', d.id), { status, isActive: status === 'active', updatedAt: new Date().toISOString() }, { merge: true }));
          if (u.loginId) {
            updates.push(setDoc(doc(db, 'accountRegistry', this.normalize(u.loginId)), { status, updatedAt: new Date().toISOString() }, { merge: true }));
          }
          if (u.email) {
            updates.push(setDoc(doc(db, 'accountRegistry', this.normalize(u.email)), { status, updatedAt: new Date().toISOString() }, { merge: true }));
          }
        });
        await Promise.allSettled(updates);
      } catch (err: any) {
        console.warn('[CrossDeviceAuth] Studio status update notice:', err?.message);
      }
    }
  }

  /**
   * Universal Cross-Device Login:
   * Works on any new phone, tablet, laptop, or private/incognito window
   * with ZERO cached local storage.
   */
  async login(
    loginIdOrEmail: string,
    passwordPlain: string
  ): Promise<CrossDeviceLoginResult> {
    const cleanId = this.normalize(loginIdOrEmail);
    if (!cleanId || !passwordPlain) {
      return { success: false, error: 'Please enter both your Login ID and password.' };
    }

    // Check rate limiting
    const rl = rateLimitService.checkRateLimit(cleanId);
    if (!rl.allowed) {
      return { success: false, error: rl.message };
    }

    const isTestRunner = typeof process !== 'undefined' && Boolean(process.env?.VITEST || process.env?.NODE_ENV === 'test');

    // 1. MASTER ADMIN SPECIAL CASE (Strictly jarsaniya.abhay@gmail.com in production)
    const masterEmails = ['jarsaniya.abhay@gmail.com'];
    if (isTestRunner) masterEmails.push('admin@studio-os.com', 'masteradmin@studioos.internal');

    if (masterEmails.includes(cleanId)) {
      const res = unifiedAuthService.loginMasterAdmin(cleanId, passwordPlain);
      if (res.success && res.session) {
        rateLimitService.resetAttempts(cleanId);
        this.persistSession(res.session.token, 'platform_master_admin', undefined, res.session.account);
        return {
          success: true,
          role: 'platform_master_admin',
          targetRoute: '#/master/dashboard',
          session: res.session
        };
      }
      rateLimitService.recordFailedAttempt(cleanId);
      return { success: false, error: res.error || 'Invalid Master Admin credentials.' };
    }

    // 2. QUERY CENTRAL FIRESTORE ACCOUNT REGISTRY
    let registryEntry: AccountRegistryEntry | null = null;

    if (!isTestRunner && db) {
      try {
        // Direct lookup by cleanId (loginId or email)
        const docSnap = await getDoc(doc(db, 'accountRegistry', cleanId));
        if (docSnap.exists()) {
          registryEntry = docSnap.data() as AccountRegistryEntry;
        } else {
          // Fallback query across users collection
          const usersRef = collection(db, 'users');
          const q = query(usersRef, where('loginId', '==', cleanId));
          const querySnap = await getDocs(q);
          if (!querySnap.empty) {
            const uData = querySnap.docs[0].data();
            registryEntry = {
              loginId: uData.loginId || cleanId,
              email: uData.email || `${cleanId}@studio-os.internal`,
              authUid: querySnap.docs[0].id,
              accountType: uData.accountType || (uData.role === 'studio_owner' ? 'STUDIO_OWNER' : 'EMPLOYEE'),
              role: uData.role === 'studio_owner' ? 'owner' : (uData.role || 'employee'),
              roleTitle: uData.roleTitle || 'Studio Member',
              studioId: uData.studioId,
              studioName: uData.studioName,
              displayName: uData.displayName || cleanId,
              status: uData.status || (uData.isActive === false ? 'deactivated' : 'active'),
              passwordHash: uData.passwordHash || '',
              salt: uData.salt || '',
              createdAt: uData.createdAt || new Date().toISOString(),
              updatedAt: uData.updatedAt || new Date().toISOString()
            };
          }
        }
      } catch (err: any) {
        console.warn('[CrossDeviceAuth] Cloud registry lookup notice:', err?.message);
      }
    }

    // Fallback to local accounts if Firestore offline or in test runner
    if (!registryEntry) {
      const localAcc = unifiedAuthService.findAccountByIdentifier(cleanId);
      if (localAcc) {
        registryEntry = {
          loginId: localAcc.loginId,
          email: localAcc.email,
          authUid: (localAcc as any).authUid || localAcc.id,
          accountType: localAcc.accountType,
          role: localAcc.accountType === 'STUDIO_OWNER' ? 'owner' : 'employee',
          roleTitle: localAcc.roleTitle,
          studioId: localAcc.studioId,
          studioName: localAcc.studioName,
          displayName: localAcc.displayName,
          phone: localAcc.phone,
          status: localAcc.status,
          passwordHash: localAcc.passwordHash,
          salt: localAcc.salt,
          mustChangePassword: localAcc.mustChangePassword,
          createdAt: localAcc.createdAt,
          updatedAt: localAcc.updatedAt
        };
      }
    }

    if (!registryEntry) {
      rateLimitService.recordFailedAttempt(cleanId);
      return { success: false, error: 'Invalid Login ID or password.' };
    }

    // 3. CHECK DEACTIVATION / SUSPENSION STATUS
    if (registryEntry.status !== 'active') {
      rateLimitService.recordFailedAttempt(cleanId);
      return { 
        success: false, 
        error: `Account is ${registryEntry.status}. Access has been disabled by Platform Admin.` 
      };
    }

    // 4. VERIFY CREDENTIALS
    let isPasswordValid = false;
    let authUid = registryEntry.authUid;

    // A. Check Firebase Auth REST API (Authenticates on real Google backend)
    if (!isTestRunner && registryEntry.email) {
      try {
        const authResponse = await fetch(`${AUTH_REST_URL}/accounts:signInWithPassword?key=${API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: registryEntry.email,
            password: passwordPlain,
            returnSecureToken: true
          })
        });

        const authData = await authResponse.json();
        if (authResponse.ok && authData.localId) {
          isPasswordValid = true;
          authUid = authData.localId;
          // Also sign in SDK if browser
          if (auth && !isAuthBypassed) {
            try {
              await signInWithEmailAndPassword(auth, registryEntry.email, passwordPlain);
            } catch {}
          }
        }
      } catch (e: any) {
        console.warn('[CrossDeviceAuth] Firebase Auth REST notice:', e.message);
      }
    }

    // B. Check Salted Cryptographic Hash Fallback
    if (!isPasswordValid && registryEntry.passwordHash && registryEntry.salt) {
      const computedHash = hashCredential(passwordPlain, registryEntry.salt);
      if (computedHash === registryEntry.passwordHash) {
        isPasswordValid = true;
      }
    }

    if (!isPasswordValid) {
      rateLimitService.recordFailedAttempt(cleanId);
      return { success: false, error: 'Invalid Login ID or password.' };
    }

    // Reset rate limit attempts upon successful authentication
    rateLimitService.resetAttempts(cleanId);

    // 5. HYDRATE MULTI-TENANT STUDIO DATA ON THIS DEVICE
    const studioId = registryEntry.studioId || '';
    if (studioId && !isTestRunner && db) {
      try {
        // Fetch studio document from Firestore
        const studioSnap = await getDoc(doc(db, 'studios', studioId, 'profile', studioId));
        if (studioSnap.exists()) {
          const studioData = studioSnap.data() as Studio;
          TenantStore.set(studioId, 'profile', studioData);
        } else {
          const rootStudioSnap = await getDoc(doc(db, 'studios', studioId));
          if (rootStudioSnap.exists()) {
            TenantStore.set(studioId, 'profile', rootStudioSnap.data() as Studio);
          }
        }
      } catch (e: any) {
        console.warn('[CrossDeviceAuth] Studio hydration notice:', e.message);
      }
    }

    // 6. BUILD SESSION & PERSIST
    const isOwner = registryEntry.accountType === 'STUDIO_OWNER';
    const role = isOwner ? 'owner' : 'employee';
    const targetRoute = isOwner ? '#/app/dashboard' : '#/employee/dashboard';

    const accountObj: UserAccount = {
      id: registryEntry.authUid || `usr_${cleanId}`,
      accountType: registryEntry.accountType,
      loginId: registryEntry.loginId,
      email: registryEntry.email,
      phone: registryEntry.phone,
      displayName: registryEntry.displayName,
      studioId: registryEntry.studioId,
      studioName: registryEntry.studioName,
      roleId: role,
      roleTitle: registryEntry.roleTitle,
      status: registryEntry.status,
      passwordHash: registryEntry.passwordHash,
      salt: registryEntry.salt,
      mustChangePassword: registryEntry.mustChangePassword || false,
      createdAt: registryEntry.createdAt,
      updatedAt: registryEntry.updatedAt
    };

    // Save into local unifiedAuth store so subsequent local checks pass
    unifiedAuthService.saveAccount(accountObj);

    const token = `tok_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const session: UserSession = {
      token,
      account: accountObj,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    };

    this.persistSession(token, role, studioId, accountObj);

    return {
      success: true,
      role,
      studioId,
      targetRoute,
      session
    };
  }

  private persistSession(token: string, role: string, studioId?: string, account?: any): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('studio_os_session_token', token);
      localStorage.setItem('studio_os_user_role', role);
      if (role === 'platform_master_admin') {
        localStorage.setItem('studio_os_master_token', token);
        localStorage.removeItem('studio_os_active_studio_id_v2');
      } else if (studioId) {
        localStorage.setItem('studio_os_active_studio_id_v2', studioId);
      }

      if (account) {
        localStorage.setItem('studio_os_user_display_name', account.displayName || '');
        localStorage.setItem('studio_os_user_email', account.email || '');
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('studio_os_auth_changed'));
      window.dispatchEvent(new CustomEvent('studio_data_updated', { detail: { studioId } }));
    }
  }

  async logout(): Promise<void> {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('studio_os_session_token');
      localStorage.removeItem('studio_os_master_token');
      localStorage.removeItem('studio_os_user_role');
      localStorage.removeItem('studio_os_active_studio_id_v2');
      localStorage.removeItem('studio_os_user_display_name');
      localStorage.removeItem('studio_os_user_email');
    }

    if (auth && !isAuthBypassed) {
      try {
        await signOut(auth);
      } catch {}
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('studio_os_auth_changed'));
      window.dispatchEvent(new Event('studio_data_updated'));
    }
  }
}

export const crossDeviceAuthService = new CrossDeviceAuthService();
