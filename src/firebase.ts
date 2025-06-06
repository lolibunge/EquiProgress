
// src/firebase.ts
'use client';

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth, type Auth } from "firebase/auth";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";

// Log individual environment variables to help debug
console.log("Firebase Service: Reading Environment Variables for Firebase Config:");
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const appIdEnv = process.env.NEXT_PUBLIC_FIREBASE_APP_ID; // Renamed to avoid conflict
const measurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;

console.log("Firebase Service: NEXT_PUBLIC_FIREBASE_API_KEY:", apiKey);
console.log("Firebase Service: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:", authDomain);
console.log("Firebase Service: NEXT_PUBLIC_FIREBASE_PROJECT_ID:", projectId);
console.log("Firebase Service: NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:", storageBucket);
console.log("Firebase Service: NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:", messagingSenderId);
console.log("Firebase Service: NEXT_PUBLIC_FIREBASE_APP_ID:", appIdEnv);
console.log("Firebase Service: NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID:", measurementId);

const firebaseConfig = {
  apiKey: apiKey,
  authDomain: authDomain,
  projectId: projectId,
  storageBucket: storageBucket,
  messagingSenderId: messagingSenderId,
  appId: appIdEnv,
  measurementId: measurementId,
};

console.log("Firebase Service: Attempting to initialize Firebase with API Key:", firebaseConfig.apiKey);

let app: FirebaseApp | undefined;
let db: Firestore | undefined;
let authService: Auth | undefined;
let storageService: FirebaseStorage | undefined;
let analyticsInstance: Analytics | undefined;

let configError = false;
if (!firebaseConfig.apiKey) {
  console.error("Firebase Config Error: NEXT_PUBLIC_FIREBASE_API_KEY is missing or undefined.");
  configError = true;
}
if (!firebaseConfig.authDomain) {
  console.error("Firebase Config Error: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN is missing or undefined.");
  configError = true;
}
if (!firebaseConfig.projectId) {
  console.error("Firebase Config Error: NEXT_PUBLIC_FIREBASE_PROJECT_ID is missing or undefined.");
  configError = true;
}

if (configError) {
  console.error(
    "Firebase Service: CRITICAL FIREBASE CONFIG ERROR: One or more essential Firebase configuration variables (apiKey, authDomain, projectId) are missing or undefined. " +
    "Firebase will NOT be initialized. Please ensure these are correctly set in your environment variables (e.g., .env.local file or Vercel project settings)."
  );
} else {
  try {
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
      console.log("Firebase Service: initializeApp() called successfully. App Name:", app.name);
    } else {
      app = getApp();
      console.log("Firebase Service: getApp() called as app already exists. App Name:", app.name);
    }
  } catch (e: any) {
    console.error("Firebase Service: CRITICAL ERROR during Firebase app initialization (initializeApp or getApp):", e.message, e);
    // app will remain undefined
  }
}

// Only initialize services if app was successfully initialized
if (app && typeof app.name !== 'undefined') { // A more robust check for a valid FirebaseApp
  console.log("Firebase Service: Firebase app object appears valid. Attempting to initialize services.");
  try {
    db = getFirestore(app);
    console.log("Firebase Service: Firestore initialized.");
  } catch (e: any) {
    console.error("Firebase Service: Error initializing Firestore:", e.message, e);
  }
  try {
    authService = getAuth(app);
    console.log("Firebase Service: Auth initialized.");
  } catch (e: any) {
    console.error("Firebase Service: Error initializing Auth:", e.message, e);
  }
  try {
    storageService = getStorage(app);
    console.log("Firebase Service: Storage initialized.");
  } catch (e: any) {
    console.error("Firebase Service: Error initializing Storage:", e.message, e);
  }

  if (typeof window !== 'undefined') {
    isSupported().then((supported) => {
      if (supported) {
        if (firebaseConfig.measurementId && app) {
          try {
            analyticsInstance = getAnalytics(app);
            console.log("Firebase Service: Analytics initialized.");
          } catch(e: any) {
            console.error("Firebase Service: Error initializing Analytics:", e.message, e);
          }
        } else if (!firebaseConfig.measurementId) {
          console.log("Firebase Service: Analytics not initialized: measurementId is missing.");
        }
      } else {
        console.log("Firebase Service: Analytics not supported on this browser.");
      }
    }).catch(err => {
      console.error("Firebase Service: Error checking Analytics support:", err);
    });
  }
} else {
  if (!configError) { 
    console.error("Firebase Service: Firebase app object is undefined or invalid after initialization attempt. Services (db, auth, storage, analytics) will be undefined.");
  }
}

export { app, db, authService as auth, storageService as storage, analyticsInstance as analytics };
