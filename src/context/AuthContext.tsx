
// src/context/AuthContext.tsx
"use client";

import type { User } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth as firebaseAuthService, db } from '@/firebase'; // Import the exported auth service
import type { UserProfile } from '@/types/firestore';
import { getUserProfile } from '@/services/auth';
import { Icons } from '@/components/icons'; // For loader icon
import { Timestamp } from 'firebase/firestore'; // Added for override

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseAuthService) {
      console.error("AuthContext: Firebase Auth service (firebaseAuthService) is not available. Firebase might not have initialized correctly. Auth features will not work.");
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(firebaseAuthService, async (user) => {
      setCurrentUser(user);
      if (user) {
        console.log(`%c[AuthContext] User authenticated: ${user.uid}. Fetching profile...`, "color: blue;");
        let profile: UserProfile | null = null;
        try {
            profile = await getUserProfile(user.uid);
            console.log(`%c[AuthContext] Profile fetched from Firestore for UID ${user.uid}:`, "color: dodgerblue;", JSON.stringify(profile, null, 2));

            // TEMPORARY OVERRIDE FOR ADMIN UID LPL3vwFZk5NDHlD8rLpaENEt5AC3
            if (user.uid === "LPL3vwFZk5NDHlD8rLpaENEt5AC3") {
              console.warn(`%c[AuthContext] SPECIAL OVERRIDE: UID ${user.uid} detected. Forcing admin role. This is a temporary measure for development.`, "color: magenta; font-weight: bold;");
              if (profile) { // If a profile was fetched (even if it's 'customer')
                profile = {
                    ...profile, // Spread existing properties
                    role: 'admin' // Ensure role is admin
                };
                console.log(`%c[AuthContext] Override: Existing profile modified to ensure admin role.`, "color: magenta;");
              } else { // If no profile was found in Firestore
                profile = {
                  uid: user.uid,
                  email: user.email,
                  displayName: user.displayName || user.email?.split('@')[0] || 'Admin (Forced)',
                  photoURL: user.photoURL || '',
                  role: 'admin',
                  // Optional: Add dummy timestamps if your UserProfile type might expect them,
                  // though the current type doesn't strictly require them.
                  // createdAt: Timestamp.now(),
                  // updatedAt: Timestamp.now(),
                };
                console.log(`%c[AuthContext] Override: No Firestore profile found, created minimal admin profile locally.`, "color: magenta;");
              }
            }
            // END TEMPORARY OVERRIDE

            console.log(`%c[AuthContext] FINAL profile object being set for UID ${user.uid}:`, "color: green; font-weight: bold;", JSON.stringify(profile, null, 2));
            setUserProfile(profile);
        } catch (error) {
            console.error("[AuthContext] Error fetching/processing user profile:", error);
            setUserProfile(null);
        }
      } else {
        console.log("%c[AuthContext] No user authenticated, setting userProfile to null.", "color: orange;");
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const value = {
    currentUser,
    userProfile,
    loading,
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Icons.spinner className="h-12 w-12 animate-spin" />
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
