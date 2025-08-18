import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDvHtJoLlqfIRlfcC0KUPFNxJ3jfhkkphk",
  authDomain: "equiprogress-b4407.firebaseapp.com",
  projectId: "equiprogress-b4407",
  storageBucket: "equiprogress-b4407.firebasestorage.app",
  messagingSenderId: "33094317334",
  appId: "1:33094317334:web:ed8b4958e9a8b845334c37",
  measurementId: "G-ZZXBSJM295"
};

const USE_FIRESTORE = process.env.NEXT_PUBLIC_USE_FIRESTORE === 'true';

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = USE_FIRESTORE ? getFirestore(app) : undefined;
const storage = USE_FIRESTORE ? getStorage(app) : undefined; // Also conditionalize storage if not needed without Firestore


export { app, auth, db, storage, USE_FIRESTORE };

