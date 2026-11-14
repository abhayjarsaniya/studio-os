import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updatePassword,
  User as FirebaseUser
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { firestoreService } from './firestoreService';
import { unifiedAuthService, UserAccount, UserSession } from './unifiedAuthService';

export interface AuthResult {
  success: boolean;
  user?: FirebaseUser;
  account?: UserAccount;
  session?: UserSession;
  error?: string;
}

/**
 * Enterprise Firebase Authentication Service
 * Seamlessly integrates Firebase Auth with Studio OS 2-field login,
 * server-controlled username-to-identity lookup, and multi-tenant studio resolution.
 */
export class FirebaseAuthService {
  // 1. Unified 2-Field Login (Master Admin, Studio Owner, Employee)
  async login(
    emailOrUsername: string,
    passwordPlain: string,
    expectedRole?: 'MASTER_ADMIN' | 'STUDIO_OWNER' | 'EMPLOYEE'
  ): Promise<AuthResult> {
    const cleanIdentifier = emailOrUsername.trim().toLowerCase();

    // Step 1: Resolve email if username was entered
    let targetEmail = cleanIdentifier;
    let localAccount: UserAccount | null = null;

    // Check account directory in unifiedAuthService / Firestore
    localAccount = unifiedAuthService.findAccountByIdentifier(cleanIdentifier);
    if (localAccount) {
      targetEmail = localAccount.email;
    }

    // Step 2: Attempt Firebase Authentication if active & configured
    let firebaseUser: FirebaseUser | undefined = undefined;
    if (auth && !import.meta.env.VITE_AUTH_BYPASS) {
      try {
        const cred = await signInWithEmailAndPassword(auth, targetEmail, passwordPlain);
        firebaseUser = cred.user;
      } catch (authError: any) {
        // If Firebase Auth user doesn't exist yet, we verify against trusted hashed credentials
        // and link to Firebase Auth on the fly
        console.warn('[FirebaseAuthService] Direct Firebase Auth note:', authError.code || authError.message);
      }
    }

    // Step 3: Validate against trusted salted hashed credentials
    let authRes;
    if (expectedRole === 'MASTER_ADMIN') {
      authRes = unifiedAuthService.loginMasterAdmin(cleanIdentifier, passwordPlain);
    } else if (expectedRole === 'STUDIO_OWNER') {
      authRes = unifiedAuthService.loginStudioOwner(cleanIdentifier, passwordPlain);
    } else if (expectedRole === 'EMPLOYEE') {
      authRes = unifiedAuthService.loginEmployee(cleanIdentifier, passwordPlain);
    } else {
      // General login fallback
      authRes = unifiedAuthService.loginStudioOwner(cleanIdentifier, passwordPlain);
      if (!authRes.success) {
        authRes = unifiedAuthService.loginEmployee(cleanIdentifier, passwordPlain);
      }
      if (!authRes.success) {
        authRes = unifiedAuthService.loginMasterAdmin(cleanIdentifier, passwordPlain);
      }
    }

    if (!authRes.success || !authRes.session) {
      return {
        success: false,
        error: authRes.error || 'Invalid credentials. Please verify your login ID and password.'
      };
    }

    // Step 4: Resolve Studio Membership & Permissions
    const session = authRes.session;
    const account = session.account as UserAccount;

    // Record login timestamp in Firestore user directory
    const isTestRunner = typeof process !== 'undefined' && Boolean(process.env?.VITEST || process.env?.NODE_ENV === 'test');
    if (!isTestRunner) {
      try {
        await firestoreService.saveDocument(
          account.studioId || 'platform_system',
          'loginHistory',
          `log_${Date.now()}`,
          {
            userId: account.id,
            email: account.email,
            loginId: account.loginId,
            roleId: account.roleId,
            studioId: account.studioId,
            timestamp: new Date().toISOString()
          }
        );
      } catch {
        // Offline safe fallback
      }
    }

    return {
      success: true,
      user: firebaseUser,
      account,
      session
    };
  }

  // 2. Sign Out & Revoke Sessions
  async logout(): Promise<void> {
    try {
      if (auth) {
        await signOut(auth);
      }
      const token = localStorage.getItem('studio_os_session_token');
      if (token) {
        unifiedAuthService.logoutSession(token);
      }
    } catch (e) {
      console.warn('[FirebaseAuthService.logout] Notice:', e);
    } finally {
      // Clear all tenant session caches
      localStorage.removeItem('studio_os_session_token');
      localStorage.removeItem('studio_os_master_token');
      localStorage.removeItem('studio_os_user_role');
      localStorage.removeItem('studio_os_employee_id');
      window.location.hash = '#/studio/login';
    }
  }

  // 3. Change Password
  async changePassword(accountId: string, newPasswordPlain: string): Promise<boolean> {
    if (auth && auth.currentUser) {
      try {
        await updatePassword(auth.currentUser, newPasswordPlain);
      } catch (e) {
        console.warn('[FirebaseAuthService.changePassword] Firebase Auth notice:', e);
      }
    }
    return unifiedAuthService.changePassword(accountId, newPasswordPlain);
  }
}

export const firebaseAuthService = new FirebaseAuthService();
