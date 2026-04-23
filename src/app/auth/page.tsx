'use client';

import Image from 'next/image';
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
import { Logo } from '@/components/logo';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { auth, db, USE_FIRESTORE } from '@/lib/firebase';
import { isAdminEmail } from '@/lib/plan-visibility';
import { PRICING, getTrialNotice, getTrialStatus } from '@/lib/pricing';
import { useToast } from '@/hooks/use-toast';
import { useUserAccountMeta } from '@/hooks/use-user-account-meta';

type BusyMode = 'login' | 'signup' | 'reset' | 'logout' | null;
type AuthTab = 'signup' | 'login' | 'reset';
type ResetStatus =
  | {
      type: 'success' | 'error';
      message: string;
    }
  | null;

const AUTH_PAGE_CLASS =
  'min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(216,234,101,0.18),_transparent_34rem),linear-gradient(180deg,_#f5f0e1_0%,_#efe5d4_100%)] text-foreground font-body antialiased';
const AUTH_PANEL_CLASS =
  'rounded-[1.9rem] border border-[#dccab7] bg-[#fffaf2]/95 shadow-[0_18px_45px_rgba(120,92,68,0.10)]';
const AUTH_INSET_CLASS =
  'rounded-[1.5rem] border border-[#ddceb9] bg-white/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]';
const AUTH_PRIMARY_BUTTON_CLASS =
  'h-14 rounded-full border-0 bg-[#b99b6a] px-7 text-base font-bold text-[#2f2118] shadow-none hover:bg-[#ad8d5d] hover:text-[#2f2118]';
const AUTH_SECONDARY_BUTTON_CLASS =
  'h-14 rounded-full border border-[#ddceb9] bg-[#fff8ee] px-7 text-base font-semibold text-[#5f4636] shadow-none hover:bg-[#f3eadc] hover:text-[#4c382c]';
const AUTH_INPUT_CLASS =
  'h-14 rounded-[1.15rem] border-[#ddceb9] bg-[#fffaf2]/85 px-4 text-base shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] focus-visible:ring-[#b99b6a]';
