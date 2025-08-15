import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  "projectId": "equiprogress-jwd99",
  "appId": "1:679530195774:web:f53ad805be1bb997969a6f",
  "storageBucket": "equiprogress-jwd99.firebasestorage.app",
  "apiKey": "AIzaSyA39oF4_4qR9Z8FC8s5b8lqxcq5u2q8DTM",
  "authDomain": "equiprogress-jwd99.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "679530195774"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
