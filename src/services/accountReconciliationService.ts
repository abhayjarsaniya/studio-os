import { db, auth, isAuthBypassed } from '../lib/firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc 
} from 'firebase/firestore';
import { TenantStore } from './tenantStore';
import { unifiedAuthService } from './unifiedAuthService';
import { platformStudioService } from './platformStudioService';
import { Studio, Employee } from '../types/schema';

export interface ReconciliationReport {
  timestamp: string;
  totalStudiosChecked: number;
  studiosRepaired: number;
  totalOwnersChecked: number;
  ownersRepaired: number;
  totalEmployeesChecked: number;
  employeesRepaired: number;
  conflicts: string[];
  repairedAccounts: Array<{
    email: string;
    role: string;
    studioId?: string;
    action: string;
  }>;
}

export class AccountReconciliationService {
  /**
   * Safe Account Reconciliation Utility
   * - Reads existing studio owner and employee records from Firestore and TenantStore
   * - Checks whether their Auth UID matches Firestore profiles
   * - Checks studio membership and employee relationships
   * - Repairs missing or inconsistent profile links without overwriting valid data
   * - Never overwrites existing passwords or deletes data
   */
  async reconcileAllAccounts(): Promise<ReconciliationReport> {
    const report: ReconciliationReport = {
      timestamp: new Date().toISOString(),
      totalStudiosChecked: 0,
      studiosRepaired: 0,
      totalOwnersChecked: 0,
      ownersRepaired: 0,
      totalEmployeesChecked: 0,
      employeesRepaired: 0,
      conflicts: [],
      repairedAccounts: []
    };

    if (!db || isAuthBypassed) {
      console.log('[AccountReconciliation] Running in offline/preview mode, skipping cloud sync.');
      return report;
    }

    try {
      console.log('[AccountReconciliation] Starting full platform account reconciliation...');

      // 1. Reconcile Master Admin (Strictly only jarsaniya.abhay@gmail.com)
      const masterAdminUsers = [
        { uid: 'mmrIcufwmoQ4JawzKd0pbgjNRsx2', email: 'jarsaniya.abhay@gmail.com', displayName: 'Abhay Jarsaniya' }
      ];

      for (const mAdmin of masterAdminUsers) {
        try {
          const userSnap = await getDoc(doc(db, 'users', mAdmin.uid));
          if (!userSnap.exists()) {
            await setDoc(doc(db, 'users', mAdmin.uid), {
              uid: mAdmin.uid,
              email: mAdmin.email,
              displayName: mAdmin.displayName,
              role: 'platform_master_admin',
              accountType: 'MASTER_ADMIN',
              studioId: null,
              portal: 'Master Admin',
              isActive: true,
              mustChangePassword: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
            report.repairedAccounts.push({ email: mAdmin.email, role: 'MASTER_ADMIN', action: 'Created users doc' });
          }

          const adminSnap = await getDoc(doc(db, 'masterAdmins', mAdmin.uid));
          if (!adminSnap.exists()) {
            await setDoc(doc(db, 'masterAdmins', mAdmin.uid), {
              adminId: mAdmin.uid,
              email: mAdmin.email,
              displayName: mAdmin.displayName,
              role: 'platform_master_admin',
              isActive: true,
              permissions: [
                'ALL_STUDIOS_READ',
                'ALL_STUDIOS_WRITE',
                'SUBSCRIPTIONS_MANAGE',
                'ROLES_MANAGE',
                'SETTINGS_MANAGE'
              ],
              updatedAt: new Date().toISOString()
            });
          }
        } catch (mErr: any) {
          console.warn(`[AccountReconciliation] Master Admin sync notice for ${mAdmin.email}:`, mErr.message);
        }
      }

      // 2. Fetch all studios from Firestore
      const studiosSnap = await getDocs(collection(db, 'studios'));
      const existingStudioIds = new Set(studiosSnap.docs.map(d => d.id));

      // Also get known studios from TenantStore and platformStudioService
      const localStudios = platformStudioService.listStudios();
      for (const ls of localStudios) {
        if (!existingStudioIds.has(ls.id) && ls.id !== 'studio_draft_001' && ls.id !== 'studio_draft_002' && ls.id !== 'studio_draft_003') {
          // Reconcile missing studio doc in Firestore
          try {
            const studioProfile = TenantStore.getSingle<Studio>(ls.id, 'profile');
            if (studioProfile) {
              await setDoc(doc(db, 'studios', ls.id), {
                id: ls.id,
                tenantId: ls.id,
                name: ls.name || studioProfile.name,
                ownerName: ls.ownerName || (studioProfile as any).ownerName,
                ownerEmail: ls.ownerEmail || (studioProfile as any).ownerEmail,
                ownerPhone: ls.ownerPhone || studioProfile.phone,
                city: ls.city || studioProfile.city || '',
                state: studioProfile.state || 'Gujarat',
                accountStatus: (studioProfile as any).accountStatus || 'active',
                lifecycleStatus: ls.lifecycleStatus || 'active',
                subscriptionStatus: ls.subscriptionStatus || 'trial',
                createdAt: studioProfile.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
              }, { merge: true });

              await setDoc(doc(db, 'studioDirectory', ls.id), {
                studioId: ls.id,
                name: ls.name,
                ownerName: ls.ownerName,
                ownerEmail: ls.ownerEmail,
                city: ls.city,
                state: studioProfile.state || 'Gujarat',
                lifecycleStatus: ls.lifecycleStatus || 'active',
                subscriptionStatus: ls.subscriptionStatus || 'trial',
                registeredAt: ls.registeredAt || new Date().toISOString()
              }, { merge: true });

              report.studiosRepaired++;
              report.repairedAccounts.push({
                email: ls.ownerEmail,
                role: 'STUDIO',
                studioId: ls.id,
                action: 'Reconciled missing studio document in Firestore'
              });
            }
          } catch (stErr: any) {
            console.warn(`[AccountReconciliation] Studio sync notice for ${ls.id}:`, stErr.message);
          }
        }
      }

      // Refresh studios snap
      const updatedStudiosSnap = await getDocs(collection(db, 'studios'));
      report.totalStudiosChecked = updatedStudiosSnap.size;

      // 3. Inspect each studio for members and employee consistency
      for (const sDoc of updatedStudiosSnap.docs) {
        const studioId = sDoc.id;
        const studioData = sDoc.data();

        // 3a. Reconcile Owner
        const ownerEmail = (studioData.ownerEmail || studioData.email || '').toLowerCase().trim();
        const ownerUid = studioData.ownerUid;

        if (ownerEmail) {
          report.totalOwnersChecked++;
          // Find user doc by ownerUid or by email
          let userProfileSnap = ownerUid ? await getDoc(doc(db, 'users', ownerUid)) : null;
          let targetUid = ownerUid;

          if (!userProfileSnap || !userProfileSnap.exists()) {
            // Find by searching users collection
            const usersSnap = await getDocs(collection(db, 'users'));
            const matchedUser = usersSnap.docs.find(u => u.data().email?.toLowerCase() === ownerEmail);
            if (matchedUser) {
              targetUid = matchedUser.id;
              userProfileSnap = matchedUser;
            }
          }

          if (targetUid) {
            // Ensure users doc has correct studioId, accountType, role
            const uData = userProfileSnap?.data() || {};
            if (!uData.studioId || uData.role !== 'studio_owner' || uData.status !== 'active') {
              await setDoc(doc(db, 'users', targetUid), {
                uid: targetUid,
                email: ownerEmail,
                displayName: studioData.ownerName || uData.displayName || 'Studio Owner',
                role: 'studio_owner',
                accountType: 'STUDIO_OWNER',
                studioId,
                studioName: studioData.name || 'Studio OS',
                portal: 'Studio Owner',
                status: 'active',
                isActive: true,
                updatedAt: new Date().toISOString()
              }, { merge: true });
              report.ownersRepaired++;
              report.repairedAccounts.push({
                email: ownerEmail,
                role: 'STUDIO_OWNER',
                studioId,
                action: 'Updated users doc with studioId & active status'
              });
            }

            // Ensure member doc in studios/{studioId}/members/{targetUid}
            const memberRef = doc(db, 'studios', studioId, 'members', targetUid);
            const memberSnap = await getDoc(memberRef);
            if (!memberSnap.exists() || memberSnap.data().status !== 'active') {
              await setDoc(memberRef, {
                uid: targetUid,
                email: ownerEmail,
                displayName: studioData.ownerName || 'Studio Owner',
                role: 'owner',
                membershipType: 'OWNER',
                status: 'active',
                isActive: true,
                updatedAt: new Date().toISOString()
              }, { merge: true });
              report.repairedAccounts.push({
                email: ownerEmail,
                role: 'STUDIO_OWNER_MEMBER',
                studioId,
                action: 'Activated studio membership'
              });
            }
          }
        }

        // 3b. Reconcile Employees for this Studio
        const empSnap = await getDocs(collection(db, 'studios', studioId, 'employees'));
        report.totalEmployeesChecked += empSnap.size;

        for (const eDoc of empSnap.docs) {
          const emp = eDoc.data();
          const empEmail = (emp.email || '').toLowerCase().trim();
          if (!empEmail) continue;

          // Check if employee has a corresponding user doc
          const usersSnap = await getDocs(collection(db, 'users'));
          const matchedUser = usersSnap.docs.find(u => u.data().email?.toLowerCase() === empEmail);

          if (matchedUser) {
            const empAuthUid = matchedUser.id;
            const uData = matchedUser.data();

            // Ensure employee user doc has studioId & employeeId
            if (!uData.studioId || !uData.employeeId || uData.status !== 'active') {
              await setDoc(doc(db, 'users', empAuthUid), {
                uid: empAuthUid,
                email: empEmail,
                displayName: emp.fullName || emp.name || uData.displayName || 'Staff Member',
                role: emp.roleId || uData.role || 'employee',
                roleId: emp.roleId || 'photographer',
                roleName: emp.roleName || emp.designation || 'Photographer',
                accountType: 'EMPLOYEE',
                studioId,
                studioName: studioData.name || 'Studio OS',
                employeeId: eDoc.id,
                designation: emp.designation || 'Staff Member',
                department: emp.department || 'Photography',
                portal: 'Employee',
                status: 'active',
                isActive: true,
                updatedAt: new Date().toISOString()
              }, { merge: true });
              report.employeesRepaired++;
              report.repairedAccounts.push({
                email: empEmail,
                role: 'EMPLOYEE',
                studioId,
                action: 'Linked employee profile to user doc & activated status'
              });
            }

            // Ensure membership in studios/{studioId}/members/{empAuthUid}
            const memberRef = doc(db, 'studios', studioId, 'members', empAuthUid);
            const memberSnap = await getDoc(memberRef);
            if (!memberSnap.exists() || memberSnap.data().status !== 'active') {
              await setDoc(memberRef, {
                uid: empAuthUid,
                email: empEmail,
                displayName: emp.fullName || emp.name || 'Staff Member',
                role: emp.roleId || 'employee',
                membershipType: 'EMPLOYEE',
                employeeId: eDoc.id,
                status: 'active',
                isActive: true,
                updatedAt: new Date().toISOString()
              }, { merge: true });
            }
          }
        }
      }

      console.log(`[AccountReconciliation] Completed! Repaired ${report.ownersRepaired} owners and ${report.employeesRepaired} employees across ${report.totalStudiosChecked} studios.`);
      return report;
    } catch (err: any) {
      console.error('[AccountReconciliation] Error executing account reconciliation:', err);
      report.conflicts.push(`Reconciliation error: ${err.message}`);
      return report;
    }
  }
}

export const accountReconciliationService = new AccountReconciliationService();