const AUTH_LABEL_CLASS =
  'text-xs font-semibold uppercase tracking-[0.18em] text-[#6d5547]';

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
  const { trialExtensionDays } = useUserAccountMeta(user);

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
  const trialStatus = !isAdmin && user
    ? getTrialStatus(user.metadata.creationTime, { extraDays: trialExtensionDays })
    : null;

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
              trialExtensionDays: 0,
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
      <div className={AUTH_PAGE_CLASS}>
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <Card className={`${AUTH_PANEL_CLASS} max-w-lg mx-auto`}>
            <CardHeader className="p-7">
              <Logo variant="full" priority className="mb-4 h-14 w-auto" />
              <CardTitle className="text-3xl font-black tracking-tight">Cargando cuenta...</CardTitle>
              <CardDescription className="text-base leading-relaxed">Verificando tu sesión.</CardDescription>
            </CardHeader>
          </Card>
        </main>
      </div>
    );
  }

  if (user) {
    return (
      <div className={AUTH_PAGE_CLASS}>
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <Card className={`${AUTH_PANEL_CLASS} max-w-lg mx-auto overflow-hidden`}>
            <CardHeader className="p-7 pb-4">
              <Logo variant="full" priority className="mb-4 h-14 w-auto" />
              <CardTitle className="text-3xl font-black tracking-tight">Cuenta activa</CardTitle>
              <CardDescription className="text-base leading-relaxed">
                Sesión iniciada como {user.displayName || user.email || 'estudiante'}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-7 pt-2">
              {!isAdmin && trialStatus && (
                <div className={AUTH_INSET_CLASS}>
                  <div className="px-4 py-3">
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
                </div>
              )}
              <Button asChild className={`${AUTH_PRIMARY_BUTTON_CLASS} w-full`}>
                <Link href="/history">Abrir historial de progreso</Link>
              </Button>
              <Button asChild variant="outline" className={`${AUTH_SECONDARY_BUTTON_CLASS} w-full`}>
                <Link href="/">Volver a planes de entrenamiento</Link>
              </Button>
              <Button asChild variant="outline" className={`${AUTH_SECONDARY_BUTTON_CLASS} w-full`}>
                <Link href="/feedback">Enviar opinión</Link>
              </Button>
              <Button
                variant="ghost"
                className="h-12 w-full rounded-full text-base font-semibold text-[#5f4636] hover:bg-[#f3eadc] hover:text-[#4c382c]"
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
    <div className={AUTH_PAGE_CLASS}>
      <main className="container mx-auto px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-5 lg:grid-cols-[minmax(280px,0.85fr)_minmax(0,1.15fr)] lg:items-stretch">
          <section className="relative hidden min-h-[36rem] overflow-hidden rounded-[2rem] border border-primary/25 bg-[#211714] text-white shadow-[0_28px_70px_rgba(78,52,46,0.18)] lg:block">
            <Image
              src="/plans/retraining.png"
              alt=""
              fill
              priority
              sizes="35vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/35 to-[#1c1411]/95" />
            <div className="absolute inset-0 bg-gradient-to-tr from-[#d8ea65]/0 via-[#a7c338]/12 to-[#5f6e1d]/32" />

            <div className="relative flex h-full flex-col justify-between p-8">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-white/20 bg-black/15 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-white/95 backdrop-blur-sm [text-shadow:0_1px_8px_rgba(0,0,0,0.45)]">
                  Cuenta estudiante
                </span>
                <span className="rounded-full border border-white/20 bg-black/15 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-white/95 backdrop-blur-sm [text-shadow:0_1px_8px_rgba(0,0,0,0.45)]">
                  Progreso en la nube
                </span>
              </div>

              <div className="space-y-5">
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.25em] text-white/82 [text-shadow:0_1px_8px_rgba(0,0,0,0.45)]">
                    EquiProgress
                  </p>
                  <h1 className="text-5xl font-black leading-[0.92] tracking-tight text-white [text-shadow:0_5px_22px_rgba(0,0,0,0.55)]">
                    Tu historial siempre listo para la próxima clase.
                  </h1>
                  <p className="text-base leading-relaxed text-white/92 [text-shadow:0_2px_12px_rgba(0,0,0,0.5)]">
                    Crea una cuenta, inicia sesión o recupera el acceso con la misma experiencia cálida de los planes.
                  </p>
                </div>

                <div className="grid gap-3">
                  <div className="rounded-[1.3rem] border border-white/12 bg-black/15 p-4 backdrop-blur-sm">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-white/82">Prueba</p>
                    <p className="mt-1 text-3xl font-semibold leading-none">{PRICING.trialDays} días</p>
                  </div>
                  <div className="rounded-[1.3rem] border border-white/12 bg-black/15 p-4 backdrop-blur-sm">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-white/82">Guardado</p>
                    <p className="mt-1 text-3xl font-semibold leading-none">Individual</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <Card className={`${AUTH_PANEL_CLASS} mx-auto w-full max-w-2xl overflow-hidden`}>
            <CardHeader className="p-6 pb-4 sm:p-8 sm:pb-5">
              <Logo variant="full" priority className="mb-4 h-16 w-auto" />
              <div className="mb-2 inline-flex w-fit rounded-full bg-[#f4ecde]/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7a5c45]">
                Acceso de estudiantes
              </div>
              <CardTitle className="text-4xl font-black tracking-tight">Cuentas de estudiantes</CardTitle>
              <CardDescription className="text-base leading-relaxed">
                Crea una cuenta de estudiante o inicia sesión para guardar el historial en la nube.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0 sm:p-8 sm:pt-1">
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
                <TabsList className="grid h-auto w-full grid-cols-2 gap-1.5 rounded-[1.5rem] border border-[#ddceb9] bg-[#f4ecde]/85 p-1.5 sm:grid-cols-3">
                  <TabsTrigger
                    value="signup"
                    className="h-auto rounded-[1.1rem] px-3 py-3 text-center text-base leading-tight text-[#6d5547] data-[state=active]:bg-[#fffaf2] data-[state=active]:text-[#3f2c25] data-[state=active]:shadow-sm"
                  >
                    Crear cuenta
                  </TabsTrigger>
                  <TabsTrigger
                    value="login"
                    className="h-auto rounded-[1.1rem] px-3 py-3 text-center text-base leading-tight text-[#6d5547] data-[state=active]:bg-[#fffaf2] data-[state=active]:text-[#3f2c25] data-[state=active]:shadow-sm"
                  >
                    Iniciar sesión
                  </TabsTrigger>
                  <TabsTrigger
                    value="reset"
                    className="col-span-2 h-auto rounded-[1.1rem] px-3 py-3 text-center text-base leading-tight text-[#6d5547] data-[state=active]:bg-[#fffaf2] data-[state=active]:text-[#3f2c25] data-[state=active]:shadow-sm sm:col-span-1"
                  >
                    Restablecer contraseña
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="signup" className="mt-0">
                  <form className="space-y-5 pt-6" onSubmit={handleSignup}>
                    <div className="space-y-2">
                      <Label htmlFor="signup-name" className={AUTH_LABEL_CLASS}>Nombre del estudiante</Label>
                      <Input
                        id="signup-name"
                        autoComplete="name"
                        className={AUTH_INPUT_CLASS}
                        value={signupName}
                        onChange={(event) => setSignupName(event.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email" className={AUTH_LABEL_CLASS}>Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        autoComplete="email"
                        className={AUTH_INPUT_CLASS}
                        value={signupEmail}
                        onChange={(event) => setSignupEmail(event.target.value)}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="signup-password" className={AUTH_LABEL_CLASS}>Contraseña</Label>
                        <Input
                          id="signup-password"
                          type="password"
                          autoComplete="new-password"
                          className={AUTH_INPUT_CLASS}
                          value={signupPassword}
                          onChange={(event) => setSignupPassword(event.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-password-confirm" className={AUTH_LABEL_CLASS}>Confirmar contraseña</Label>
                        <Input
                          id="signup-password-confirm"
                          type="password"
                          autoComplete="new-password"
                          className={AUTH_INPUT_CLASS}
                          value={signupPasswordConfirm}
                          onChange={(event) => setSignupPasswordConfirm(event.target.value)}
                          required
                        />
                      </div>
                    </div>
                    <Button type="submit" className={`${AUTH_PRIMARY_BUTTON_CLASS} w-full`} disabled={busyMode === 'signup'}>
                      {busyMode === 'signup' ? 'Creando cuenta...' : 'Crear cuenta'}
                    </Button>
                    <p className={`${AUTH_INSET_CLASS} px-4 py-3 text-sm leading-relaxed text-muted-foreground`}>
                      {getTrialNotice()}{' '}
                      <Link href="/pricing" className="font-semibold text-[#7a5c45] underline underline-offset-4 hover:text-[#4c382c]">
                        Ver detalles de la prueba
                      </Link>
                      .
                    </p>
                  </form>
                </TabsContent>

                <TabsContent value="login" className="mt-0">
                  <form className="space-y-5 pt-6" onSubmit={handleLogin}>
                    <div className="space-y-2">
                      <Label htmlFor="login-email" className={AUTH_LABEL_CLASS}>Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        autoComplete="email"
                        className={AUTH_INPUT_CLASS}
                        value={loginEmail}
                        onChange={(event) => setLoginEmail(event.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password" className={AUTH_LABEL_CLASS}>Contraseña</Label>
                      <Input
                        id="login-password"
                        type="password"
                        autoComplete="current-password"
                        className={AUTH_INPUT_CLASS}
                        value={loginPassword}
                        onChange={(event) => setLoginPassword(event.target.value)}
                        required
                      />
                    </div>
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto p-0 text-sm font-semibold text-[#7a5c45] hover:text-[#4c382c]"
                      onClick={() => {
                        setResetEmail(loginEmail.trim());
                        setResetStatus(null);
                        setActiveTab('reset');
                      }}
                    >
                      Olvidé mi contraseña
                    </Button>
                    <Button type="submit" className={`${AUTH_PRIMARY_BUTTON_CLASS} w-full`} disabled={busyMode === 'login'}>
                      {busyMode === 'login' ? 'Iniciando sesión...' : 'Iniciar sesión'}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="reset" className="mt-0">
                  <form className="space-y-5 pt-6" onSubmit={handleResetPassword}>
                    <div className="space-y-2">
                      <Label htmlFor="reset-email" className={AUTH_LABEL_CLASS}>Email de la cuenta</Label>
                      <Input
                        id="reset-email"
                        type="email"
                        autoComplete="email"
                        className={AUTH_INPUT_CLASS}
                        value={resetEmail}
                        onChange={(event) => {
                          setResetEmail(event.target.value);
                          setResetStatus(null);
                        }}
                      />
                    </div>
                    <p className={`${AUTH_INSET_CLASS} px-4 py-3 text-sm leading-relaxed text-muted-foreground`}>
                      Enviaremos un enlace seguro para que el estudiante elija una nueva contraseña.
                    </p>
                    {resetStatus && (
                      <p
                        className={`rounded-[1.15rem] border px-4 py-3 text-sm ${
                          resetStatus.type === 'success'
                            ? 'border-emerald-300 bg-emerald-50/90 text-emerald-900'
                            : 'border-destructive/30 bg-destructive/10 text-destructive'
                        }`}
                      >
                        {resetStatus.message}
                      </p>
                    )}
                    <Button type="submit" className={`${AUTH_PRIMARY_BUTTON_CLASS} w-full`} disabled={busyMode === 'reset'}>
                      {busyMode === 'reset'
                        ? 'Enviando enlace...'
                        : resetStatus?.type === 'success'
                          ? 'Reenviar enlace de restablecimiento'
                          : 'Enviar enlace de restablecimiento'}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>

              <div className="pt-5">
                <Button variant="ghost" asChild className="h-12 w-full rounded-full text-base font-semibold text-[#5f4636] hover:bg-[#f3eadc] hover:text-[#4c382c]">
                  <Link href="/">Volver al inicio</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
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
    <div className={AUTH_PAGE_CLASS}>
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <Card className={`${AUTH_PANEL_CLASS} max-w-lg mx-auto`}>
          <CardHeader className="p-7">
            <Logo variant="full" priority className="mb-4 h-14 w-auto" />
            <CardTitle className="text-3xl font-black tracking-tight">Cargando cuenta...</CardTitle>
            <CardDescription className="text-base leading-relaxed">Verificando tu sesión.</CardDescription>
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
