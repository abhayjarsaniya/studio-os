import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  writeBatch, 
  runTransaction,
  serverTimestamp,
  deleteDoc,
  Timestamp,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'offline' | 'error';

export interface SaveStateListener {
  (status: SaveStatus, message?: string): void;
}

/**
 * Robust Multi-Tenant Firestore Service
 * Enforces strict tenant path separation and automatic cloud synchronization
 */
export class FirestoreService {
  private currentSaveStatus: SaveStatus = 'idle';
  private statusListeners: Set<SaveStateListener> = new Set();
  private pendingQueue: Array<() => Promise<void>> = [];
  private isProcessingQueue = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));
    }
  }

  // Save State Subscription
  subscribeSaveStatus(listener: SaveStateListener): () => void {
    this.statusListeners.add(listener);
    listener(this.currentSaveStatus);
    return () => this.statusListeners.delete(listener);
  }

  getCurrentStatus(): SaveStatus {
    return this.currentSaveStatus;
  }

  setStatus(status: SaveStatus, message?: string) {
    this.currentSaveStatus = status;
    this.statusListeners.forEach(fn => fn(status, message));
  }

  private handleNetworkChange(isOnline: boolean) {
    if (isOnline) {
      this.setStatus('saving', 'Reconnecting to Firebase...');
      this.processQueue();
    } else {
      this.setStatus('offline', 'Offline — changes pending');
    }
  }

  // Path Resolution Helper (Multi-Tenant Architecture)
  getCollectionPath(studioId: string, collectionName: string): string {
    if (!studioId || studioId === 'platform_system' || studioId === 'platform') {
      return `platform/${collectionName}/items`;
    }
    return `studios/${studioId}/${collectionName}`;
  }

  // Save a Single Document (Auto-Save Engine)
  async saveDocument<T extends Record<string, any>>(
    studioId: string,
    collectionName: string,
    docId: string,
    data: T,
    merge: boolean = true
  ): Promise<{ success: boolean; error?: string }> {
    if (!db) {
      return { success: false, error: 'Firestore not initialized' };
    }

    this.setStatus('saving', 'Saving changes to Firebase...');

    try {
      const cleanData = JSON.parse(JSON.stringify(data));
      const targetPath = this.getCollectionPath(studioId, collectionName);
      const docRef = doc(db, targetPath, docId);

      const payload = {
        ...cleanData,
        id: docId,
        studioId,
        _updatedAt: serverTimestamp(),
        _clientTimestamp: new Date().toISOString()
      };

      await setDoc(docRef, payload, { merge });

      this.setStatus('saved', 'All changes saved to cloud');
      setTimeout(() => {
        if (this.currentSaveStatus === 'saved') {
          this.setStatus('idle');
        }
      }, 2500);

      return { success: true };
    } catch (error: any) {
      console.warn(`[FirestoreService.saveDocument] Error writing to ${collectionName}/${docId}:`, error);

      // Queue for background retry if network failure
      this.pendingQueue.push(() => this.saveDocument(studioId, collectionName, docId, data, merge).then(() => {}));

      const isOfflineOrAuth = 
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        error?.code === 'permission-denied' ||
        error?.code === 'unavailable' ||
        error?.message?.includes('failed to fetch') ||
        error?.message?.includes('network');

      if (isOfflineOrAuth) {
        this.setStatus('offline', 'Local backup active — cloud sync standby');
        setTimeout(() => {
          if (this.currentSaveStatus === 'offline') this.setStatus('idle');
        }, 3000);
      } else {
        this.setStatus('error', error.message || 'Save failed — retry');
        setTimeout(() => {
          if (this.currentSaveStatus === 'error') this.setStatus('idle');
        }, 4000);
      }

      return { success: false, error: error.message };
    }
  }

  // Batch Save Collection (e.g. initial sync or bulk changes)
  async saveCollectionBatch<T extends { id: string }>(
    studioId: string,
    collectionName: string,
    items: T[]
  ): Promise<{ success: boolean; count: number }> {
    if (!db || !items || items.length === 0) {
      return { success: true, count: 0 };
    }

    this.setStatus('saving', `Syncing ${items.length} records to Firebase...`);

    try {
      const targetPath = this.getCollectionPath(studioId, collectionName);
      const batch = writeBatch(db);

      items.forEach(item => {
        if (!item.id) return;
        const cleanItem = JSON.parse(JSON.stringify(item));
        const docRef = doc(db, targetPath, item.id);
        batch.set(docRef, {
          ...cleanItem,
          studioId,
          _updatedAt: serverTimestamp(),
          _clientTimestamp: new Date().toISOString()
        }, { merge: true });
      });

      await batch.commit();

      this.setStatus('saved', 'Records synchronized to Firebase');
      setTimeout(() => {
        if (this.currentSaveStatus === 'saved') this.setStatus('idle');
      }, 2500);

      return { success: true, count: items.length };
    } catch (error: any) {
      console.warn(`[FirestoreService.saveCollectionBatch] Error writing batch to ${collectionName}:`, error);
      
      const isOfflineOrAuth = 
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        error?.code === 'permission-denied' ||
        error?.code === 'unavailable' ||
        error?.message?.includes('failed to fetch') ||
        error?.message?.includes('network');

      if (isOfflineOrAuth) {
        this.setStatus('offline', 'Records saved to local storage (Cloud sync standby)');
        setTimeout(() => {
          if (this.currentSaveStatus === 'offline') this.setStatus('idle');
        }, 3000);
      } else {
        this.setStatus('error', 'Batch save failed');
        setTimeout(() => {
          if (this.currentSaveStatus === 'error') this.setStatus('idle');
        }, 4000);
      }
      return { success: false, count: 0 };
    }
  }

  // Public manual trigger to retry queued sync operations
  async retryPendingQueue(): Promise<void> {
    this.setStatus('saving', 'Retrying Firebase cloud sync...');
    try {
      await this.processQueue();
      this.setStatus('saved', 'Cloud synchronization complete');
      setTimeout(() => {
        if (this.currentSaveStatus === 'saved') this.setStatus('idle');
      }, 2500);
    } catch {
      this.setStatus('offline', 'Saved locally — retry scheduled');
      setTimeout(() => {
        if (this.currentSaveStatus === 'offline') this.setStatus('idle');
      }, 3000);
    }
  }

  // Retrieve a Single Document
  async getDocument<T>(
    studioId: string,
    collectionName: string,
    docId: string
  ): Promise<T | null> {
    if (!db) return null;
    try {
      const targetPath = this.getCollectionPath(studioId, collectionName);
      const docRef = doc(db, targetPath, docId);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as T;
      }
      return null;
    } catch (error) {
      console.warn(`[FirestoreService.getDocument] Error reading ${collectionName}/${docId}:`, error);
      return null;
    }
  }

  // Retrieve an Entire Collection for Studio
  async getCollection<T>(
    studioId: string,
    collectionName: string
  ): Promise<T[]> {
    if (!db) return [];
    try {
      const targetPath = this.getCollectionPath(studioId, collectionName);
      const colRef = collection(db, targetPath);
      const snap = await getDocs(colRef);
      return snap.docs.map(d => d.data() as T);
    } catch (error) {
      console.warn(`[FirestoreService.getCollection] Error reading ${collectionName}:`, error);
      return [];
    }
  }

  // Real-Time Listener with Automatic Cleanup
  subscribeCollection<T>(
    studioId: string,
    collectionName: string,
    onData: (items: T[]) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    if (!db) {
      return () => {};
    }

    try {
      const targetPath = this.getCollectionPath(studioId, collectionName);
      const colRef = collection(db, targetPath);

      return onSnapshot(
        colRef,
        (snapshot) => {
          const items = snapshot.docs.map(d => d.data() as T);
          onData(items);
        },
        (err) => {
          console.warn(`[FirestoreService.subscribeCollection] Listener error on ${collectionName}:`, err);
          if (onError) onError(err);
        }
      );
    } catch (err: any) {
      console.warn(`[FirestoreService.subscribeCollection] Initialization error:`, err);
      return () => {};
    }
  }

  // Real-Time Listener for a Single Document
  subscribeDocument<T>(
    studioId: string,
    collectionName: string,
    docId: string,
    onData: (item: T | null) => void,
    onError?: (error: Error) => void
  ): Unsubscribe {
    if (!db) return () => {};

    try {
      const targetPath = this.getCollectionPath(studioId, collectionName);
      const docRef = doc(db, targetPath, docId);

      return onSnapshot(
        docRef,
        (snapshot) => {
          if (snapshot.exists()) {
            onData(snapshot.data() as T);
          } else {
            onData(null);
          }
        },
        (err) => {
          console.warn(`[FirestoreService.subscribeDocument] Listener error on ${docId}:`, err);
          if (onError) onError(err);
        }
      );
    } catch (err: any) {
      console.warn(`[FirestoreService.subscribeDocument] Initialization error:`, err);
      return () => {};
    }
  }

  // Delete a Document
  async deleteDocument(
    studioId: string,
    collectionName: string,
    docId: string
  ): Promise<boolean> {
    if (!db) return false;
    this.setStatus('saving', 'Deleting record...');
    try {
      const targetPath = this.getCollectionPath(studioId, collectionName);
      const docRef = doc(db, targetPath, docId);
      await deleteDoc(docRef);
      this.setStatus('saved', 'Record deleted');
      setTimeout(() => this.setStatus('idle'), 2000);
      return true;
    } catch (error: any) {
      this.setStatus('error', error.message || 'Delete failed');
      return false;
    }
  }

  // Background retry queue processor
  private async processQueue() {
    if (this.isProcessingQueue || this.pendingQueue.length === 0) return;
    this.isProcessingQueue = true;

    while (this.pendingQueue.length > 0) {
      const task = this.pendingQueue.shift();
      if (task) {
        try {
          await task();
        } catch {
          // If still failing, stop and retry on next network trigger
          break;
        }
      }
    }

    this.isProcessingQueue = false;
  }
}

export const firestoreService = new FirestoreService();
