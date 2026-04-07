'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState, type FormEvent } from 'react';
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
import { PRICING, getTrialNotice, getTrialStatus } from '@/lib/pricing';
import { useToast } from '@/hooks/use-toast';

type BusyMode = 'login' | 'signup' | 'reset' | 'logout' | null;
type AuthTab = 'signup' | 'login' | 'reset';
type ResetStatus =
  | {
      type: 'success' | 'error';
      message: string;
    }
  | null;

export default function AuthPage() {
  return (
    <Suspense fallback={<AuthPageLoading />}>
      <AuthPageContent />
    </Suspense>
  );
}

function AuthPageContent() {
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
  const [resetStatus, setResetStatus] = useState<ResetStatus>(null);
  const isAdmin = isAdminEmail(user?.email);
  const trialStatus = !isAdmin && user ? getTrialStatus(user.metadata.creationTime) : null;

  useEffect(() => {
    const mode = searchParams.get('mode');
    if (mode === 'login' || mode === 'signup' || mode === 'reset') {
      setActiveTab(mode);
    }
  }, [searchParams]);

  useEffect(() => {
    if (activeTab !== 'reset') {
      return;
    }

    if (!resetEmail.trim() && loginEmail.trim()) {
      setResetEmail(loginEmail.trim());
    }
  }, [activeTab, loginEmail, resetEmail]);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyMode('login');

    try {
      await signInWithEmailAndPassword(auth, loginEmail.trim(), loginPassword);
      toast({
        title: 'Bienvenida',
        description: 'Sesión iniciada correctamente.',
      });
      router.push('/');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'No se pudo iniciar sesión',
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
        title: 'Nombre inválido',
        description: 'Ingresa un nombre de estudiante con al menos 2 caracteres.',
      });
      return;
    }

    if (signupPassword.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Contraseña débil',
        description: 'La contraseña debe tener al menos 6 caracteres.',
      });
      return;
    }

    if (signupPassword !== signupPasswordConfirm) {
      toast({
        variant: 'destructive',
        title: 'Las contraseñas no coinciden',
        description: 'Ingresa la misma contraseña en ambos campos.',
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
            title: 'Cuenta creada, pero falló la sincronización en la nube',
            description: firestoreErrorMessage(syncError),
          });
        }
      }

      toast({
        title: 'Cuenta creada',
        description: 'La cuenta del estudiante está lista. Ya puede registrar su progreso.',
      });
      router.push('/');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'No se pudo crear la cuenta',
        description: firebaseErrorMessage(error),
      });
    } finally {
      setBusyMode(null);
    }
  }

  async function handleResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setResetStatus(null);

    const cleanEmail = resetEmail.trim() || loginEmail.trim() || user?.email?.trim() || '';
    if (!cleanEmail) {
      const message = 'Ingresa el email de la cuenta para restablecer la contraseña.';
      setResetStatus({
        type: 'error',
        message,
      });
      toast({
        variant: 'destructive',
        title: 'Email requerido',
        description: message,
      });
      return;
    }

    setBusyMode('reset');

    try {
      await sendPasswordResetEmail(auth, cleanEmail);
      setResetEmail(cleanEmail);
      setResetStatus({
        type: 'success',
        message: `Enlace enviado a ${cleanEmail}. Revisa tu bandeja y carpeta de spam.`,
      });
      toast({
        title: 'Enlace enviado',
        description: `Enviamos un email para restablecer la contraseña a ${cleanEmail}.`,
      });
    } catch (error) {
      const message = firebaseErrorMessage(error);
      setResetStatus({
        type: 'error',
        message,
      });
      toast({
        variant: 'destructive',
        title: 'No se pudo restablecer',
        description: message,
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
        title: 'Sesión cerrada',
        description: 'La sesión se cerró correctamente.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'No se pudo cerrar sesión',
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
              <CardTitle>Cargando cuenta...</CardTitle>
              <CardDescription>Verificando tu sesión.</CardDescription>
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
              <CardTitle>Cuenta activa</CardTitle>
              <CardDescription>
                Sesión iniciada como {user.displayName || user.email || 'estudiante'}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {!isAdmin && trialStatus && (
                <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2">
                  <p className="text-sm font-medium">
                    {trialStatus.isExpired
                      ? `Tu prueba de ${PRICING.trialDays} días finalizó.`
                      : `Te quedan ${trialStatus.remainingDays} ${
                          trialStatus.remainingDays === 1 ? 'día' : 'días'
                        } para completar tu prueba de ${PRICING.trialDays} días.`}
                  </p>
                  {!trialStatus.isExpired && trialStatus.endsAt && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Finaliza el {formatShortDate(trialStatus.endsAt)}.
                    </p>
                  )}
                </div>
              )}
              <Button asChild className="w-full">
                <Link href="/history">Abrir historial de progreso</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/">Volver a planes de entrenamiento</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/feedback">Enviar opinión</Link>
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={handleLogout}
                disabled={busyMode === 'logout'}
              >
                {busyMode === 'logout' ? 'Cerrando sesión...' : 'Cerrar sesión'}
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
            <CardTitle>Cuentas de estudiantes</CardTitle>
            <CardDescription>
              Crea una cuenta de estudiante o inicia sesión para guardar el historial en la nube.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs
              value={activeTab}
              onValueChange={(value) => {
                const nextTab = value as AuthTab;
                setActiveTab(nextTab);
                if (nextTab !== 'reset') {
                  setResetStatus(null);
                }
              }}
              className="w-full"
            >
              <TabsList className="grid w-full h-auto grid-cols-2 sm:grid-cols-3 gap-1">
                <TabsTrigger
                  value="signup"
                  className="h-auto text-center leading-tight px-3 py-2"
                >
                  Crear cuenta
                </TabsTrigger>
                <TabsTrigger
                  value="login"
                  className="h-auto text-center leading-tight px-3 py-2"
                >
                  Iniciar sesión
                </TabsTrigger>
                <TabsTrigger
                  value="reset"
                  className="h-auto text-center leading-tight px-3 py-2 col-span-2 sm:col-span-1"
                >
                  Restablecer contraseña
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signup">
                <form className="space-y-4 pt-4" onSubmit={handleSignup}>
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Nombre del estudiante</Label>
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
                      <Label htmlFor="signup-password">Contraseña</Label>
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
                      <Label htmlFor="signup-password-confirm">Confirmar contraseña</Label>
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
                    {busyMode === 'signup' ? 'Creando cuenta...' : 'Crear cuenta'}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    {getTrialNotice()}{' '}
                    <Link href="/pricing" className="underline underline-offset-2 hover:text-primary">
                      Ver detalles de la prueba
                    </Link>
                    .
                  </p>
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
                    <Label htmlFor="login-password">Contraseña</Label>
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
                      setResetStatus(null);
                      setActiveTab('reset');
                    }}
                  >
                    Olvidé mi contraseña
                  </Button>
                  <Button type="submit" className="w-full" disabled={busyMode === 'login'}>
                    {busyMode === 'login' ? 'Iniciando sesión...' : 'Iniciar sesión'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="reset">
                <form className="space-y-4 pt-4" onSubmit={handleResetPassword}>
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email de la cuenta</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      autoComplete="email"
                      value={resetEmail}
                      onChange={(event) => {
                        setResetEmail(event.target.value);
                        setResetStatus(null);
                      }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Enviaremos un enlace seguro para que el estudiante elija una nueva contraseña.
                  </p>
                  {resetStatus && (
                    <p
                      className={`text-sm rounded-md border px-3 py-2 ${
                        resetStatus.type === 'success'
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
                          : 'border-destructive/30 bg-destructive/10 text-destructive'
                      }`}
                    >
                      {resetStatus.message}
                    </p>
                  )}
                  <Button type="submit" className="w-full" disabled={busyMode === 'reset'}>
                    {busyMode === 'reset'
                      ? 'Enviando enlace...'
                      : resetStatus?.type === 'success'
                        ? 'Reenviar enlace de restablecimiento'
                        : 'Enviar enlace de restablecimiento'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="pt-4">
              <Button variant="ghost" asChild className="w-full">
                <Link href="/">Volver al inicio</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString('es-UY', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function firebaseErrorMessage(error: unknown): string {
  if (typeof error !== 'object' || !error || !('code' in error)) {
    return 'Inténtalo de nuevo.';
  }

  const code = String(error.code);

  switch (code) {
    case 'auth/email-already-in-use':
      return 'Este email ya está siendo usado por otra cuenta.';
    case 'auth/invalid-email':
      return 'Este email no es válido.';
    case 'auth/missing-email':
      return 'Ingresa el email de la cuenta.';
    case 'auth/invalid-credential':
      return 'El email o la contraseña es incorrecto.';
    case 'auth/user-not-found':
      return 'No existe una cuenta con este email.';
    case 'auth/wrong-password':
      return 'Contraseña incorrecta.';
    case 'auth/weak-password':
      return 'Elige una contraseña más segura (al menos 6 caracteres).';
    case 'auth/operation-not-allowed':
      return 'El acceso por email/contraseña está desactivado en Firebase Console.';
    case 'auth/configuration-not-found':
      return 'Firebase Auth no está configurado para este proyecto. En Firebase Console: Authentication -> Get started -> Sign-in method -> habilita Email/Password.';
    case 'auth/app-not-authorized':
      return 'Este dominio no está autorizado en la configuración de Firebase Auth.';
    case 'auth/network-request-failed':
      return 'Error de red. Revisa tu conexión e intenta otra vez.';
    case 'auth/invalid-api-key':
      return 'La API key de Firebase no es válida. Revisa la configuración.';
    case 'auth/api-key-not-valid.-please-pass-a-valid-api-key.':
      return 'La API key de Firebase no es válida o fue revocada. Actualiza NEXT_PUBLIC_FIREBASE_API_KEY.';
    case 'auth/admin-restricted-operation':
      return 'Esta operación está restringida por la configuración del proyecto en Firebase.';
    case 'auth/too-many-requests':
      return 'Demasiados intentos. Espera un momento e inténtalo de nuevo.';
    default:
      return `Verifica los datos e intenta de nuevo (${code}).`;
  }
}

function AuthPageLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground font-body antialiased">
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <Card className="max-w-lg mx-auto">
            <CardHeader>
              <CardTitle>Cargando cuenta...</CardTitle>
              <CardDescription>Verificando tu sesión.</CardDescription>
            </CardHeader>
          </Card>
      </main>
    </div>
  );
}

function firestoreErrorMessage(error: unknown): string {
  if (typeof error !== 'object' || !error || !('code' in error)) {
    return 'Falló la escritura en Firestore. Aún puedes iniciar sesión con esta cuenta.';
  }

  const code = String(error.code);

  switch (code) {
    case 'permission-denied':
      return 'Las reglas de Firestore bloquearon la escritura. Revisa las reglas para users/{uid}.';
    case 'failed-precondition':
      return 'Firestore no está completamente configurado. Crea/habilita Firestore en Firebase Console.';
    case 'unavailable':
      return 'Firestore está temporalmente no disponible. Intenta de nuevo en un momento.';
    default:
      return `Falló la escritura en Firestore (${code}). Aún puedes iniciar sesión con esta cuenta.`;
  }
}
