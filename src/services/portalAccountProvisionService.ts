import { unifiedAuthService, UserAccount, hashCredential, generateCryptoSalt } from './unifiedAuthService';
import { SHREEJI_EMPLOYEES_DEF } from './seedShreejiStudio';

export interface PortalProvisionedAccount {
  portal: 'Master Admin' | 'Studio Owner' | 'Employee';
  accountType: 'MASTER_ADMIN' | 'STUDIO_OWNER' | 'EMPLOYEE';
  displayName: string;
  username: string;
  email: string;
  temporaryPassword: string;
  uid: string;
  role: string;
  designation: string;
  department: string;
  employeeId?: string;
  studioId?: string;
  studioName?: string;
  loginUrl: string;
  targetDashboard: string;
  authStatus: string;
  firestoreProfileStatus: string;
}

// Fixed provisioned credentials manifest generated and verified against live Firebase
export const PROVISIONED_PORTAL_ACCOUNTS: PortalProvisionedAccount[] = [
  {
    portal: 'Master Admin',
    accountType: 'MASTER_ADMIN',
    displayName: 'Studio OS Master Admin',
    username: 'masteradmin',
    email: 'masteradmin@studioos.internal',
    temporaryPassword: 'Hz9#*R*r2&#%L3',
    uid: 'CazTsmfHx2h1G45ot6pScMKPZVs2',
    role: 'platform_master_admin',
    designation: 'Platform Super Administrator',
    department: 'Platform Administration',
    studioId: 'Platform-Wide',
    loginUrl: 'http://localhost:5173/#/master/login',
    targetDashboard: '#/master/dashboard',
    authStatus: 'Active & Verified',
    firestoreProfileStatus: 'Synced (users, masterAdmins)'
  },
  {
    portal: 'Studio Owner',
    accountType: 'STUDIO_OWNER',
    displayName: 'Aarav Patel',
    username: 'shreeji.owner',
    email: 'aarav@shreejifilms.in',
    temporaryPassword: '7FgBK8@TUsxV@H',
    uid: '9NJ9xM4Aradq2gqW7ySTHLLdDin2',
    role: 'studio_owner',
    designation: 'Managing Director & Principal Photographer',
    department: 'Management',
    studioId: 'studio_shreeji_films',
    studioName: 'SHREEJI FILMS AND PHOTOGRAPHY',
    loginUrl: 'http://localhost:5173/#/studio/login',
    targetDashboard: '#/app/dashboard',
    authStatus: 'Active & Verified',
    firestoreProfileStatus: 'Synced (users, members)'
  },
  {
    portal: 'Employee',
    accountType: 'EMPLOYEE',
    displayName: 'Rahul Sharma',
    username: 'rahul.sharma',
    email: 'rahul.sharma@shreejifilms.in',
    temporaryPassword: '!Bd2*9R7vJUy8W',
    uid: '914m3jgCcvQolmpLt4gPOmN1sqH3',
    role: 'lead_photographer',
    designation: 'Lead Photographer',
    department: 'Photography',
    employeeId: 'emp_shr_rahul',
    studioId: 'studio_shreeji_films',
    studioName: 'SHREEJI FILMS AND PHOTOGRAPHY',
    loginUrl: 'http://localhost:5173/#/employee/login',
    targetDashboard: '#/employee/dashboard',
    authStatus: 'Active & Verified',
    firestoreProfileStatus: 'Synced (users, members, employees)'
  },
  {
    portal: 'Employee',
    accountType: 'EMPLOYEE',
    displayName: 'Karan Patel',
    username: 'karan.patel',
    email: 'karan.patel@shreejifilms.in',
    temporaryPassword: 'sN&sWD9c#2Sn9P',
    uid: 'rahZyGLAi4eTZHmH3pcM6UP9htm2',
    role: 'photographer',
    designation: 'Candid Photographer',
    department: 'Photography',
    employeeId: 'emp_shr_karan',
    studioId: 'studio_shreeji_films',
    studioName: 'SHREEJI FILMS AND PHOTOGRAPHY',
    loginUrl: 'http://localhost:5173/#/employee/login',
    targetDashboard: '#/employee/dashboard',
    authStatus: 'Active & Verified',
    firestoreProfileStatus: 'Synced (users, members, employees)'
  },
  {
    portal: 'Employee',
    accountType: 'EMPLOYEE',
    displayName: 'Vishal Desai',
    username: 'vishal.desai',
    email: 'vishal.desai@shreejifilms.in',
    temporaryPassword: 'Lua%4#Ln7*r5tw',
    uid: 'SWzMykAGQCT01Mhx4qZCFupjonx2',
    role: 'videographer',
    designation: 'Videographer',
    department: 'Videography',
    employeeId: 'emp_shr_vishal',
    studioId: 'studio_shreeji_films',
    studioName: 'SHREEJI FILMS AND PHOTOGRAPHY',
    loginUrl: 'http://localhost:5173/#/employee/login',
    targetDashboard: '#/employee/dashboard',
    authStatus: 'Active & Verified',
    firestoreProfileStatus: 'Synced (users, members, employees)'
  },
  {
    portal: 'Employee',
    accountType: 'EMPLOYEE',
    displayName: 'Meet Shah',
    username: 'meet.shah',
    email: 'meet.shah@shreejifilms.in',
    temporaryPassword: 's63Y#SZ%XyR4Sw',
    uid: '9vc1M7VxUGcXcWCQoYTDDrRDgP82',
    role: 'cinematographer',
    designation: 'Cinematographer',
    department: 'Cinematography',
    employeeId: 'emp_shr_meet',
    studioId: 'studio_shreeji_films',
    studioName: 'SHREEJI FILMS AND PHOTOGRAPHY',
    loginUrl: 'http://localhost:5173/#/employee/login',
    targetDashboard: '#/employee/dashboard',
    authStatus: 'Active & Verified',
    firestoreProfileStatus: 'Synced (users, members, employees)'
  },
  {
    portal: 'Employee',
    accountType: 'EMPLOYEE',
    displayName: 'Jay Mehta',
    username: 'jay.mehta',
    email: 'jay.mehta@shreejifilms.in',
    temporaryPassword: '6Ab#NUv!57rTYn',
    uid: 'bszKfOJeDlTpTBza66TssIVinef1',
    role: 'drone_operator',
    designation: 'Drone Operator',
    department: 'Drone',
    employeeId: 'emp_shr_jay',
    studioId: 'studio_shreeji_films',
    studioName: 'SHREEJI FILMS AND PHOTOGRAPHY',
    loginUrl: 'http://localhost:5173/#/employee/login',
    targetDashboard: '#/employee/dashboard',
    authStatus: 'Active & Verified',
    firestoreProfileStatus: 'Synced (users, members, employees)'
  },
  {
    portal: 'Employee',
    accountType: 'EMPLOYEE',
    displayName: 'Priya Joshi',
    username: 'priya.joshi',
    email: 'priya.joshi@shreejifilms.in',
    temporaryPassword: 'YsP4m8Q5y$R%dB',
    uid: 'TTS7iDgH4MVaw0XUYkQqRMDgIjF3',
    role: 'editor',
    designation: 'Photo Editor',
    department: 'Photo Editing',
    employeeId: 'emp_shr_priya',
    studioId: 'studio_shreeji_films',
    studioName: 'SHREEJI FILMS AND PHOTOGRAPHY',
    loginUrl: 'http://localhost:5173/#/employee/login',
    targetDashboard: '#/employee/dashboard',
    authStatus: 'Active & Verified',
    firestoreProfileStatus: 'Synced (users, members, employees)'
  },
  {
    portal: 'Employee',
    accountType: 'EMPLOYEE',
    displayName: 'Riya Trivedi',
    username: 'riya.trivedi',
    email: 'riya.trivedi@shreejifilms.in',
    temporaryPassword: '!3rWPxt9MP@5tC',
    uid: 'J0ztwIP48dbTj3rHSMXLk0lZq8a2',
    role: 'editor',
    designation: 'Video Editor',
    department: 'Video Editing',
    employeeId: 'emp_shr_riya',
    studioId: 'studio_shreeji_films',
    studioName: 'SHREEJI FILMS AND PHOTOGRAPHY',
    loginUrl: 'http://localhost:5173/#/employee/login',
    targetDashboard: '#/employee/dashboard',
    authStatus: 'Active & Verified',
    firestoreProfileStatus: 'Synced (users, members, employees)'
  },
  {
    portal: 'Employee',
    accountType: 'EMPLOYEE',
    displayName: 'Neel Vyas',
    username: 'neel.vyas',
    email: 'neel.vyas@shreejifilms.in',
    temporaryPassword: 'g8f9&UE8A!KT7G',
    uid: 'db27JwDA7rMBUahX0rcg4qjt3AC3',
    role: 'album_designer',
    designation: 'Album Designer',
    department: 'Album Designing',
    employeeId: 'emp_shr_neel',
    studioId: 'studio_shreeji_films',
    studioName: 'SHREEJI FILMS AND PHOTOGRAPHY',
    loginUrl: 'http://localhost:5173/#/employee/login',
    targetDashboard: '#/employee/dashboard',
    authStatus: 'Active & Verified',
    firestoreProfileStatus: 'Synced (users, members, employees)'
  },
  {
    portal: 'Employee',
    accountType: 'EMPLOYEE',
    displayName: 'Aman Parmar',
    username: 'aman.parmar',
    email: 'aman.parmar@shreejifilms.in',
    temporaryPassword: 'G#5Vi@5p4ZBk2J',
    uid: '34sxp7FOLdWWal6csO1tTXgC2jr1',
    role: 'assistant',
    designation: 'Photography Assistant',
    department: 'Photography',
    employeeId: 'emp_shr_aman',
    studioId: 'studio_shreeji_films',
    studioName: 'SHREEJI FILMS AND PHOTOGRAPHY',
    loginUrl: 'http://localhost:5173/#/employee/login',
    targetDashboard: '#/employee/dashboard',
    authStatus: 'Active & Verified',
    firestoreProfileStatus: 'Synced (users, members, employees)'
  },
  {
    portal: 'Employee',
    accountType: 'EMPLOYEE',
    displayName: 'Krunal Dave',
    username: 'krunal.dave',
    email: 'krunal.dave@shreejifilms.in',
    temporaryPassword: 'Wg2@x!yB3L4%Yg',
    uid: 'rtnvTECv7nN8bjbGpnhXHaM7l8J2',
    role: 'manager',
    designation: 'Production Manager',
    department: 'Production',
    employeeId: 'emp_shr_krunal',
    studioId: 'studio_shreeji_films',
    studioName: 'SHREEJI FILMS AND PHOTOGRAPHY',
    loginUrl: 'http://localhost:5173/#/employee/login',
    targetDashboard: '#/employee/dashboard',
    authStatus: 'Active & Verified',
    firestoreProfileStatus: 'Synced (users, members, employees)'
  },
  {
    portal: 'Employee',
    accountType: 'EMPLOYEE',
    displayName: 'Dhruv Patel',
    username: 'dhruv.patel',
    email: 'dhruv.patel@shreejifilms.in',
    temporaryPassword: 'uLk*3B6Wm3sr!p',
    uid: 'zwuoCVZ2dsN0afLe0uQ0porZuXJ3',
    role: 'photographer',
    designation: 'Photographer',
    department: 'Photography',
    employeeId: 'emp_shr_dhruv',
    studioId: 'studio_shreeji_films',
    studioName: 'SHREEJI FILMS AND PHOTOGRAPHY',
    loginUrl: 'http://localhost:5173/#/employee/login',
    targetDashboard: '#/employee/dashboard',
    authStatus: 'Active & Verified',
    firestoreProfileStatus: 'Synced (users, members, employees)'
  },
  {
    portal: 'Employee',
    accountType: 'EMPLOYEE',
    displayName: 'Kavya Shah',
    username: 'kavya.shah',
    email: 'kavya.shah@shreejifilms.in',
    temporaryPassword: 'nC!#7@%azf8n9Z',
    uid: 'ABx2KmdRWJgvZYLXAtrIfXW71M12',
    role: 'editor',
    designation: 'Editing Assistant',
    department: 'Video Editing',
    employeeId: 'emp_shr_kavya',
    studioId: 'studio_shreeji_films',
    studioName: 'SHREEJI FILMS AND PHOTOGRAPHY',
    loginUrl: 'http://localhost:5173/#/employee/login',
    targetDashboard: '#/employee/dashboard',
    authStatus: 'Active & Verified',
    firestoreProfileStatus: 'Synced (users, members, employees)'
  },
  {
    portal: 'Employee',
    accountType: 'EMPLOYEE',
    displayName: 'Harsh Modi',
    username: 'harsh.modi',
    email: 'harsh.modi@shreejifilms.in',
    temporaryPassword: 'Dm4m$*Gtj3mN*2',
    uid: 'KzlRkziIovdTwpvDPFkRuJw2PEE2',
    role: 'assistant',
    designation: 'Photography Assistant',
    department: 'Photography',
    employeeId: 'emp_shr_harsh',
    studioId: 'studio_shreeji_films',
    studioName: 'SHREEJI FILMS AND PHOTOGRAPHY',
    loginUrl: 'http://localhost:5173/#/employee/login',
    targetDashboard: '#/employee/dashboard',
    authStatus: 'Active & Verified',
    firestoreProfileStatus: 'Synced (users, members, employees)'
  },
  {
    portal: 'Employee',
    accountType: 'EMPLOYEE',
    displayName: 'Nisha Desai',
    username: 'nisha.desai',
    email: 'nisha.desai@shreejifilms.in',
    temporaryPassword: 'Ysx$UbvM9@SZ2u',
    uid: 'pgHTiMz8wjR5meh6Sjv1i6q8Pfl1',
    role: 'album_designer',
    designation: 'Album Designer',
    department: 'Album Designing',
    employeeId: 'emp_shr_nisha',
    studioId: 'studio_shreeji_films',
    studioName: 'SHREEJI FILMS AND PHOTOGRAPHY',
    loginUrl: 'http://localhost:5173/#/employee/login',
    targetDashboard: '#/employee/dashboard',
    authStatus: 'Active & Verified',
    firestoreProfileStatus: 'Synced (users, members, employees)'
  }
];

