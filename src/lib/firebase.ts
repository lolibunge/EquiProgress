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


// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
