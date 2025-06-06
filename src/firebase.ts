// src/firebase.ts
'use client';

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";

// Log individual environment variables to help debug
console.log("Reading Environment Variables for Firebase Config:");
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
const measurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;

console.log("NEXT_PUBLIC_FIREBASE_API_KEY:", apiKey);
console.log("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:", authDomain);
console.log("NEXT_PUBLIC_FIREBASE_PROJECT_ID:", projectId);
console.log("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:", storageBucket);
console.log("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:", messagingSenderId);
console.log("NEXT_PUBLIC_FIREBASE_APP_ID:", appId);
console.log("NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID:", measurementId);

// Your web app's Firebase configuration using environment variables
const firebaseConfig = {
  apiKey: apiKey,
  authDomain: authDomain,
  projectId: projectId,
  storageBucket: storageBucket,
  messagingSenderId: messagingSenderId,
  appId: appId,
  measurementId: measurementId,
};

console.log("Attempting to initialize Firebase with API Key:", firebaseConfig.apiKey);

// Specific checks for essential config values
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

// General critical error message if any of the main three are missing
if (configError) {
  console.error(
    "CRITICAL FIREBASE CONFIG ERROR: One or more essential Firebase configuration variables (apiKey, authDomain, projectId) are missing or undefined. " +
    "Please ensure these (e.g., NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, NEXT_PUBLIC_FIREBASE_PROJECT_ID) " +
    "are correctly set in your environment variables (e.g., .env.local file or Vercel project settings) AND that they are being accessed correctly by the application."
  );
  // You might want to throw an error here in a real app to halt execution,
  // or handle this state gracefully in your UI.
  // For now, we'll let initialization proceed, which will likely fail with auth/invalid-api-key if apiKey is missing,
  // or other errors if different essential keys are missing.
}

// Initialize Firebase
let app: FirebaseApp;
// Check if all essential keys are present before attempting to initialize
// This prevents Firebase from throwing its own "invalid-api-key" if apiKey is just one of the missing ones.
if (firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId) {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
} else {
  // If essential config is missing, we cannot initialize Firebase.
  // Log this and set app to a state that downstream services can check.
  // However, for this example, we'll let the individual service initializations (getAuth, getFirestore) fail
  // if 'app' is not properly initialized. A more robust app might handle this by not initializing services.
  console.error("Firebase app NOT initialized due to missing critical configuration.");
  // To prevent "app is not defined" errors later, we might assign a dummy or handle this more gracefully.
  // For now, this structure will lead to errors in getAuth/getFirestore if config is bad.
  // This is acceptable for now as the primary issue is the missing env vars.
}

// @ts-ignore app might not be initialized if config is missing
export const db = getFirestore(app);
// @ts-ignore app might not be initialized if config is missing
export const auth = getAuth(app);
// @ts-ignore app might not be initialized if config is missing
export const storage = getStorage(app);

// Initialize Analytics if supported (client-side only)
let analyticsInstance: Analytics | undefined;
if (typeof window !== 'undefined' && app) { // Ensure app is initialized before trying to use it
  isSupported().then((supported) => {
    if (supported) {
      if (firebaseConfig.measurementId) { // Only initialize if measurementId is present
        analyticsInstance = getAnalytics(app);
        console.log("Firebase Analytics initialized");
      } else {
        console.log("Firebase Analytics not initialized: measurementId is missing in firebaseConfig.");
      }
    } else {
      console.log("Firebase Analytics not supported on this browser.");
    }
  }).catch(err => {
    console.error("Error checking Firebase Analytics support:", err);
  });
}

export { app, analyticsInstance as analytics };
