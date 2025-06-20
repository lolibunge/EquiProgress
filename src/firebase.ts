
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

console.log("Firebase Service: NEXT_PUBLIC_FIREBASE_API_KEY:", apiKey ? "SET" : "NOT SET");
console.log("Firebase Service: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:", authDomain ? `SET (Value: ${authDomain})` : "NOT SET");
console.log("Firebase Service: NEXT_PUBLIC_FIREBASE_PROJECT_ID:", projectId ? `SET (Value: ${projectId})` : "NOT SET");
console.log("Firebase Service: NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:", storageBucket ? "SET" : "NOT SET");
console.log("Firebase Service: NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:", messagingSenderId ? "SET" : "NOT SET");
console.log("Firebase Service: NEXT_PUBLIC_FIREBASE_APP_ID:", appIdEnv ? "SET" : "NOT SET");
console.log("Firebase Service: NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID:", measurementId ? "SET" : "NOT SET");


const firebaseConfig = {
  apiKey: apiKey,
  authDomain: authDomain,
  projectId: projectId,
  storageBucket: storageBucket,
  messagingSenderId: messagingSenderId,
  appId: appIdEnv,
  measurementId: measurementId,
};

let app: FirebaseApp | undefined;
let db: Firestore | undefined;
let authService: Auth | undefined;
let storageService: FirebaseStorage | undefined;
let analyticsInstance: Analytics | undefined;

let configError = false;
if (!firebaseConfig.apiKey) {
  console.error("Firebase Service: CRITICAL Firebase Config Error: NEXT_PUBLIC_FIREBASE_API_KEY is missing or undefined.");
  configError = true;
}
if (!firebaseConfig.authDomain) {
  console.error("Firebase Service: CRITICAL Firebase Config Error: NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN is missing or undefined.");
  configError = true;
}
if (!firebaseConfig.projectId) {
  console.error("Firebase Service: CRITICAL Firebase Config Error: NEXT_PUBLIC_FIREBASE_PROJECT_ID is missing or undefined.");
  configError = true;
}

if (configError) {
  console.error(
    "Firebase Service: CRITICAL FIREBASE CONFIG ERROR: One or more essential Firebase configuration variables (apiKey, authDomain, projectId) are missing or undefined. " +
    "Firebase will NOT be initialized. Please ensure these are correctly set in your environment variables (e.g., .env.local file or Vercel project settings)."
  );
} else {
  console.log("Firebase Service: Firebase config seems present. Attempting to initialize Firebase app...");
  console.log("Firebase Service: Using Auth Domain in config for initializeApp:", firebaseConfig.authDomain); // Added this line
  try {
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
      console.log("Firebase Service: initializeApp() called successfully. App Name:", app.name);
    } else {
      app = getApp();
      console.log("Firebase Service: getApp() called as app already exists. App Name:", app.name);
    }
    // **** VERY IMPORTANT LOG ****
    console.log(`%cFirebase Service: APP INITIALIZED FOR PROJECT ID: ${app.options.projectId}`, "color: green; font-weight: bold; font-size: 1.2em;");
    if (app.options.projectId !== firebaseConfig.projectId) {
      console.warn(`%cFirebase Service: WARNING! App Project ID (${app.options.projectId}) differs from firebaseConfig.projectId (${firebaseConfig.projectId}). This might indicate an issue if multiple initializations or configurations are present.`, "color: orange; font-weight: bold;");
    }
    // ***************************

  } catch (e: any) {
    console.error("Firebase Service: CRITICAL ERROR during Firebase app initialization (initializeApp or getApp):", e.message, e);
    app = undefined; // Ensure app is undefined if initialization fails
  }
}

if (app && typeof app.name !== 'undefined') {
  console.log("Firebase Service: Firebase app object appears valid. Attempting to initialize services.");
  try {
    db = getFirestore(app);
    console.log("Firebase Service: Firestore initialized successfully. `db` instance should be available.");
  } catch (e: any) {
    console.error("Firebase Service: CRITICAL ERROR initializing Firestore:", e.message, e);
    db = undefined;
  }
  try {
    authService = getAuth(app);
    console.log("Firebase Service: Auth initialized successfully.");
  } catch (e: any) {
    console.error("Firebase Service: CRITICAL ERROR initializing Auth:", e.message, e);
    authService = undefined;
  }
  try {
    storageService = getStorage(app);
    console.log("Firebase Service: Storage initialized successfully.");
  } catch (e: any) {
    console.error("Firebase Service: CRITICAL ERROR initializing Storage:", e.message, e);
    storageService = undefined;
  }

  if (typeof window !== 'undefined') {
    isSupported().then((supported) => {
      if (supported) {
        if (firebaseConfig.measurementId && app) {
          try {
            analyticsInstance = getAnalytics(app);
            console.log("Firebase Service: Analytics initialized successfully.");
          } catch(e: any) {
            console.error("Firebase Service: CRITICAL ERROR initializing Analytics:", e.message, e);
            analyticsInstance = undefined;
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
  console.log("Firebase Service: `db` instance is currently:", db === undefined ? "undefined" : "defined (but may not be functional if app init failed)");
}

export { app, db, authService as auth, storageService as storage, analyticsInstance as analytics };
