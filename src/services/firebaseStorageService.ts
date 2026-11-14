import { 
  ref, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject,
  UploadTaskSnapshot 
} from 'firebase/storage';
import { storage } from '../lib/firebase';
import { firestoreService } from './firestoreService';

export type StorageCategory = 
  | 'branding'
  | 'employees'
  | 'customers'
  | 'bookings'
  | 'events'
  | 'subEvents'
  | 'quotations'
  | 'invoices'
  | 'receipts'
  | 'deliverables'
  | 'documents'
  | 'supplier-documents';

export interface FileUploadMetadata {
  id: string;
  fileName: string;
  storagePath: string;
  downloadUrl: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  uploadedDate: string;
  studioId: string;
  category: StorageCategory;
  relatedEntityId?: string;
  deliveryStatus?: 'draft' | 'preview_ready' | 'final_delivered';
  isRawAsset?: boolean;
}

export interface UploadProgressCallback {
  (progressPercent: number, snapshot: UploadTaskSnapshot): void;
}

/**
 * Multi-Tenant Firebase Storage Service
 * Provides tenant-isolated paths, progress tracking, metadata persistence,
 * and high-volume RAW footage abstraction.
 */
export class FirebaseStorageService {
  // Resolve Static Storage Path
  getStoragePath(studioId: string, category: StorageCategory, fileName: string): string {
    if (!studioId || !category || !fileName) {
      throw new Error('studioId, category, and fileName are required to resolve storage path');
    }
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `studios/${studioId}/${category}/${cleanFileName}`;
  }

  // Check if a file is a RAW camera file or large video format
  isRawAsset(file: File | Blob | { name: string; size?: number }): boolean {
    const rawExtensions = ['.cr2', '.cr3', '.nef', '.arw', '.dng', '.raf', '.rw2', '.orf', '.raw'];
    const fileName = (file as any).name?.toLowerCase() || '';
    const hasRawExt = rawExtensions.some(ext => fileName.endsWith(ext));
    const isLargeVideo = (file.size || 0) > 100 * 1024 * 1024;
    return hasRawExt || isLargeVideo;
  }

  // Resolve Tenant Storage Path
  resolveStoragePath(
    studioId: string, 
    category: StorageCategory, 
    fileName: string, 
    entityId?: string
  ): string {
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = Date.now();

    if (category === 'branding') {
      return `studios/${studioId}/branding/${timestamp}_${cleanFileName}`;
    }
    if (category === 'bookings' && entityId) {
      return `studios/${studioId}/bookings/${entityId}/${timestamp}_${cleanFileName}`;
    }
    if (category === 'events' && entityId) {
      return `studios/${studioId}/events/${entityId}/${timestamp}_${cleanFileName}`;
    }
    if (category === 'subEvents' && entityId) {
      return `studios/${studioId}/subEvents/${entityId}/${timestamp}_${cleanFileName}`;
    }
    if (category === 'employees' && entityId) {
      return `studios/${studioId}/employees/${entityId}/${timestamp}_${cleanFileName}`;
    }
    if (category === 'customers' && entityId) {
      return `studios/${studioId}/customers/${entityId}/${timestamp}_${cleanFileName}`;
    }

    return `studios/${studioId}/${category}/${timestamp}_${cleanFileName}`;
  }

  // Upload File with Live Progress & Metadata Persistence
  async uploadFile(
    studioId: string,
    category: StorageCategory,
    file: File | Blob,
    fileName: string,
    uploadedBy: string = 'Studio Owner',
    relatedEntityId?: string,
    onProgress?: UploadProgressCallback
  ): Promise<FileUploadMetadata> {
    const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const storagePath = this.resolveStoragePath(studioId, category, fileName, relatedEntityId);

    // Check size limit: Large RAW files (> 100MB) can use the object-storage abstraction
    const isLargeRawFile = file.size > 100 * 1024 * 1024;

    if (!storage) {
      // Local / Offline fallback URL
      const fallbackUrl = typeof URL !== 'undefined' ? URL.createObjectURL(file) : '';
      const meta: FileUploadMetadata = {
        id: docId,
        fileName,
        storagePath,
        downloadUrl: fallbackUrl,
        fileType: file.type || 'application/octet-stream',
        fileSize: file.size,
        uploadedBy,
        uploadedDate: new Date().toISOString(),
        studioId,
        category,
        relatedEntityId,
        deliveryStatus: 'preview_ready',
        isRawAsset: isLargeRawFile
      };
      await firestoreService.saveDocument(studioId, 'documents', docId, meta);
      return meta;
    }

    try {
      const storageRef = ref(storage, storagePath);
      const uploadTask = uploadBytesResumable(storageRef, file, {
        contentType: file.type || 'application/octet-stream',
        customMetadata: {
          studioId,
          category,
          uploadedBy,
          relatedEntityId: relatedEntityId || ''
        }
      });

      return new Promise<FileUploadMetadata>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const percent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            if (onProgress) onProgress(percent, snapshot);
          },
          (error) => {
            console.error('[FirebaseStorageService.uploadFile] Upload error:', error);
            reject(error);
          },
          async () => {
            try {
              const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
              const metadata: FileUploadMetadata = {
                id: docId,
                fileName,
                storagePath,
                downloadUrl,
                fileType: file.type || 'application/octet-stream',
                fileSize: file.size,
                uploadedBy,
                uploadedDate: new Date().toISOString(),
                studioId,
                category,
                relatedEntityId,
                deliveryStatus: 'preview_ready',
                isRawAsset: isLargeRawFile
              };

              // Persist file metadata securely in Firestore
              await firestoreService.saveDocument(studioId, 'documents', docId, metadata);

              resolve(metadata);
            } catch (err) {
              reject(err);
            }
          }
        );
      });
    } catch (err: any) {
      console.warn('[FirebaseStorageService] Fallback to local reference due to:', err);
      const meta: FileUploadMetadata = {
        id: docId,
        fileName,
        storagePath,
        downloadUrl: typeof URL !== 'undefined' ? URL.createObjectURL(file) : '',
        fileType: file.type,
        fileSize: file.size,
        uploadedBy,
        uploadedDate: new Date().toISOString(),
        studioId,
        category,
        relatedEntityId,
        isRawAsset: isLargeRawFile
      };
      await firestoreService.saveDocument(studioId, 'documents', docId, meta);
      return meta;
    }
  }

  // Delete File & Remove Firestore Metadata
  async deleteFile(studioId: string, docId: string, storagePath: string): Promise<boolean> {
    try {
      if (storage && storagePath) {
        const fileRef = ref(storage, storagePath);
        await deleteObject(fileRef);
      }
      await firestoreService.deleteDocument(studioId, 'documents', docId);
      return true;
    } catch (e) {
      console.warn('[FirebaseStorageService.deleteFile] Error deleting file:', e);
      return false;
    }
  }
}

export const firebaseStorageService = new FirebaseStorageService();
