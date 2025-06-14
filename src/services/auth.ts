
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
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    // Create a user profile in Firestore
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || user.email?.split('@')[0] || 'Usuario', // Provide a fallback display name
      photoURL: user.photoURL || '',
      role: 'customer', // Default role
      createdAt: serverTimestamp(),
    });
    return user;
  } catch (error) {
    console.error("Error signing up with email and password", error);
    throw error;
  }
}

export async function signInWithEmail(email: string, password: string): Promise<User | null> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    // Ensure user profile exists, or create/update it (especially if role was added later)
    const user = userCredential.user;
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);
    if (!userDoc.exists() || !userDoc.data()?.role) {
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email?.split('@')[0] || 'Usuario',
        photoURL: user.photoURL || '',
        role: userDoc.data()?.role || 'customer', // Preserve existing role if present, else default
        createdAt: userDoc.exists() ? userDoc.data()?.createdAt : serverTimestamp(),
        updatedAt: serverTimestamp() // Mark as updated
      }, { merge: true }); // Merge to avoid overwriting other fields if they exist
    }
    return user;
  } catch (error) {
    console.error("Error signing in with email and password", error);
    throw error;
  }
}

export async function signInWithGoogle(): Promise<User | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    // Check if user profile exists, if not create one
    const userDocRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userDocRef);
    if (!userDoc.exists() || !userDoc.data()?.role) {
      await setDoc(userDocRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || 'Usuario',
        photoURL: user.photoURL || '',
        role: userDoc.data()?.role || 'customer', // Preserve existing role if present, else default
        createdAt: userDoc.exists() ? userDoc.data()?.createdAt : serverTimestamp(),
        updatedAt: serverTimestamp() // Mark as updated
      }, { merge: true }); // Merge to avoid overwriting other fields if they exist
    }
    return user;
  } catch (error) {
    console.error("Error signing in with Google", error);
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
  try {
    const userDocRef = doc(db, "users", uid);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      return userDoc.data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return null;
  }
}
