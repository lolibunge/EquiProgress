import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  projectId: 'equiprogress-b4407',
  appId: '1:33094317334:web:your-app-id', // This will be populated by Firebase
  storageBucket: 'equiprogress-b4407.appspot.com',
  apiKey: 'AlzaSyDvHt.JoLlqfIRIfcC0KUPFNxJ3jfhkkphk',
  authDomain: 'equiprogress-b4407.firebaseapp.com',
  messagingSenderId: '33094317334',
};

// A more robust way to get the app config from what the user provided.
const finalConfig = {
  projectId: 'equiprogress-b4407',
  apiKey: 'AlzaSyDvHtJoLlqfIRIfcC0KUPFNxJ3jfhkkphk',
  authDomain: 'equiprogress-b4407.firebaseapp.com',
  storageBucket: 'equiprogress-b4407.appspot.com',
  messagingSenderId: '33094317334',
  appId: `1:${'33094317334'}:web:f53ad805be1bb997969a6f`, // Placeholder App ID, actual value not in screenshot.
  measurementId: 'G-XXXXXXXXXX', // Placeholder, not in screenshot
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(finalConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
