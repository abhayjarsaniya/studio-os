import { firestoreService } from './firestoreService';
import { TenantStore } from './tenantStore';
import { Unsubscribe } from 'firebase/firestore';

export interface CloudSyncStats {
  customers: number;
  bookings: number;
  events: number;
  quotations: number;
  payments: number;
  employees: number;
  tasks: number;
  notifications: number;
  expenses: number;
  lastSyncedAt: string;
}

/**
 * CloudSyncService — Single Source of Truth & Real-Time Cross-Device Synchronization
 * 
 * Bridges Firebase Firestore as the authoritative cloud backend with responsive client-side state.
 * Guarantees that any booking, customer, payment, or quotation created on Mobile A is instantly
 * synchronized and visible on Laptop B and every other connected device.
 */
export class CloudSyncService {
  private activeSubscriptions: Map<string, Unsubscribe> = new Map();
  private activeStudioId: string | null = null;
  private isHydrating: boolean = false;
  private lastStats: Map<string, CloudSyncStats> = new Map();

  /**
   * Hydrates all studio collections from Firebase Firestore into TenantStore.
   * Called immediately on login or when the Studio layout initializes on any device.
   */
  async hydrateStudioFromCloud(studioId: string): Promise<{ success: boolean; stats: CloudSyncStats }> {
    if (!studioId || typeof studioId !== 'string' || !studioId.trim()) {
      return {
        success: false,
        stats: this.createEmptyStats()
      };
    }

    const cleanStudioId = studioId.trim();
    this.isHydrating = true;
    firestoreService.setStatus('saving', 'Syncing studio data from Firebase Cloud...');

    try {
      // 1. Parallel fetch of all primary business collections from Firestore
      const [
        cloudCustomers,
        cloudBookingsV2,
        cloudBookings,
        cloudEvents,
        cloudQuotations,
        cloudPayments,
        cloudEmployees,
        cloudTasks,
        cloudNotifications,
        cloudExpenses,
        cloudProfile,
        cloudSettings
      ] = await Promise.all([
        firestoreService.getCollection<any>(cleanStudioId, 'customers'),
        firestoreService.getCollection<any>(cleanStudioId, 'studio_bookings_v2'),
        firestoreService.getCollection<any>(cleanStudioId, 'bookings'),
        firestoreService.getCollection<any>(cleanStudioId, 'events'),
        firestoreService.getCollection<any>(cleanStudioId, 'quotations'),
        firestoreService.getCollection<any>(cleanStudioId, 'payments'),
        firestoreService.getCollection<any>(cleanStudioId, 'employees'),
        firestoreService.getCollection<any>(cleanStudioId, 'tasks'),
        firestoreService.getCollection<any>(cleanStudioId, 'notifications'),
        firestoreService.getCollection<any>(cleanStudioId, 'expenses'),
        firestoreService.getDocument<any>(cleanStudioId, 'profile', 'profile'),
        firestoreService.getDocument<any>(cleanStudioId, 'settings', 'settings')
      ]);

      // 2. Unify bookings from both studio_bookings_v2 and legacy bookings paths
      const unifiedBookingsMap = new Map<string, any>();
      (cloudBookings || []).forEach(b => { if (b && b.id) unifiedBookingsMap.set(b.id, b); });
      (cloudBookingsV2 || []).forEach(b => { if (b && b.id) unifiedBookingsMap.set(b.id, b); });
      const mergedBookings = Array.from(unifiedBookingsMap.values());

      // 3. Hydrate TenantStore with authoritative cloud data
      if (cloudCustomers.length > 0) {
        TenantStore.setFromCloud(cleanStudioId, 'customers', cloudCustomers);
      }
      if (mergedBookings.length > 0) {
        TenantStore.setFromCloud(cleanStudioId, 'studio_bookings_v2', mergedBookings);
      }
      if (cloudEvents.length > 0) {
        TenantStore.setFromCloud(cleanStudioId, 'events', cloudEvents);
      }
      if (cloudQuotations.length > 0) {
        TenantStore.setFromCloud(cleanStudioId, 'quotations', cloudQuotations);
      }
      if (cloudPayments.length > 0) {
        TenantStore.setFromCloud(cleanStudioId, 'payments', cloudPayments);
      }
      if (cloudEmployees.length > 0) {
        TenantStore.setFromCloud(cleanStudioId, 'employees', cloudEmployees);
      }
      if (cloudTasks.length > 0) {
        TenantStore.setFromCloud(cleanStudioId, 'tasks', cloudTasks);
      }
      if (cloudNotifications.length > 0) {
        TenantStore.setFromCloud(cleanStudioId, 'notifications', cloudNotifications);
      }
      if (cloudExpenses.length > 0) {
        TenantStore.setFromCloud(cleanStudioId, 'expenses', cloudExpenses);
      }
      if (cloudProfile) {
        TenantStore.setFromCloud(cleanStudioId, 'profile', cloudProfile);
      }
      if (cloudSettings) {
        TenantStore.setFromCloud(cleanStudioId, 'settings', cloudSettings);
      }

      // Also ensure profile exists in meta registry
      const localProfile = TenantStore.getSingle(cleanStudioId, 'profile');
      if (localProfile) {
        const meta = TenantStore.getSingle<Record<string, any>>('platform_system', 'platform_studios_meta') || {};
        meta[cleanStudioId] = {
          lifecycleStatus: 'active',
          lastCloudSyncAt: new Date().toISOString()
        };
        TenantStore.setFromCloud('platform_system', 'platform_studios_meta', meta);
      }

      const stats: CloudSyncStats = {
        customers: cloudCustomers.length,
        bookings: mergedBookings.length,
        events: cloudEvents.length,
        quotations: cloudQuotations.length,
        payments: cloudPayments.length,
        employees: cloudEmployees.length,
        tasks: cloudTasks.length,
        notifications: cloudNotifications.length,
        expenses: cloudExpenses.length,
        lastSyncedAt: new Date().toISOString()
      };

      this.lastStats.set(cleanStudioId, stats);
      firestoreService.setStatus('saved', 'All data synchronized from Firebase Cloud');

      // Dispatch notification event for reactive UI update
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('studio_cloud_data_synced', {
          detail: { studioId: cleanStudioId, stats }
        }));
        window.dispatchEvent(new Event('studio_data_updated'));
      }

