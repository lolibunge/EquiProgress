'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';

import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { auth, db, USE_FIRESTORE } from '@/lib/firebase';
import { isAdminEmail } from '@/lib/plan-visibility';
import { useToast } from '@/hooks/use-toast';

type BusyMode = 'login' | 'signup' | 'reset' | 'logout' | null;
type AuthTab = 'signup' | 'login' | 'reset';

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { user, loading } = useAuth();

  const [busyMode, setBusyMode] = useState<BusyMode>(null);
  const [activeTab, setActiveTab] = useState<AuthTab>('signup');

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupPasswordConfirm, setSignupPasswordConfirm] = useState('');

  const [resetEmail, setResetEmail] = useState('');

  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode === 'login' || mode === 'signup' || mode === 'reset') {
      setActiveTab(mode);
    }
  }, [searchParams]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyMode('login');

    try {
      await signInWithEmailAndPassword(auth, loginEmail.trim(), loginPassword);
      toast({
        title: 'Welcome back',
        description: 'You are now logged in.',
      });
      router.push('/');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Login failed',
        description: firebaseErrorMessage(error),
      });
    } finally {
      setBusyMode(null);
    }
  }

  async function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanName = signupName.trim();
    const cleanEmail = signupEmail.trim();

    if (cleanName.length < 2) {
      toast({
        variant: 'destructive',
        title: 'Invalid name',
        description: 'Please enter a student name with at least 2 characters.',
      });
      return;
    }

    if (signupPassword.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Weak password',
        description: 'Password must have at least 6 characters.',
      });
      return;
    }

    if (signupPassword !== signupPasswordConfirm) {
      toast({
        variant: 'destructive',
        title: 'Passwords do not match',
        description: 'Please enter the same password in both fields.',
      });
      return;
    }

    setBusyMode('signup');

    try {
      const credentials = await createUserWithEmailAndPassword(auth, cleanEmail, signupPassword);
      await updateProfile(credentials.user, {
        displayName: cleanName,
      });

      if (db && USE_FIRESTORE) {
        try {
          const role = isAdminEmail(credentials.user.email) ? 'admin' : 'student';
          await setDoc(
            doc(db, 'users', credentials.user.uid),
            {
              displayName: cleanName,
              email: credentials.user.email,
              role,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        } catch (syncError) {
          toast({
            variant: 'destructive',
            title: 'Account created, but cloud sync failed',
            description: firestoreErrorMessage(syncError),
          });
        }
      }

      toast({
        title: 'Account created',
        description: 'Student account is ready. You can now track progress history.',
      });
      router.push('/');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not create account',
        description: firebaseErrorMessage(error),
      });
    } finally {
      setBusyMode(null);
    }
  }

  async function handleResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanEmail = resetEmail.trim() || loginEmail.trim();
    if (!cleanEmail) {
      toast({
        variant: 'destructive',
        title: 'Email required',
        description: 'Please enter the account email to reset password.',
      });
      return;
    }

    setBusyMode('reset');

    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      toast({
        title: 'Reset link sent',
        description: `A password reset email was sent to ${cleanEmail}.`,
      });
      setActiveTab('login');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Reset failed',
        description: firebaseErrorMessage(error),
      });
    } finally {
      setBusyMode(null);
    }
  }

  async function handleLogout() {
    setBusyMode('logout');
    try {
      await signOut(auth);
      toast({
        title: 'Signed out',
        description: 'Session closed successfully.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Sign out failed',
        description: firebaseErrorMessage(error),
      });
    } finally {
      setBusyMode(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground font-body antialiased">
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <Card className="max-w-lg mx-auto">
            <CardHeader>
              <CardTitle>Loading account...</CardTitle>
              <CardDescription>Checking your session.</CardDescription>
            </CardHeader>
          </Card>
        </main>
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen bg-background text-foreground font-body antialiased">
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <Card className="max-w-lg mx-auto">
            <CardHeader>
              <CardTitle>Account active</CardTitle>
              <CardDescription>
                Logged in as {user.displayName || user.email || 'student'}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild className="w-full">
                <Link href="/history">Open progress history</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/">Back to training plans</Link>
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={handleLogout}
                disabled={busyMode === 'logout'}
              >
                {busyMode === 'logout' ? 'Signing out...' : 'Sign out'}
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-body antialiased">
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Student Accounts</CardTitle>
            <CardDescription>
              Create a student account or sign in to keep progress history saved in the cloud.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as AuthTab)}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-3 h-auto">
                <TabsTrigger value="signup">Create account</TabsTrigger>
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="reset">Reset password</TabsTrigger>
              </TabsList>

              <TabsContent value="signup">
                <form className="space-y-4 pt-4" onSubmit={handleSignup}>
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Student name</Label>
                    <Input
                      id="signup-name"
                      autoComplete="name"
                      value={signupName}
                      onChange={(event) => setSignupName(event.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      autoComplete="email"
                      value={signupEmail}
                      onChange={(event) => setSignupEmail(event.target.value)}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        autoComplete="new-password"
                        value={signupPassword}
                        onChange={(event) => setSignupPassword(event.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password-confirm">Confirm password</Label>
                      <Input
                        id="signup-password-confirm"
                        type="password"
                        autoComplete="new-password"
                        value={signupPasswordConfirm}
                        onChange={(event) => setSignupPasswordConfirm(event.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={busyMode === 'signup'}>
                    {busyMode === 'signup' ? 'Creating account...' : 'Create account'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="login">
                <form className="space-y-4 pt-4" onSubmit={handleLogin}>
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      value={loginEmail}
                      onChange={(event) => setLoginEmail(event.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      autoComplete="current-password"
                      value={loginPassword}
                      onChange={(event) => setLoginPassword(event.target.value)}
                      required
                    />
                  </div>
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-sm"
                    onClick={() => {
                      setResetEmail(loginEmail.trim());
                      setActiveTab('reset');
                    }}
                  >
                    Forgot password?
                  </Button>
                  <Button type="submit" className="w-full" disabled={busyMode === 'login'}>
                    {busyMode === 'login' ? 'Logging in...' : 'Login'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="reset">
                <form className="space-y-4 pt-4" onSubmit={handleResetPassword}>
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Account email</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      autoComplete="email"
                      value={resetEmail}
                      onChange={(event) => setResetEmail(event.target.value)}
                      required
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    We will email a secure link so the student can choose a new password.
                  </p>
                  <Button type="submit" className="w-full" disabled={busyMode === 'reset'}>
                    {busyMode === 'reset' ? 'Sending reset link...' : 'Send reset link'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => setActiveTab('login')}
                  >
                    Back to login
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            {!USE_FIRESTORE && (
              <p className="pt-4 text-sm text-muted-foreground">
                Firestore sync is currently off. Set `NEXT_PUBLIC_USE_FIRESTORE=true` to save
                student progress across devices.
              </p>
            )}

            <div className="pt-4">
              <Button variant="ghost" asChild className="w-full">
                <Link href="/">Back to home</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function firebaseErrorMessage(error: unknown): string {
  if (typeof error !== 'object' || !error || !('code' in error)) {
    return 'Please try again.';
  }

  const code = String(error.code);

  switch (code) {
    case 'auth/email-already-in-use':
      return 'This email is already used by another account.';
    case 'auth/invalid-email':
      return 'This email address is invalid.';
    case 'auth/missing-email':
      return 'Please enter your account email.';
    case 'auth/invalid-credential':
      return 'Email or password is incorrect.';
    case 'auth/user-not-found':
      return 'No account exists with this email.';
    case 'auth/wrong-password':
      return 'Incorrect password.';
    case 'auth/weak-password':
      return 'Choose a stronger password (at least 6 characters).';
    case 'auth/operation-not-allowed':
      return 'Email/password sign-in is disabled in Firebase Console.';
    case 'auth/configuration-not-found':
      return 'Firebase Auth is not configured for this project. In Firebase Console: Authentication -> Get started -> Sign-in method -> enable Email/Password.';
    case 'auth/app-not-authorized':
      return 'This domain is not authorized in Firebase Auth settings.';
    case 'auth/network-request-failed':
      return 'Network error. Check your internet connection and retry.';
    case 'auth/invalid-api-key':
      return 'Firebase API key is invalid. Check your Firebase config.';
    case 'auth/api-key-not-valid.-please-pass-a-valid-api-key.':
      return 'Firebase API key is invalid or revoked. Update NEXT_PUBLIC_FIREBASE_API_KEY.';
    case 'auth/admin-restricted-operation':
      return 'This operation is restricted by Firebase project settings.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a bit and try again.';
    default:
      return `Please verify the data and try again (${code}).`;
  }
}

function firestoreErrorMessage(error: unknown): string {
  if (typeof error !== 'object' || !error || !('code' in error)) {
    return 'Firestore write failed. You can still log in with this account.';
  }

  const code = String(error.code);

  switch (code) {
    case 'permission-denied':
      return 'Firestore rules blocked the write. Review security rules for users/{uid}.';
    case 'failed-precondition':
      return 'Firestore is not fully set up. Create/enable Firestore in Firebase Console.';
    case 'unavailable':
      return 'Firestore is temporarily unavailable. Please retry in a moment.';
    default:
      return `Firestore write failed (${code}). You can still log in with this account.`;
  }
}
