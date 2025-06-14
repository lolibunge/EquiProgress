
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
import { doc, setDoc, getDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
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
    
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log("[AuthService] signUpWithEmail: User created in Firebase Auth:", user.uid);

    if (!db) {
      console.error("[AuthService] signUpWithEmail: Firestore db service is not available. Cannot create user profile for UID:", user.uid);
      // Depending on policy, you might throw an error here or let auth proceed without a profile
      // For now, we log and proceed, but getUserProfile will likely fail later.
    } else {
      try {
        console.log("[AuthService] signUpWithEmail: Attempting to create user profile in Firestore for UID:", user.uid, "using db instance:", db ? "Available" : "MISSING/UNDEFINED");
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || user.email?.split('@')[0] || 'Usuario',
          photoURL: user.photoURL || '', 
          role: 'customer', 
          createdAt: serverTimestamp() as Timestamp,
          updatedAt: serverTimestamp() as Timestamp,
        });
        console.log("[AuthService] signUpWithEmail: User profile created successfully in Firestore for UID:", user.uid);
      } catch (firestoreError: any) {
        console.error("[AuthService] signUpWithEmail: CRITICAL ERROR creating user profile in Firestore for UID:", user.uid, firestoreError.message, firestoreError);
      }
    }
    return user;
  } catch (error: any) {
    console.error("[AuthService] signUpWithEmail: Error during email sign up:", error.message, error);
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

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    console.log("[AuthService] signInWithEmail: User signed in via Firebase Auth:", user.uid);
    
    if (!db) {
      console.error("[AuthService] signInWithEmail: Firestore db service is not available. Cannot check/create user profile for UID:", user.uid);
    } else {
      const userDocRef = doc(db, "users", user.uid);
      try {
        console.log("[AuthService] signInWithEmail: Attempting to get/create user profile in Firestore for UID:", user.uid, "using db instance:", db ? "Available" : "MISSING/UNDEFINED");
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists() || !userDoc.data()?.role) {
          console.log(`[AuthService] signInWithEmail: User profile for UID ${user.uid} does not exist or role is missing. Attempting to create/update.`);
          await setDoc(userDocRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email?.split('@')[0] || 'Usuario',
            photoURL: user.photoURL || '',
            role: userDoc.data()?.role || 'customer',
            createdAt: userDoc.exists() && userDoc.data()?.createdAt ? userDoc.data()?.createdAt : serverTimestamp(),
            updatedAt: serverTimestamp() as Timestamp
          }, { merge: true });
          console.log(`[AuthService] signInWithEmail: User profile created/updated successfully in Firestore for UID: ${user.uid}`);
        } else {
          console.log(`[AuthService] signInWithEmail: User profile already exists for UID ${user.uid}. Role: ${userDoc.data()?.role}`);
        }
      } catch (firestoreError: any) {
        console.error("[AuthService] signInWithEmail: CRITICAL ERROR checking/creating user profile in Firestore for UID:", user.uid, firestoreError.message, firestoreError);
      }
    }
    return user;
  } catch (error: any) {
    console.error("[AuthService] signInWithEmail: Error during email sign in:", error.message, error);
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

    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    console.log("[AuthService] signInWithGoogle: User signed in via Google, UID:", user.uid);

    if (!db) {
      console.error("[AuthService] signInWithGoogle: Firestore db service is not available. Cannot check/create user profile for UID:", user.uid);
    } else {
      const userDocRef = doc(db, "users", user.uid);
      try {
        console.log("[AuthService] signInWithGoogle: Attempting to get/create user profile in Firestore for UID:", user.uid, "using db instance:", db ? "Available" : "MISSING/UNDEFINED");
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists() || !userDoc.data()?.role) {
          console.log(`[AuthService] signInWithGoogle: User profile for UID ${user.uid} does not exist or role is missing. Attempting to create/update.`);
          await setDoc(userDocRef, {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || 'Usuario',
            photoURL: user.photoURL || '',
            role: userDoc.data()?.role || 'customer',
            createdAt: userDoc.exists() && userDoc.data()?.createdAt ? userDoc.data()?.createdAt : serverTimestamp(),
            updatedAt: serverTimestamp() as Timestamp
          }, { merge: true });
          console.log(`[AuthService] signInWithGoogle: User profile created/updated successfully in Firestore for UID: ${user.uid}`);
        } else {
          console.log(`[AuthService] signInWithGoogle: User profile already exists for UID ${user.uid}. Role: ${userDoc.data()?.role}`);
        }
      } catch (firestoreError: any) {
        console.error("[AuthService] signInWithGoogle: CRITICAL ERROR checking/creating user profile in Firestore for UID:", user.uid, firestoreError.message, firestoreError);
      }
    }
    return user;
  } catch (error: any) {
    console.error("[AuthService] signInWithGoogle: Error during Google sign in:", error.message, error);
    throw error;
  }
}

export async function signOutUser(): Promise<void> {
  try {
    if (!auth) {
      console.warn("[AuthService] signOutUser: Firebase auth service is not available, but proceeding with signOut attempt if possible.");
      // signOut might still work if auth was somehow partially initialized or if it's a no-op
    }
    await signOut(auth);
    console.log("[AuthService] signOutUser: User signed out successfully.");
  } catch (error: any) {
    console.error("[AuthService] signOutUser: Error signing out:", error.message, error);
    throw error;
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  if (!db) {
    console.error("[AuthService] getUserProfile: Firestore db service is not available. Cannot fetch profile for UID:", uid);
    return null;
  }
  try {
    console.log("[AuthService] getUserProfile: Attempting to fetch profile for UID:", uid, "using db instance:", db ? "Available" : "MISSING/UNDEFINED");
    const userDocRef = doc(db, "users", uid);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      console.log("[AuthService] getUserProfile: Profile found for UID:", uid);
      return userDoc.data() as UserProfile;
    }
    console.warn(`[AuthService] getUserProfile: No user profile found in Firestore for UID: ${uid}`);
    return null;
  } catch (error: any) {
    console.error("[AuthService] getUserProfile: Error fetching user profile for UID:", uid, error.message, error);
    return null;
  }
}