      return { success: true, stats };
    } catch (err: any) {
      console.warn(`[CloudSyncService.hydrateStudioFromCloud] Note on sync:`, err?.message);
      firestoreService.setStatus('saved', 'Local cache active');
      return {
        success: false,
        stats: this.createEmptyStats()
      };
    } finally {
      this.isHydrating = false;
    }
  }

  /**
   * Establishes real-time onSnapshot listeners on core business collections.
   * When any device performs a write to Firebase, all other devices receive the
   * updated documents and re-render instantly without manual refresh.
   */
  startRealtimeSync(studioId: string): () => void {
    if (!studioId || typeof studioId !== 'string' || !studioId.trim()) {
      return () => {};
    }

    const cleanStudioId = studioId.trim();

    // If already syncing this studio, avoid duplicate listeners
    if (this.activeStudioId === cleanStudioId && this.activeSubscriptions.size > 0) {
      return () => this.stopRealtimeSync();
    }

    // Stop any existing subscriptions for another studio
    this.stopRealtimeSync();
    this.activeStudioId = cleanStudioId;

    const collectionsToListen = [
      'customers',
      'studio_bookings_v2',
      'events',
      'quotations',
      'payments',
      'employees',
      'tasks',
      'notifications',
      'expenses'
    ];

    collectionsToListen.forEach(colName => {
      try {
        const unsub = firestoreService.subscribeCollection<any>(
          cleanStudioId,
          colName,
          (cloudItems) => {
            if (this.isHydrating) return; // Ignore initial echo during hydration

            if (Array.isArray(cloudItems) && cloudItems.length > 0) {
              TenantStore.setFromCloud(cleanStudioId, colName, cloudItems);

              // Notify all UI consumers and tables
              if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('studio_cloud_data_updated', {
                  detail: { studioId: cleanStudioId, collection: colName, count: cloudItems.length }
                }));
                window.dispatchEvent(new Event('studio_data_updated'));
              }
            }
          },
          (err) => {
            console.warn(`[CloudSyncService] Live listener warning on ${colName}:`, err?.message);
          }
        );

        this.activeSubscriptions.set(colName, unsub);
      } catch (subErr) {
        console.warn(`[CloudSyncService] Failed to establish listener on ${colName}:`, subErr);
      }
    });

    return () => this.stopRealtimeSync();
  }

  /**
   * Cleanly terminates all active Firebase Firestore listeners.
   */
  stopRealtimeSync(): void {
    this.activeSubscriptions.forEach((unsub) => {
      try {
        unsub();
      } catch {}
    });
    this.activeSubscriptions.clear();
    this.activeStudioId = null;
  }

  /**
   * Broadcasts a local save directly to Firebase and triggers cloud save state.
   */
  async broadcastRecordSave<T extends { id: string }>(
    studioId: string,
    collection: string,
    record: T
  ): Promise<boolean> {
    if (!studioId || !collection || !record || !record.id) return false;
    
    // Save to Firestore with cloud status update
    const res = await firestoreService.saveDocument(studioId, collection, record.id, record);
    return res.success;
  }

  /**
   * Broadcasts a record deletion to Firebase.
   */
  async broadcastRecordDelete(
    studioId: string,
    collection: string,
    recordId: string
  ): Promise<boolean> {
    if (!studioId || !collection || !recordId) return false;
    return await firestoreService.deleteDocument(studioId, collection, recordId);
  }

  getSyncStats(studioId: string): CloudSyncStats | null {
    return this.lastStats.get(studioId.trim()) || null;
  }

  private createEmptyStats(): CloudSyncStats {
    return {
      customers: 0,
      bookings: 0,
      events: 0,
      quotations: 0,
      payments: 0,
      employees: 0,
      tasks: 0,
      notifications: 0,
      expenses: 0,
      lastSyncedAt: new Date().toISOString()
    };
  }
}

export const cloudSyncService = new CloudSyncService();
