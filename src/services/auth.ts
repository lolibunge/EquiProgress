// src/services/auth.ts

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  GoogleAuthProvider,
  signOut,
  type User,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, Timestamp, collection, getDocs, query, orderBy } from 'firebase/firestore';
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

    if (db) {
      await createOrUpdateUserProfile(user);
    } else {
      console.error("[AuthService] signUpWithEmail: Firestore db service is NOT available. Cannot create user profile for UID:", user.uid);
    }
    return user;
  } catch (error: any) {
    console.error(`[AuthService] signUpWithEmail: Error during email sign up: Code: ${error.code}, Message: ${error.message}`, error);
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
    
    if (db) {
      await createOrUpdateUserProfile(user);
    } else {
      console.error("[AuthService] signInWithEmail: Firestore db service is NOT available. Cannot check/create user profile for UID:", user.uid);
    }
    return user;
  } catch (error: any) {
    console.error(`[AuthService] signInWithEmail: Error during email sign in: Code: ${error.code}, Message: ${error.message}`, error);
    throw error;
  }
}

export async function signInWithGoogle(): Promise<User | null> {
  console.log("[AuthService] signInWithGoogle: Attempting Google sign in.");
  if (!auth) {
    console.error("[AuthService] signInWithGoogle: Firebase auth service is not available.");
    throw new Error("Servicio de autenticación no disponible.");
  }

  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    console.log("[AuthService] signInWithGoogle: User signed in via Google, UID:", user.uid);

    if (db) {
      await createOrUpdateUserProfile(user);
    } else {
      console.error("[AuthService] signInWithGoogle: Firestore db service is NOT available. Cannot check/create user profile for UID:", user.uid);
    }

    return user;
  } catch (error: any) {
    console.error(`[AuthService] signInWithGoogle: Error during Google sign in: Code: ${error.code}, Message: ${error.message}`, error);

    if (error.code === "auth/popup-blocked" || error.code === "auth/popup-closed-by-user") {
      console.log("[AuthService] signInWithGoogle: Falling back to signInWithRedirect.");
      await signInWithRedirect(auth, googleProvider);
      return null;
    }

    throw error;
  }
}

async function createOrUpdateUserProfile(user: User): Promise<void> {
  if (!db) {
    console.error("[AuthService] createOrUpdateUserProfile: Firestore db service is NOT available. Cannot check/create user profile for UID:", user.uid);
    return;
  }
  const userDocRef = doc(db, "users", user.uid);
  console.log("[AuthService] createOrUpdateUserProfile: Attempting to get/create user profile in Firestore for UID:", user.uid);
  try {
    const userDoc = await getDoc(userDocRef);
    if (!userDoc.exists() || !userDoc.data()?.role) {
      console.log(`[AuthService] createOrUpdateUserProfile: User profile for UID ${user.uid} does not exist or role is missing. Attempting to create/update.`);
      const profileData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email?.split('@')[0] || 'Usuario',
        photoURL: user.photoURL || '',
        role: userDoc.exists() && userDoc.data()?.role ? userDoc.data()?.role : 'customer',
        createdAt: userDoc.exists() && userDoc.data()?.createdAt ? userDoc.data()?.createdAt : serverTimestamp(),
        updatedAt: serverTimestamp() as Timestamp,
      };
      console.log(`[AuthService] createOrUpdateUserProfile: Setting user profile in Firestore for UID: ${user.uid}. Data:`, JSON.stringify(profileData, (key, value) => typeof value === 'function' ? 'FieldValue.serverTimestamp()' : value, 2));
      await setDoc(userDocRef, profileData, { merge: true });
      console.log(`[AuthService] createOrUpdateUserProfile: User profile created/updated successfully in Firestore for UID: ${user.uid}`);
    } else {
      console.log(`[AuthService] createOrUpdateUserProfile: User profile already exists for UID ${user.uid}. Role: ${userDoc.data()?.role}`);
    }
  } catch (firestoreError: any) {
    console.error(`[AuthService] createOrUpdateUserProfile: CRITICAL ERROR checking/creating user profile in Firestore for UID: ${user.uid}. Code: ${firestoreError.code}, Message: ${firestoreError.message}`, firestoreError);
  }
}

export async function signOutUser(): Promise<void> {
  try {
    if (!auth) {
      console.warn("[AuthService] signOutUser: Firebase auth service is not available, but proceeding with signOut attempt if possible.");
    }
    await signOut(auth);
    console.log("[AuthService] signOutUser: User signed out successfully.");
  } catch (error: any) {
    console.error(`[AuthService] signOutUser: Error signing out: Code: ${error.code}, Message: ${error.message}`, error);
    throw error;
  }
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  console.log("[AuthService] getUserProfile: Checking db instance before fetching profile for UID:", uid, "db is:", db ? "Available" : "MISSING/UNDEFINED");
  if (!db) {
    console.error("[AuthService] getUserProfile: Firestore db service is NOT available. Cannot fetch profile for UID:", uid);
    return null; 
  }
  try {
    console.log("[AuthService] getUserProfile: Attempting to fetch profile for UID:", uid);
    const userDocRef = doc(db, "users", uid);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
      console.log("[AuthService] getUserProfile: Profile found for UID:", uid);
      const data = userDoc.data();
      return {
        uid: data.uid,
        email: data.email || null,
        displayName: data.displayName || null,
        photoURL: data.photoURL || null,
        role: data.role || 'customer',
      } as UserProfile;
    }
    console.warn(`[AuthService] getUserProfile: No user profile found in Firestore for UID: ${uid}`);
    return null;
  } catch (error: any) {
    console.error(`[AuthService] getUserProfile: CRITICAL ERROR fetching user profile for UID: ${uid}. Code: ${error.code}, Message: ${error.message}`, error);
    return null;
  }
}

export async function getAllUserProfiles(): Promise<UserProfile[]> {
  console.log("[AuthService] getAllUserProfiles: Attempting to fetch all user profiles.");
  if (!db) {
    console.error("[AuthService] getAllUserProfiles: Firestore db service is NOT available.");
    throw new Error("Servicio de base de datos no disponible.");
  }
  try {
    const usersCollectionRef = collection(db, "users");
    const q = query(usersCollectionRef, orderBy("displayName", "asc"));
    const querySnapshot = await getDocs(q);
    const users: UserProfile[] = [];
    querySnapshot.forEach((docSnap) => {
      const data = docSnap.data();
      users.push({
        uid: data.uid,
        email: data.email || null,
        displayName: data.displayName || data.email?.split('@')[0] || 'Usuario Desconocido',
        photoURL: data.photoURL || null,
        role: data.role || 'customer',
      } as UserProfile);
    });
    console.log(`[AuthService] getAllUserProfiles: Fetched ${users.length} user profiles.`);
    return users;
  } catch (error: any) {
    console.error(`[AuthService] getAllUserProfiles: Error fetching all user profiles: Code: ${error.code}, Message: ${error.message}`, error);
    if (error.code === 'failed-precondition' && error.message.includes('index')) {
      console.error(`[AuthService] INDEX_REQUIRED: Firestore query for getAllUserProfiles likely needs an index. Please check the Firebase console. Error: ${error.message}`);
    }
    throw error;
  }
}
