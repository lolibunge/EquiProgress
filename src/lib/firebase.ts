import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? 'AIzaSyA39oF4_4qR9Z8FC8s5b8lqxcq5u2q8DTM',
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? 'equiprogress-jwd99.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? 'equiprogress-jwd99',
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? 'equiprogress-jwd99.firebasestorage.app',
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '679530195774',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? '1:679530195774:web:f53ad805be1bb997969a6f',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? 'G-ZZXBSJM295',
};

const USE_FIRESTORE = process.env.NEXT_PUBLIC_USE_FIRESTORE === 'true';

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = USE_FIRESTORE ? getFirestore(app) : undefined;
const storage = USE_FIRESTORE ? getStorage(app) : undefined; // Also conditionalize storage if not needed without Firestore


export { app, auth, db, storage, USE_FIRESTORE };