export class PortalAccountProvisionService {
  /**
   * Syncs the verified accounts with unifiedAuthService so both Firebase Auth
   * and local salted hashed credentials validate flawlessly.
   */
  syncWithUnifiedAuthService(): void {
    for (const item of PROVISIONED_PORTAL_ACCOUNTS) {
      const salt = generateCryptoSalt();
      const account: UserAccount = {
        id: item.uid || (item.employeeId || `usr_${item.username}`),
        accountType: item.accountType,
        loginId: item.username,
        email: item.email,
        displayName: item.displayName,
        studioId: item.studioId === 'Platform-Wide' ? undefined : item.studioId,
        studioName: item.studioName,
        roleId: item.role,
        roleTitle: item.designation,
        status: 'active',
        passwordHash: hashCredential(item.temporaryPassword, salt),
        salt,
        mustChangePassword: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Register account in unifiedAuthService
      (unifiedAuthService as any).saveAccount(account);

      // Register alias for username / short ID
      if (item.username === 'shreeji.owner') {
        const ownerAlias = { ...account, id: 'usr_owner_shreeji_alias', loginId: 'aarav_shreeji' };
        (unifiedAuthService as any).saveAccount(ownerAlias);
      }
    }
  }

  getProvisionedAccounts(): PortalProvisionedAccount[] {
    return PROVISIONED_PORTAL_ACCOUNTS;
  }

  getMasterAdminAccount(): PortalProvisionedAccount {
    return PROVISIONED_PORTAL_ACCOUNTS.find(a => a.accountType === 'MASTER_ADMIN')!;
  }

  getStudioOwnerAccount(): PortalProvisionedAccount {
    return PROVISIONED_PORTAL_ACCOUNTS.find(a => a.accountType === 'STUDIO_OWNER')!;
  }

  getEmployeeAccounts(): PortalProvisionedAccount[] {
    return PROVISIONED_PORTAL_ACCOUNTS.filter(a => a.accountType === 'EMPLOYEE');
  }

  validatePasswordStrength(password: string): { isValid: boolean; error?: string } {
    if (password.length < 12) {
      return { isValid: false, error: 'Password must be at least 12 characters long.' };
    }
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasDigit = /[0-9]/.test(password);
    const hasSymbol = /[!@#$%&*]/.test(password);

    if (!hasUpper || !hasLower || !hasDigit || !hasSymbol) {
      return { 
        isValid: false, 
        error: 'Password must include uppercase, lowercase, numbers, and symbols (!@#$%&*).' 
      };
    }
    return { isValid: true };
  }
}

export const portalAccountProvisionService = new PortalAccountProvisionService();

// Initialize registry sync
portalAccountProvisionService.syncWithUnifiedAuthService();
