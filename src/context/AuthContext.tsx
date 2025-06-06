
// src/context/AuthContext.tsx
"use client";

import type { User } from 'firebase/auth';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth as firebaseAuthService } from '@/firebase'; // Import the exported auth service
import type { UserProfile } from '@/types/firestore';
import { getUserProfile } from '@/services/auth';
import { Icons } from '@/components/icons'; // For loader icon

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
    // Check if the imported firebaseAuthService is actually initialized
    if (!firebaseAuthService) {
      console.error("AuthContext: Firebase Auth service (firebaseAuthService) is not available. Firebase might not have initialized correctly. Auth features will not work.");
      setLoading(false); // Stop loading as auth cannot proceed
      return; // Exit early
    }

    const unsubscribe = onAuthStateChanged(firebaseAuthService, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
            const profile = await getUserProfile(user.uid);
            setUserProfile(profile);
        } catch (error) {
            console.error("AuthContext: Error fetching user profile:", error);
            setUserProfile(null);
        }
      } else {
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
