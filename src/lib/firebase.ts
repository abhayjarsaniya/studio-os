import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, Firestore } from 'firebase/firestore';
import { getAuth, connectAuthEmulator, Auth, GoogleAuthProvider } from 'firebase/auth';
import { getStorage, connectStorageEmulator, FirebaseStorage } from 'firebase/storage';

const env = (typeof import.meta !== 'undefined' && import.meta.env) ? import.meta.env : (typeof process !== 'undefined' ? process.env : {}) as any;

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || 'AIzaSyBdN6SpgPVAVD6JPEHbnfa_I2wM6BEodhk',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || 'studio-os-live-2026.firebaseapp.com',
  projectId: env.VITE_FIREBASE_PROJECT_ID || 'studio-os-live-2026',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || 'studio-os-live-2026.firebasestorage.app',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || '851069455245',
  appId: env.VITE_FIREBASE_APP_ID || '1:851069455245:web:c36ea75fb5b132b5cb4bc4'
};

// Check if Firebase is enabled or in offline preview
export const isAuthBypassed = env.VITE_AUTH_BYPASS === 'true';
export const useEmulator = env.VITE_USE_FIREBASE_EMULATOR === 'true';

let app: FirebaseApp;
let db: Firestore;
let auth: Auth;
let storage: FirebaseStorage;
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

try {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  db = getFirestore(app);
  auth = getAuth(app);
  storage = getStorage(app);

  if (useEmulator && typeof window !== 'undefined') {
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectAuthEmulator(auth, 'http://localhost:9099');
    connectStorageEmulator(storage, 'localhost', 9199);
  }
} catch (error) {
  console.warn('Firebase initialization in preview mode:', error);
}

export { app, db, auth, storage, googleProvider };
