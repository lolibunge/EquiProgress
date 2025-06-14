// src/services/auth.ts
// Removed 'use server' directive

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  type User,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/firebase';
import type { UserProfile } from '@/types/firestore';

const googleProvider = new GoogleAuthProvider();

export async function signUpWithEmail(email: string, password: string): Promise<User | null> {
  console.log("[AuthService] signUpWithEmail: Attempting to sign up user:", email);
  try {
    if (!auth) {
      console.error("[AuthService] signUpWithEmail: Firebase auth service is not available.");
      throw new Error("Servicio de autenticación no disponible.");
    }
    if (!db) {
      console.error("[AuthService] signUpWithEmail: Firestore db service is not available.");
      throw new Error("Servicio de base de datos no disponible.");
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log("[AuthService] signUpWithEmail: User created in Firebase Auth:", user.uid);

    try {
      console.log("[AuthService] signUpWithEmail: Attempting to create user profile in Firestore for UID:", user.uid);
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email?.split('@')[0] || 'Usuario',
        photoURL: user.photoURL || '', // Ensure photoURL is at least an empty string
        role: 'customer', // Default role
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      console.log("[AuthService] signUpWithEmail: User profile created successfully in Firestore for UID:", user.uid);
    } catch (firestoreError) {
      console.error("[AuthService] signUpWithEmail: CRITICAL ERROR creating user profile in Firestore for UID:", user.uid, firestoreError);
      // Optional: Depending on app logic, you might want to delete the Firebase Auth user if Firestore profile creation fails.
      // For now, we just log the critical error. The user will exist in Auth but not in Firestore users collection properly.
    }
    return user;
  } catch (error) {
    console.error("[AuthService] signUpWithEmail: Error during email sign up:", error);
    throw error;
  }
}

export async function signInWithEmail(email: string, password: string): Promise<User | null> {
  console.log("[AuthService] signInWithEmail: Attempting to sign in user:", email);
  try {
    if (!auth) {
      console.error("[AuthService] signInWithEmail: Firebase auth service is not available.");
      throw new Error("Servicio de autenticación no disponible.");
    }
    if (!db) {
      console.error("[AuthService] signInWithEmail: Firestore db service is not available.");
      throw new Error("Servicio de base de datos no disponible.");
    }

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log("[AuthService] signInWithEmail: User signed in via Firebase Auth:", user.uid);
    const userDocRef = doc(db, "users", user.uid);

    try {
      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists() || !userDoc.data()?.role) {
        console.log(`[AuthService] signInWithEmail: User profile for UID ${user.uid} does not exist or role is missing. Attempting to create/update.`);
        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email?.split('@')[0] || 'Usuario',
          photoURL: user.photoURL || '',
          role: userDoc.data()?.role || 'customer',
          createdAt: userDoc.exists() ? userDoc.data()?.createdAt : serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true });
        console.log(`[AuthService] signInWithEmail: User profile created/updated successfully in Firestore for UID: ${user.uid}`);
      } else {
        console.log(`[AuthService] signInWithEmail: User profile already exists for UID ${user.uid}.`);
      }
    } catch (firestoreError) {
      console.error("[AuthService] signInWithEmail: CRITICAL ERROR checking/creating user profile in Firestore for UID:", user.uid, firestoreError);
    }
    return user;
  } catch (error) {
    console.error("[AuthService] signInWithEmail: Error during email sign in:", error);
    throw error;
  }
}

export async function signInWithGoogle(): Promise<User | null> {
  console.log("[AuthService] signInWithGoogle: Attempting Google sign in.");
  try {
    if (!auth) {
      console.error("[AuthService] signInWithGoogle: Firebase auth service is not available.");
      throw new Error("Servicio de autenticación no disponible.");
    }
    if (!db) {
      console.error("[AuthService] signInWithGoogle: Firestore db service is not available.");
      throw new Error("Servicio de base de datos no disponible.");
    }

    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    console.log("[AuthService] signInWithGoogle: User signed in via Google, UID:", user.uid);
    const userDocRef = doc(db, "users", user.uid);

    try {
      const userDoc = await getDoc(userDocRef);
      if (!userDoc.exists() || !userDoc.data()?.role) {
        console.log(`[AuthService] signInWithGoogle: User profile for UID ${user.uid} does not exist or role is missing. Attempting to create/update.`);
        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || 'Usuario',
          photoURL: user.photoURL || '',
          role: userDoc.data()?.role || 'customer',
          createdAt: userDoc.exists() ? userDoc.data()?.createdAt : serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true });
        console.log(`[AuthService] signInWithGoogle: User profile created/updated successfully in Firestore for UID: ${user.uid}`);
      } else {
        console.log(`[AuthService] signInWithGoogle: User profile already exists for UID ${user.uid}.`);
      }
    } catch (firestoreError) {
      console.error("[AuthService] signInWithGoogle: CRITICAL ERROR checking/creating user profile in Firestore for UID:", user.uid, firestoreError);
    }
    return user;
  } catch (error) {
    console.error("[AuthService] signInWithGoogle: Error during Google sign in:", error);
    throw error;
  }
}

export async function signOutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out", error);
    throw error;
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  if (!db) {
    console.error("[AuthService] getUserProfile: Firestore db service is not available. Cannot fetch profile.");
    return null;
  }
  try {
    const userDocRef = doc(db, "users", uid);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      return userDoc.data() as UserProfile;
    }
    console.warn(`[AuthService] getUserProfile: No user profile found in Firestore for UID: ${uid}`);
    return null;
  } catch (error) {
    console.error("[AuthService] getUserProfile: Error fetching user profile for UID:", uid, error);
    return null;
  }
}
