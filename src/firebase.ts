
'use client';

// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getStorage } from 'firebase/storage';
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional

// IMPORTANTE: Reemplaza la siguiente configuración con la configuración real de tu proyecto Firebase.
// Especialmente, la 'apiKey' DEBE SER LA REAL DE TU PROYECTO.
// El error 'auth/configuration-not-found' suele ocurrir si la apiKey es incorrecta
// o si los métodos de autenticación (ej. Email/Password, Google) no están habilitados
// en la consola de Firebase (Authentication -> Sign-in method).
const firebaseConfig = {
  apiKey: "AIzaSyBmYwqWxbQRVQ5tZ-VgiscagoUfNYBZ1Q0", // <-- !!! REEMPLAZA ESTA CLAVE !!!
  authDomain: "equiprogress.firebaseapp.com",
  projectId: "equiprogress",
  storageBucket: "equiprogress.firebasestorage.app",
  messagingSenderId: "336154971034",
  appId: "1:336154971034:web:3a3e519c02b84d96894823"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      getAnalytics(app);
    }
  });
}

