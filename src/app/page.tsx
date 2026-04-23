'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { collection, doc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/components/auth-provider';
import {
  trainingPlans,
  type TrainingPlan,
  type PlanStage,
  CATEGORIES,
  CATEGORY_LABELS,
  getPlanDayExercises,
  getPlanStage,
  getPlanWeekExercises,
  type Category,
  weekUsesMultiExerciseDays,
} from '@/data/training-plans';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import { auth, db, USE_FIRESTORE } from '@/lib/firebase';
import {
  getPlanDisplayDescription,
  getPlanDisplayName,
  isAdminUser,
} from '@/lib/plan-visibility';
import {
  PRICING,
  getTrialLockStage,
  getTrialNotice,
  getTrialStatus,
  type TrialLockStage,
} from '@/lib/pricing';
import {
  createEmptyProgress,
  readLocalPlanProgress,
  type SavedPlan,
} from '@/lib/progress-store';
import { useToast } from '@/hooks/use-toast';
import { useUserAccountMeta } from '@/hooks/use-user-account-meta';

type AdminStudentTrialRow = {
  uid: string;
  displayName: string | null;
  email: string | null;
  createdAt: Date | null;
  lastFeedbackAt: Date | null;
  trialExtensionDays: number;
  trialRemainingDays: number;
  trialTotalDays: number;
  lockStage: TrialLockStage;
};

const STUDENT_WORK_DAYS_PER_WEEK = 5;
const STUDENT_SESSION_TONES = [
  'from-[#8f3c16] via-[#b85a2b] to-[#ddb07b]',
  'from-[#556018] via-[#90a328] to-[#d8ea65]',
  'from-[#4E342E] via-[#8a664c] to-[#d3b38c]',
  'from-[#6a3d26] via-[#aa6d46] to-[#e8c49a]',
  'from-[#385247] via-[#5c8576] to-[#b8d7ca]',
] as const;
const STUDENT_PROGRESS_TRACK_CLASS = 'bg-[#e6dccb]';
const STUDENT_PROGRESS_FILL_CLASS =
  'bg-gradient-to-r from-[#a24a1d] via-[#d88348] to-[#f4c68b]';
const STUDENT_PRIMARY_BUTTON_CLASS =
  'h-16 w-full rounded-full border-0 bg-[#b99b6a] px-8 text-lg font-bold text-[#2f2118] shadow-none hover:bg-[#ad8d5d] hover:text-[#2f2118] sm:w-auto';
const WARM_PANEL_CLASS =
  'rounded-[1.9rem] border border-[#dccab7] bg-[#fffaf2]/95 shadow-[0_18px_45px_rgba(120,92,68,0.10)]';
const WARM_INSET_PANEL_CLASS =
  'rounded-[1.5rem] border border-[#ddceb9] bg-white/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]';
const WARM_PRIMARY_BUTTON_CLASS =
  'h-14 rounded-full border-0 bg-[#b99b6a] px-7 text-base font-bold text-[#2f2118] shadow-none hover:bg-[#ad8d5d] hover:text-[#2f2118]';
const WARM_SECONDARY_BUTTON_CLASS =
  'h-14 rounded-full border border-[#ddceb9] bg-[#fff8ee] px-7 text-base font-semibold text-[#5f4636] shadow-none hover:bg-[#f3eadc] hover:text-[#4c382c]';

export default function Home() {
  return (
    <Suspense fallback={<HomePageLoading />}>
      <HomePageContent />
    </Suspense>
  );
}

function HomePageContent() {
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<Category>(CATEGORIES[0]);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [adminStudents, setAdminStudents] = useState<AdminStudentTrialRow[]>([]);
  const [isAdminStudentsLoading, setIsAdminStudentsLoading] = useState(false);
  const [adminStudentsError, setAdminStudentsError] = useState<string | null>(null);
  const [grantingStudentUid, setGrantingStudentUid] = useState<string | null>(null);
  const [studentPlanProgress, setStudentPlanProgress] = useState<SavedPlan>(createEmptyProgress());
  const { trialExtensionDays, lastFeedbackAt, loading: accountMetaLoading } = useUserAccountMeta(user);

  const isAdmin = isAdminUser(user);
  const simulatedTrialPreview = (() => {
    const raw = searchParams.get('trialPreview');
    return raw === 'expired' || raw === 'pending' ? raw : null;
  })();
  const featuredStudentPlanId = 'taller-metodo-mente-movimiento';
  const featuredStudentPlan = trainingPlans.find((plan) => plan.id === featuredStudentPlanId);
  const featuredStudentPlanStorageKey = featuredStudentPlan
    ? `equi:plan:${featuredStudentPlan.id}`
    : null;
  const adminFilteredPlans = trainingPlans.filter((plan) => plan.category === selectedCategory);
  const trialStatus = useMemo(() => {
    if (!user || isAdmin) return null;
    return getTrialStatus(user.metadata.creationTime, { extraDays: trialExtensionDays });
  }, [user, isAdmin, trialExtensionDays]);
  const trialLockStage = useMemo(() => {
    if (!trialStatus || isAdmin) return 'active';
    return getTrialLockStage(trialStatus, {
      lastFeedbackAt,
      simulate: simulatedTrialPreview,
    });
  }, [isAdmin, lastFeedbackAt, simulatedTrialPreview, trialStatus]);
  const effectiveTrialStatus = useMemo(() => {
    if (!trialStatus) return null;
    if (trialLockStage === 'active') return trialStatus;
    return {
      ...trialStatus,
      remainingDays: 0,
      isExpired: true,
    };
  }, [trialLockStage, trialStatus]);
  const remainingDaysLabel = effectiveTrialStatus
    ? String(Math.max(0, effectiveTrialStatus.remainingDays)).padStart(2, '0')
    : '00';

  useEffect(() => {
    if (!featuredStudentPlanStorageKey || !user || isAdmin) {
      setStudentPlanProgress(createEmptyProgress());
      return;
    }

    setStudentPlanProgress(readLocalPlanProgress(featuredStudentPlanStorageKey));
  }, [featuredStudentPlanStorageKey, isAdmin, user]);

  const studentCurrentWeek = useMemo(() => {
    if (!featuredStudentPlan) return 1;
    if (studentPlanProgress.currentWeek > 0) {
      return Math.min(featuredStudentPlan.weeks, studentPlanProgress.currentWeek);
    }

    const firstOpenWeek = Array.from({ length: featuredStudentPlan.weeks }, (_, index) => index + 1).find(
      (week) => !isSavedWeekCompleted(studentPlanProgress, week)
    );
    return firstOpenWeek ?? 1;
  }, [featuredStudentPlan, studentPlanProgress]);

  const studentCurrentStage = useMemo(() => {
    if (!featuredStudentPlan) return null;
    return (
      getPlanStage(featuredStudentPlan, studentCurrentWeek) ??
      featuredStudentPlan.stages?.[0] ??
      null
    );
  }, [featuredStudentPlan, studentCurrentWeek]);

  const studentCurrentWeekDays = useMemo(
    () => getSavedWeekDays(studentPlanProgress, studentCurrentWeek),
    [studentCurrentWeek, studentPlanProgress]
  );

  const studentWeekExercises = useMemo(() => {
    if (!featuredStudentPlan) return [];
    return getPlanWeekExercises(featuredStudentPlan, studentCurrentWeek);
  }, [featuredStudentPlan, studentCurrentWeek]);

  const studentWorkedDaysTotal = useMemo(() => {
    if (!featuredStudentPlan) return 0;
    return countWorkedDays(studentPlanProgress, featuredStudentPlan.weeks);
  }, [featuredStudentPlan, studentPlanProgress]);

  const studentWeeksCompleted = useMemo(() => {
    if (!featuredStudentPlan) return 0;
    return countCompletedWeeks(studentPlanProgress, featuredStudentPlan.weeks);
  }, [featuredStudentPlan, studentPlanProgress]);

  const studentTotalDays = featuredStudentPlan
    ? featuredStudentPlan.weeks * STUDENT_WORK_DAYS_PER_WEEK
    : 0;
  const studentProgressPct =
    studentTotalDays > 0 ? Math.round((studentWorkedDaysTotal / studentTotalDays) * 100) : 0;
  const studentWorkedThisWeek = studentCurrentWeekDays.filter(Boolean).length;
  const studentNextSessionIndex = studentCurrentWeekDays.findIndex((day) => !day);
  const studentRecommendedDayNumber =
    studentNextSessionIndex >= 0 ? studentNextSessionIndex + 1 : studentWeekExercises.length > 0 ? 1 : null;
  const studentRecommendedDayExercises = useMemo(() => {
    if (!featuredStudentPlan || !studentRecommendedDayNumber) return [];
    return getPlanDayExercises(featuredStudentPlan, studentCurrentWeek, studentRecommendedDayNumber);
  }, [featuredStudentPlan, studentCurrentWeek, studentRecommendedDayNumber]);
  const studentRecommendedExercise =
    studentRecommendedDayExercises[0] ?? studentWeekExercises[0] ?? null;
  const studentWeekUsesMultiExerciseDays = useMemo(() => {
    if (!featuredStudentPlan) return false;
    return weekUsesMultiExerciseDays(featuredStudentPlan, studentCurrentWeek);
  }, [featuredStudentPlan, studentCurrentWeek]);
  const studentSessionCards = useMemo(
    () =>
      Array.from({ length: STUDENT_WORK_DAYS_PER_WEEK }, (_, index) => ({
        dayNumber: index + 1,
        completed: Boolean(studentCurrentWeekDays[index]),
        exercises: featuredStudentPlan
          ? getPlanDayExercises(featuredStudentPlan, studentCurrentWeek, index + 1)
          : [],
        tone: STUDENT_SESSION_TONES[index % STUDENT_SESSION_TONES.length],
      })),
    [featuredStudentPlan, studentCurrentWeek, studentCurrentWeekDays]
  );

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await signOut(auth);
      toast({
        title: 'Sesión cerrada',
        description: 'La sesión del estudiante se cerró correctamente.',
      });
    } catch {
      toast({
        variant: 'destructive',
        title: 'No se pudo cerrar sesión',
        description: 'Inténtalo de nuevo.',
      });
    } finally {
      setIsSigningOut(false);
    }
  }

  const loadAdminStudents = useCallback(async () => {
    if (!isAdmin || !user || !db || !USE_FIRESTORE) {
      setAdminStudents([]);
      setAdminStudentsError(null);
      setIsAdminStudentsLoading(false);
      return;
    }

    setIsAdminStudentsLoading(true);
    setAdminStudentsError(null);

    try {
      const snapshot = await getDocs(collection(db, 'users'));
      const nextRows = snapshot.docs
        .map((docSnapshot) => {
          const data = docSnapshot.data() as Record<string, unknown>;
          const role = String(data.role ?? '').trim().toLowerCase();
          if (role === 'admin') return null;
          return buildAdminStudentTrialRow(docSnapshot.id, data);
        })
        .filter((row): row is AdminStudentTrialRow => Boolean(row))
        .sort((a, b) => {
          const lockDelta = getLockStageRank(a.lockStage) - getLockStageRank(b.lockStage);
          if (lockDelta !== 0) return lockDelta;
          return (a.email ?? '').localeCompare(b.email ?? '');
        });

      setAdminStudents(nextRows);
    } catch (error) {
      setAdminStudentsError(firestoreAdminErrorMessage(error));
    } finally {
      setIsAdminStudentsLoading(false);
    }
  }, [isAdmin, user]);

  useEffect(() => {
    void loadAdminStudents();
  }, [loadAdminStudents]);

  async function handleGrantThirtyDays(student: AdminStudentTrialRow) {
    if (!db || !USE_FIRESTORE) {
      toast({
        variant: 'destructive',
        title: 'Firestore desactivado',
        description: 'No se puede otorgar extensión sin Firestore activo.',
      });
      return;
    }

    setGrantingStudentUid(student.uid);

    try {
      const nextExtension = Math.max(0, student.trialExtensionDays) + 30;
      await updateDoc(doc(db, 'users', student.uid), {
        trialExtensionDays: nextExtension,
        updatedAt: serverTimestamp(),
        trialExtendedAt: serverTimestamp(),
      });

      toast({
        title: 'Extensión aplicada',
        description: `Se otorgaron 30 días extra a ${student.displayName || student.email || student.uid}.`,
      });

      await loadAdminStudents();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'No se pudo otorgar extensión',
        description: firestoreAdminErrorMessage(error),
      });
    } finally {
      setGrantingStudentUid(null);
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(216,234,101,0.18),_transparent_34rem),linear-gradient(180deg,_#f5f0e1_0%,_#efe5d4_100%)] text-foreground font-body flex flex-col antialiased">
      <header className="sticky top-0 z-20 w-full border-b border-[#dccab7]/80 bg-[#f7f0e4]/85 shadow-[0_12px_34px_rgba(120,92,68,0.06)] backdrop-blur-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <Logo variant="full" className="h-12 w-auto max-w-[250px]" />
            </div>

            {loading ? (
              <span className="text-sm text-muted-foreground">Cargando cuenta...</span>
            ) : user ? (
              <div className="flex items-center gap-2">
                <span className="hidden lg:inline text-xs text-muted-foreground max-w-[14rem] truncate">
                  {user.displayName || user.email}
                </span>
                <Button asChild variant="outline" size="sm" className="rounded-full border-[#ddceb9] bg-[#fff8ee]/80 text-[#5f4636] hover:bg-[#f3eadc] hover:text-[#4c382c]">
                  <Link href="/history">Historia</Link>
                </Button>
                <Button asChild variant="outline" size="sm" className="rounded-full border-[#ddceb9] bg-[#fff8ee]/80 text-[#5f4636] hover:bg-[#f3eadc] hover:text-[#4c382c]">
                  <Link href="/feedback">Opinión</Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full text-[#5f4636] hover:bg-[#f3eadc] hover:text-[#4c382c]"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                >
                  {isSigningOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
                </Button>
              </div>
            ) : (
              <Button asChild size="sm" className="rounded-full bg-[#b99b6a] px-5 font-semibold text-[#2f2118] hover:bg-[#ad8d5d] hover:text-[#2f2118]">
                <Link href="/login">Iniciar sesión</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="relative flex-grow w-full container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="pointer-events-none absolute inset-x-4 top-2 -z-10 h-80 rounded-[3rem] bg-[radial-gradient(circle,_rgba(185,155,106,0.24),_transparent_65%)]" />
        {!loading && user && !isAdmin && !accountMetaLoading && effectiveTrialStatus && (
          <section className="mb-6">
            <Card className="mx-auto max-w-2xl border-primary/30 bg-card/80">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-center gap-4">
                  <div className="relative h-20 w-20 shrink-0 rounded-xl border border-primary/30 bg-background shadow-sm">
                    <div className="absolute inset-x-0 top-0 h-5 rounded-t-xl bg-primary/15" />
                    <div className="absolute top-1 left-4 h-2 w-2 rounded-full bg-primary/50" />
                    <div className="absolute top-1 right-4 h-2 w-2 rounded-full bg-primary/50" />
                    <div className="absolute inset-x-0 top-0 flex h-5 items-center justify-center">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Días
                      </span>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center pt-3">
                      <span className="text-3xl font-bold tracking-tight">{remainingDaysLabel}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-base font-semibold">
                      {trialLockStage === 'feedback_required'
                        ? `Tu acceso de ${effectiveTrialStatus.totalDays} días finalizó.`
                        : trialLockStage === 'pending_admin'
                          ? 'Tu opinión ya fue enviada. Esperando habilitación del administrador.'
                          : `${effectiveTrialStatus.remainingDays} ${
                              effectiveTrialStatus.remainingDays === 1 ? 'día' : 'días'
                            } restantes de prueba`}
                    </p>
                    {trialLockStage === 'feedback_required' && (
                      <p className="text-sm text-muted-foreground">
                        Envía tu opinión para desbloquear 30 días más.
                      </p>
                    )}
                    {trialLockStage === 'active' && effectiveTrialStatus.endsAt && (
                      <p className="text-sm text-muted-foreground">
                        Finaliza el {formatShortDate(effectiveTrialStatus.endsAt)}.
                      </p>
                    )}
                    {simulatedTrialPreview && (
                      <p className="text-xs text-muted-foreground">
                        Simulación activa: {simulatedTrialPreview}.
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {!loading && user && !isAdmin && featuredStudentPlan && (
          <StudentHomeHybrid
            plan={featuredStudentPlan}
            planName={getPlanDisplayName(featuredStudentPlan.id, featuredStudentPlan.name, false)}
            planDescription={getPlanDisplayDescription(
              featuredStudentPlan.id,
              featuredStudentPlan.description,
              false
            )}
            currentWeek={studentCurrentWeek}
            currentStage={studentCurrentStage}
            workedThisWeek={studentWorkedThisWeek}
            weeksCompleted={studentWeeksCompleted}
            progressPct={studentProgressPct}
            workedDaysTotal={studentWorkedDaysTotal}
            totalDays={studentTotalDays}
            remainingTrialDaysLabel={remainingDaysLabel}
            trialEndsAt={effectiveTrialStatus?.endsAt ?? null}
            trialLockStage={trialLockStage}
            recommendedExercise={studentRecommendedExercise}
            recommendedDayNumber={studentRecommendedDayNumber}
            sessionCards={studentSessionCards}
            weekUsesMultiExerciseDays={studentWeekUsesMultiExerciseDays}
          />
        )}

        {!loading && !user && (
          <PublicLandingHero />
        )}

        {!loading && user && isAdmin && (
          <div className="mb-10 flex flex-col items-center text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Biblioteca</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-foreground sm:text-4xl md:text-5xl">
              Planes de Entrenamiento para Caballos
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Desde iniciar un caballo joven hasta refinar movimientos avanzados, encuentra un plan que se adapte a tu viaje.
            </p>
          </div>
        )}

        {!loading && !user && (
          <section className="mb-8 grid gap-5 md:grid-cols-2">
            <Card className={`${WARM_PANEL_CLASS} overflow-hidden`}>
              <CardHeader className="p-6 pb-3 sm:p-7 sm:pb-3">
                <div className="mb-3 inline-flex w-fit rounded-full bg-[#f4ecde]/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7a5c45]">
                  Progreso individual
                </div>
                <CardTitle className="text-3xl font-black tracking-tight">Para tus estudiantes</CardTitle>
                <CardDescription className="text-base leading-relaxed">
                  Pide a cada estudiante que cree una cuenta para guardar su progreso e historial de forma individual.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 p-6 pt-3 sm:p-7 sm:pt-4">
                <Button asChild className={WARM_PRIMARY_BUTTON_CLASS}>
                  <Link href="/register">Crear cuenta</Link>
                </Button>
                <Button asChild variant="outline" className={WARM_SECONDARY_BUTTON_CLASS}>
                  <Link href="/login">Iniciar sesión</Link>
                </Button>
                <Button asChild variant="ghost" className="h-12 rounded-full text-base font-semibold text-[#5f4636] hover:bg-[#f3eadc] hover:text-[#4c382c]">
                  <Link href="/reset-password">Restablecer contraseña</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className={`${WARM_PANEL_CLASS} overflow-hidden`}>
              <CardHeader className="p-6 pb-3 sm:p-7 sm:pb-3">
                <div className="mb-3 inline-flex w-fit rounded-full bg-[#e6efdf] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#44552b]">
                  Sin costo inicial
                </div>
                <CardTitle className="text-3xl font-black tracking-tight">Prueba gratis de {PRICING.trialDays} días</CardTitle>
                <CardDescription className="text-base leading-relaxed">{getTrialNotice()}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 p-6 pt-3 sm:p-7 sm:pt-4">
                <Button asChild variant="outline" className={WARM_SECONDARY_BUTTON_CLASS}>
                  <Link href="/pricing">Ver detalles de la prueba</Link>
                </Button>
                <Button asChild className={WARM_PRIMARY_BUTTON_CLASS}>
                  <Link href="/register">Comenzar prueba gratis</Link>
                </Button>
              </CardContent>
            </Card>
          </section>
        )}

        {!loading && user && isAdmin && (
          <Card className={`${WARM_PANEL_CLASS} mb-8 overflow-hidden`}>
            <CardHeader className="p-6 pb-3 sm:p-7 sm:pb-3">
              <div className="mb-3 inline-flex w-fit rounded-full bg-[#f4ecde]/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#7a5c45]">
                Panel interno
              </div>
              <CardTitle className="text-3xl font-black tracking-tight sm:text-4xl">Modo administrador activo</CardTitle>
              <CardDescription className="max-w-2xl text-base leading-relaxed">
                Puedes ver todos los planes y gestionar las asignaciones de estudiantes.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 p-6 pt-3 sm:p-7 sm:pt-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild variant="outline" className={WARM_SECONDARY_BUTTON_CLASS}>
                  <Link href="/history">Abrir historial de progreso</Link>
                </Button>
                <Button asChild variant="outline" className={WARM_SECONDARY_BUTTON_CLASS}>
                  <Link href="/feedback">Enviar opinión</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && user && isAdmin && (
          <>
            <section className="mb-8">
              <Card className={`${WARM_PANEL_CLASS} overflow-hidden`}>
                <CardHeader className="p-6 pb-3 sm:p-7 sm:pb-3">
                  <div className="mb-3 inline-flex w-fit rounded-full bg-[#e6efdf] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#44552b]">
                    Gestión de acceso
                  </div>
                  <CardTitle className="text-3xl font-black tracking-tight sm:text-4xl">Extensiones de prueba</CardTitle>
                  <CardDescription className="max-w-2xl text-base leading-relaxed">
                    Estudiantes bloqueados con opinión enviada pueden recibir +30 días con un clic.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 p-6 pt-3 sm:p-7 sm:pt-4">
                  <div className={`${WARM_INSET_PANEL_CLASS} flex flex-wrap items-center justify-between gap-3 px-4 py-3`}>
                    <p className="text-sm font-medium text-muted-foreground">
                      {isAdminStudentsLoading
                        ? 'Cargando estudiantes...'
                        : `${adminStudents.length} cuentas de estudiante encontradas.`}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-10 rounded-full border-[#ddceb9] bg-[#fff8ee] px-4 font-semibold text-[#5f4636] shadow-none hover:bg-[#f3eadc] hover:text-[#4c382c]"
                      onClick={() => void loadAdminStudents()}
                      disabled={isAdminStudentsLoading || Boolean(grantingStudentUid)}
                    >
                      Recargar lista
                    </Button>
                  </div>

                  {adminStudentsError && (
                    <p className="rounded-[1.15rem] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                      {adminStudentsError}
                    </p>
                  )}

                  {!db || !USE_FIRESTORE ? (
                    <p className={`${WARM_INSET_PANEL_CLASS} px-4 py-3 text-sm text-muted-foreground`}>
                      Firestore está desactivado. Este panel requiere nube activa.
                    </p>
                  ) : isAdminStudentsLoading ? (
                    <p className={`${WARM_INSET_PANEL_CLASS} px-4 py-3 text-sm text-muted-foreground`}>Preparando panel...</p>
                  ) : adminStudents.length === 0 ? (
                    <p className={`${WARM_INSET_PANEL_CLASS} px-4 py-3 text-sm text-muted-foreground`}>
                      No se encontraron estudiantes todavía.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {adminStudents.map((student) => (
                        <div
                          key={student.uid}
                          className={`${WARM_INSET_PANEL_CLASS} space-y-2 px-4 py-4`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-medium">
                              {student.displayName || student.email || student.uid}
                            </p>
                            <p className="rounded-full bg-[#f4ecde]/90 px-3 py-1 text-xs font-medium text-[#6d5547]">
                              {student.lockStage === 'pending_admin'
                                ? 'Pendiente de habilitación'
                                : student.lockStage === 'feedback_required'
                                  ? 'Bloqueado: falta opinión'
                                  : 'Acceso activo'}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {student.email || 'Sin email'}
                            {student.createdAt ? ` · Alta: ${formatShortDate(student.createdAt)}` : ''}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Días extra: {student.trialExtensionDays} · Restantes: {student.trialRemainingDays}/
                            {student.trialTotalDays}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Feedback: {student.lastFeedbackAt ? formatShortDate(student.lastFeedbackAt) : 'No enviado'}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              className="h-10 rounded-full bg-[#b99b6a] px-4 font-semibold text-[#2f2118] hover:bg-[#ad8d5d] hover:text-[#2f2118]"
                              onClick={() => void handleGrantThirtyDays(student)}
                              disabled={Boolean(grantingStudentUid)}
                            >
                              {grantingStudentUid === student.uid ? 'Otorgando...' : 'Otorgar +30 días'}
                            </Button>
                            {student.lockStage === 'feedback_required' && (
                              <Button type="button" size="sm" variant="outline" className="h-10 rounded-full border-[#ddceb9] bg-[#fff8ee] px-4 font-semibold text-[#5f4636] shadow-none hover:bg-[#f3eadc] hover:text-[#4c382c]" asChild>
                                <Link href="/feedback">Abrir feedback</Link>
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>

            <div className={`${WARM_PANEL_CLASS} mb-10 mx-auto max-w-4xl p-3 sm:p-4`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="px-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    Filtrar biblioteca
                  </p>
                  <p className="mt-1 text-sm text-[#6d5547]">
                    {adminFilteredPlans.length} planes en {CATEGORY_LABELS[selectedCategory]}
                  </p>
                </div>

                <div className="grid gap-2 rounded-[1.45rem] border border-[#ddceb9] bg-[#f4ecde]/78 p-1.5 sm:grid-cols-3">
                  {CATEGORIES.map((category) => (
                    <Button
                      key={category}
                      type="button"
                      variant="ghost"
                      onClick={() => setSelectedCategory(category)}
                      className={`h-12 rounded-full px-5 text-sm font-semibold transition-colors sm:text-base ${
                        selectedCategory === category
                          ? 'bg-[#b99b6a] text-[#2f2118] shadow-none hover:bg-[#ad8d5d] hover:text-[#2f2118]'
                          : 'bg-transparent text-[#6d5547] hover:bg-[#fff8ee] hover:text-[#4c382c]'
                      }`}
                      aria-pressed={selectedCategory === category}
                    >
                      {CATEGORY_LABELS[category]}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {adminFilteredPlans.map((plan: TrainingPlan) => {
                const planName = getPlanDisplayName(plan.id, plan.name, isAdmin);
                const planDescription = getPlanDisplayDescription(
                  plan.id,
                  plan.description,
                  isAdmin
                );
                const planTone = getStudentPlanPanelTone(plan.category);

                return (
                  <Link
                    key={plan.id}
                    href={`/plans/${plan.id}`}
                    className="group focus:outline-none"
                    aria-label={`Abrir plan: ${planName}`}
                  >
                    <Card className="flex h-full flex-col overflow-hidden rounded-[2rem] border border-[#cfb89f] bg-[#fff7ea] shadow-[0_22px_58px_rgba(120,92,68,0.16)] transition-transform group-hover:-translate-y-1">
                      <div className="relative h-56 overflow-hidden bg-[#211714] text-white sm:h-60">
                        {plan.image ? (
                          <Image
                            src={plan.image}
                            alt={planName}
                            fill
                            sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className={`h-full w-full bg-gradient-to-br ${planTone.thumbGlow}`} />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-b from-black/5 via-black/20 to-[#1c1411]/88" />
                        <div className={`absolute inset-0 bg-gradient-to-tr ${planTone.heroGlow}`} />
                        <div className="absolute left-5 top-5 rounded-full border border-white/20 bg-black/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/95 backdrop-blur-sm">
                          {CATEGORY_LABELS[plan.category]}
                        </div>
                        <div className="absolute bottom-5 left-5 right-5">
                          <p className="text-sm font-semibold text-white/88 [text-shadow:0_2px_12px_rgba(0,0,0,0.45)]">{plan.duration}</p>
                          <h3 className="mt-2 line-clamp-2 text-3xl font-black leading-[0.92] tracking-tight text-white [text-shadow:0_5px_22px_rgba(0,0,0,0.58)]">
                            {planName}
                          </h3>
                        </div>
                      </div>
                      <CardContent className="flex flex-1 flex-col gap-5 p-5 sm:p-6">
                        <div className={`h-1.5 rounded-full bg-gradient-to-r ${planTone.barGlow}`} />
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-[#f4ecde] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#7a5c45]">
                              {plan.duration}
                            </span>
                            <span className="rounded-full bg-[#e6efdf] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#44552b]">
                              {CATEGORY_LABELS[plan.category]}
                            </span>
                          </div>
                          <h3 className="text-2xl font-black leading-tight tracking-tight text-[#4E342E]">
                            {planName}
                          </h3>
                        </div>
                        <CardDescription className="line-clamp-3 text-base leading-relaxed text-[#6d5547]">
                          {planDescription}
                        </CardDescription>
                        <Button className={`${WARM_PRIMARY_BUTTON_CLASS} mt-auto w-full sm:w-fit`}>
                          Ver plan
                        </Button>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function HomePageLoading() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(216,234,101,0.18),_transparent_34rem),linear-gradient(180deg,_#f5f0e1_0%,_#efe5d4_100%)] text-foreground font-body flex flex-col antialiased">
      <header className="sticky top-0 z-20 w-full border-b border-[#dccab7]/80 bg-[#f7f0e4]/85 shadow-[0_12px_34px_rgba(120,92,68,0.06)] backdrop-blur-md">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <Logo variant="full" className="h-12 w-auto max-w-[250px]" />
            </div>
            <span className="text-sm text-muted-foreground">Cargando cuenta...</span>
          </div>
        </div>
      </header>
      <main className="flex-grow w-full container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card className={`${WARM_PANEL_CLASS} max-w-2xl mx-auto`}>
          <CardHeader className="p-7">
            <CardTitle className="text-3xl font-black tracking-tight">Cargando inicio...</CardTitle>
            <CardDescription className="text-base leading-relaxed">Preparando panel y planes.</CardDescription>
          </CardHeader>
        </Card>
      </main>
    </div>
  );
}

function PublicLandingHero() {
  return (
    <section className="mb-7 overflow-hidden rounded-[2rem] border border-primary/25 bg-[#211714] text-white shadow-[0_28px_70px_rgba(78,52,46,0.18)]">
      <div className="relative min-h-[34rem]">
        <Image
          src="/plans/plan-de-iniciacion-caballo-joven.png"
          alt="Caballo joven en entrenamiento"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-black/35 to-[#1c1411]/95" />
        <div className="absolute inset-0 bg-gradient-to-tr from-[#ffdfbf]/0 via-[#b85a2b]/12 to-[#6f2f16]/38" />

        <div className="relative grid min-h-[34rem] gap-8 p-5 sm:p-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end">
          <div className="flex max-w-3xl flex-col justify-between gap-12">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-white/20 bg-black/15 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-white/95 backdrop-blur-sm [text-shadow:0_1px_8px_rgba(0,0,0,0.45)]">
                Entrenamiento guiado
              </span>
              <span className="rounded-full border border-white/20 bg-black/15 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-white/95 backdrop-blur-sm [text-shadow:0_1px_8px_rgba(0,0,0,0.45)]">
                Historial por estudiante
              </span>
            </div>

            <div className="space-y-5">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.25em] text-white/82 [text-shadow:0_1px_8px_rgba(0,0,0,0.45)]">
                  EquiProgress
                </p>
                <h2 className="max-w-3xl text-4xl font-black leading-[0.92] tracking-tight text-white [text-shadow:0_5px_22px_rgba(0,0,0,0.55)] sm:text-5xl md:text-6xl">
                  Planes de Entrenamiento para Caballos
                </h2>
                <p className="max-w-2xl text-base leading-relaxed text-white/92 [text-shadow:0_2px_12px_rgba(0,0,0,0.5)] sm:text-lg">
                  Desde iniciar un caballo joven hasta refinar movimientos avanzados, encuentra un plan que se adapte a tu viaje.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild className={STUDENT_PRIMARY_BUTTON_CLASS}>
                  <Link href="/register">Comenzar prueba gratis</Link>
                </Button>
                <Button asChild variant="outline" className="h-14 w-full rounded-full border-white/20 bg-white/5 px-7 text-base font-semibold text-white hover:bg-white/10 hover:text-white sm:w-auto">
                  <Link href="/login">Ya tengo cuenta</Link>
                </Button>
              </div>
            </div>
          </div>

          <div className={`${WARM_INSET_PANEL_CLASS} bg-white/12 p-4 text-white backdrop-blur-sm`}>
            <p className="text-[11px] uppercase tracking-[0.2em] text-white/82 [text-shadow:0_1px_8px_rgba(0,0,0,0.45)]">
              Tu plataforma
            </p>
            <div className="mt-4 space-y-3">
              <div className="rounded-[1.2rem] border border-white/12 bg-black/15 p-4">
                <p className="text-3xl font-semibold leading-none [text-shadow:0_3px_16px_rgba(0,0,0,0.5)]">
                  {PRICING.trialDays}
                </p>
                <p className="mt-1 text-sm text-white/88 [text-shadow:0_1px_8px_rgba(0,0,0,0.45)]">
                  días de prueba gratis
                </p>
              </div>
              <div className="rounded-[1.2rem] border border-white/12 bg-black/15 p-4">
                <p className="text-3xl font-semibold leading-none [text-shadow:0_3px_16px_rgba(0,0,0,0.5)]">
                  1:1
                </p>
                <p className="mt-1 text-sm text-white/88 [text-shadow:0_1px_8px_rgba(0,0,0,0.45)]">
                  progreso separado por estudiante
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

type StudentSessionCard = {
  dayNumber: number;
  completed: boolean;
  exercises: TrainingPlan['exercises'];
  tone: (typeof STUDENT_SESSION_TONES)[number];
};

function StudentHomeHybrid({
  plan,
  planName,
  planDescription,
  currentWeek,
  currentStage,
  workedThisWeek,
  weeksCompleted,
  progressPct,
  workedDaysTotal,
  totalDays,
  remainingTrialDaysLabel,
  trialEndsAt,
  trialLockStage,
  recommendedExercise,
  recommendedDayNumber,
  sessionCards,
  weekUsesMultiExerciseDays,
}: {
  plan: TrainingPlan;
  planName: string;
  planDescription: string;
  currentWeek: number;
  currentStage: PlanStage | null;
  workedThisWeek: number;
  weeksCompleted: number;
  progressPct: number;
  workedDaysTotal: number;
  totalDays: number;
  remainingTrialDaysLabel: string;
  trialEndsAt: Date | null;
  trialLockStage: TrialLockStage;
  recommendedExercise: TrainingPlan['exercises'][number] | null;
  recommendedDayNumber: number | null;
  sessionCards: StudentSessionCard[];
  weekUsesMultiExerciseDays: boolean;
}) {
  const recommendedSessionExercises =
    (recommendedDayNumber
      ? sessionCards.find((session) => session.dayNumber === recommendedDayNumber)?.exercises
      : null) ?? [];
  const primaryHref =
    trialLockStage === 'active'
      ? weekUsesMultiExerciseDays
        ? `/plans/${plan.id}?focusWeek=${currentWeek}#session-day-${recommendedDayNumber ?? 1}`
        : recommendedExercise?.id
        ? `/exercises/${recommendedExercise.id}?from=${plan.id}&week=${currentWeek}${
            recommendedDayNumber ? `&day=${recommendedDayNumber}` : ''
          }`
        : `/plans/${plan.id}`
      : trialLockStage === 'feedback_required'
        ? `/feedback?source=trial-lock&from=${encodeURIComponent(`/plans/${plan.id}`)}`
        : null;
  const primaryLabel =
    trialLockStage === 'active'
      ? recommendedExercise
        ? 'Empezar sesión'
        : 'Abrir plan'
      : trialLockStage === 'feedback_required'
        ? 'Enviar opinión para seguir'
        : 'Esperando habilitación';
  const panelTone = getStudentPlanPanelTone(plan.category);

  return (
    <section className="mb-12 space-y-5">
      <div className="relative overflow-hidden rounded-[2rem] border border-primary/25 bg-[#211714] text-white shadow-[0_28px_70px_rgba(78,52,46,0.18)]">
        <div className="absolute inset-0">
          {plan.image && (
            <Image
              src={plan.image}
              alt={planName}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/35 to-[#1c1411]/95" />
          <div className={`absolute inset-0 bg-gradient-to-tr ${panelTone.heroGlow}`} />
        </div>

        <div className="relative flex min-h-[32rem] flex-col justify-between gap-8 p-5 sm:min-h-[35rem] sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-white/20 bg-black/15 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-white/95 backdrop-blur-sm [text-shadow:0_1px_8px_rgba(0,0,0,0.45)]">
                Tu sesión de hoy
              </span>
              <span className="rounded-full border border-white/20 bg-black/15 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-white/95 backdrop-blur-sm [text-shadow:0_1px_8px_rgba(0,0,0,0.45)]">
                Semana {currentWeek} de {plan.weeks}
              </span>
            </div>
            <div className="rounded-2xl border border-white/12 bg-black/15 px-4 py-3 text-right backdrop-blur-sm">
              <p className="text-[10px] uppercase tracking-[0.22em] text-white/78 [text-shadow:0_1px_8px_rgba(0,0,0,0.45)]">Prueba</p>
              <p className="text-3xl font-semibold leading-none text-white [text-shadow:0_3px_16px_rgba(0,0,0,0.5)]">{remainingTrialDaysLabel}</p>
              <p className="mt-1 text-xs text-white/90 [text-shadow:0_1px_8px_rgba(0,0,0,0.45)]">
                {trialEndsAt ? `Hasta ${formatShortDate(trialEndsAt)}` : 'Activa ahora'}
              </p>
            </div>
          </div>

          <div className="max-w-2xl space-y-4">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.25em] text-white/82 [text-shadow:0_1px_8px_rgba(0,0,0,0.45)]">
                {currentStage?.title || 'Plan asignado'}
              </p>
              <h2 className="max-w-xl text-4xl font-black leading-[0.92] tracking-tight text-white [text-shadow:0_5px_22px_rgba(0,0,0,0.55)] sm:text-5xl">
                {weekUsesMultiExerciseDays
                  ? `Sesión del día ${recommendedDayNumber ?? 1}`
                  : recommendedExercise?.name || planName}
              </h2>
              <p className="max-w-xl text-sm leading-relaxed text-white/92 [text-shadow:0_2px_12px_rgba(0,0,0,0.5)] sm:text-base">
                {weekUsesMultiExerciseDays
                  ? `Hoy repites los ${recommendedSessionExercises.length || 5} ejercicios de ${currentStage?.title || 'esta etapa'}.`
                  : recommendedExercise?.objective || currentStage?.description || planDescription}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 text-xs text-white/95 sm:text-sm">
              <span className="rounded-full bg-black/15 px-3 py-1 backdrop-blur-sm [text-shadow:0_1px_8px_rgba(0,0,0,0.45)]">
                {weekUsesMultiExerciseDays
                  ? `${recommendedSessionExercises.length || 5} ejercicios`
                  : recommendedExercise?.duration || plan.duration}
              </span>
              <span className="rounded-full bg-black/15 px-3 py-1 backdrop-blur-sm [text-shadow:0_1px_8px_rgba(0,0,0,0.45)]">
                {planName}
              </span>
              <span className="rounded-full bg-black/15 px-3 py-1 backdrop-blur-sm [text-shadow:0_1px_8px_rgba(0,0,0,0.45)]">
                {workedThisWeek} de {STUDENT_WORK_DAYS_PER_WEEK} sesiones hechas esta semana
              </span>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="min-w-0 rounded-[1.6rem] border border-white/12 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/82 [text-shadow:0_1px_8px_rgba(0,0,0,0.45)]">
                {weekUsesMultiExerciseDays ? 'Sesión del día' : 'Recomendación'}
              </p>
              <div className="mt-3 flex items-start gap-3 sm:items-center">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[1rem] border border-white/12 bg-black/20 sm:h-20 sm:w-20 sm:rounded-[1.2rem]">
                  {recommendedExercise?.image ? (
                    <Image
                      src={recommendedExercise.image}
                      alt={recommendedExercise.name}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  ) : (
                    <div className={`h-full w-full bg-gradient-to-br ${panelTone.thumbGlow}`} />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="break-words text-base font-semibold leading-tight text-white [text-shadow:0_3px_16px_rgba(0,0,0,0.5)] sm:text-lg">
                    {weekUsesMultiExerciseDays
                      ? `Día ${recommendedDayNumber ?? 1} · sesión completa`
                      : recommendedExercise?.name || planName}
                  </p>
                  <p className="mt-1 text-sm text-white/92 [text-shadow:0_2px_10px_rgba(0,0,0,0.5)]">
                    {weekUsesMultiExerciseDays
                      ? `Incluye ${recommendedSessionExercises.length || 5} ejercicios`
                      : recommendedExercise?.duration || currentStage?.title || 'Sesión del plan'}
                  </p>
                  {weekUsesMultiExerciseDays && recommendedSessionExercises.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {recommendedSessionExercises.map((exercise) => (
                        <span
                          key={`${plan.id}-recommended-session-${exercise.id}`}
                          className="rounded-full bg-black/15 px-3 py-1 text-xs text-white/95 backdrop-blur-sm [text-shadow:0_1px_8px_rgba(0,0,0,0.45)]"
                        >
                          {exercise.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-white/82 [text-shadow:0_1px_8px_rgba(0,0,0,0.45)]">
                      {trialLockStage === 'active'
                        ? 'Lista para empezar cuando quieras.'
                        : trialLockStage === 'feedback_required'
                          ? 'Necesitas enviar tu opinión para seguir avanzando.'
                          : 'Tu cuenta quedó a la espera de habilitación del administrador.'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              {primaryHref ? (
                <Button asChild className={STUDENT_PRIMARY_BUTTON_CLASS}>
                  <Link href={primaryHref}>{primaryLabel}</Link>
                </Button>
              ) : (
                <Button
                  disabled
                  className={`${STUDENT_PRIMARY_BUTTON_CLASS} disabled:bg-[#cdb892] disabled:text-[#5c4832]`}
                >
                  {primaryLabel}
                </Button>
              )}
              <Button asChild variant="outline" className="h-14 w-full rounded-full border-white/20 bg-white/5 px-7 text-base font-semibold text-white hover:bg-white/10 hover:text-white sm:w-auto">
                <Link href={`/plans/${plan.id}`}>Ver plan completo</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.8fr)]">
        <div className="min-w-0 rounded-[1.8rem] border border-primary/20 bg-card/85 p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Tu semana</p>
              <h3 className="mt-2 break-words text-2xl font-semibold">Semana {currentWeek}</h3>
              {weekUsesMultiExerciseDays ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Cada día repasa los mismos 5 ejercicios de esta etapa.
                </p>
              ) : null}
            </div>
            <div className="w-full rounded-2xl bg-secondary/70 px-4 py-3 text-left sm:w-auto sm:text-right">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Progreso</p>
              <p className="text-xl font-semibold">{workedThisWeek}/{STUDENT_WORK_DAYS_PER_WEEK}</p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {sessionCards.map((session) => {
              const primaryExercise = session.exercises[0] ?? null;
              const content = (
                <div className="flex items-start gap-3 overflow-hidden rounded-[1.5rem] border border-primary/10 bg-background/80 px-3 py-3 transition-transform hover:-translate-y-0.5 sm:items-center">
                  <div className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-[1rem] bg-gradient-to-br ${session.tone} sm:h-20 sm:w-20 sm:rounded-[1.15rem]`}>
                    {primaryExercise?.image ? (
                      <Image
                        src={primaryExercise.image}
                        alt={primaryExercise.name}
                        fill
                        sizes="80px"
                        className="object-cover mix-blend-multiply opacity-90"
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
                    <div className="absolute bottom-2 left-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white">
                      Día {session.dayNumber}
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      {session.completed ? 'Completada' : 'Pendiente'}
                    </p>
                    {session.exercises.length > 1 ? (
                      <div className="mt-1 space-y-1">
                        {session.exercises.map((exercise) => (
                          <p
                            key={`${plan.id}-session-${session.dayNumber}-${exercise.id}`}
                            className="break-words text-sm font-medium leading-tight text-foreground/90 sm:text-base"
                          >
                            {exercise.name}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-1 break-words text-base font-semibold leading-tight sm:text-lg">
                        {primaryExercise?.name || 'Sesión guiada'}
                      </p>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <p className="text-sm text-muted-foreground">
                        {session.exercises.length > 1
                          ? 'Sesión completa de sensibilización'
                          : primaryExercise?.duration || currentStage?.title || 'Práctica del plan'}
                      </p>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          session.completed
                            ? 'bg-[#e6efdf] text-[#44552b]'
                            : 'bg-secondary text-secondary-foreground'
                        }`}
                      >
                        {session.completed ? 'Hecha' : 'Hoy'}
                      </span>
                    </div>
                  </div>
                </div>
              );

              if (primaryExercise?.id) {
                return (
                  <Link
                    key={`${plan.id}-session-${session.dayNumber}-${primaryExercise.id}`}
                    href={
                      session.exercises.length > 1
                        ? `/plans/${plan.id}?focusWeek=${currentWeek}#session-day-${session.dayNumber}`
                        : `/exercises/${primaryExercise.id}?from=${plan.id}&week=${currentWeek}&day=${session.dayNumber}`
                    }
                    className="block"
                  >
                    {content}
                  </Link>
                );
              }

              return (
                <div key={`${plan.id}-session-${session.dayNumber}-fallback`}>
                  {content}
                </div>
              );
            })}
          </div>
        </div>

        <div className="min-w-0 space-y-5">
          <div className="min-w-0 rounded-[1.8rem] border border-primary/20 bg-card/85 p-4 shadow-sm sm:p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Avance total</p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <h3 className="text-4xl font-black tracking-tight">{progressPct}%</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {workedDaysTotal} de {totalDays} sesiones marcadas
                </p>
              </div>
              <div className="w-full rounded-2xl bg-secondary/70 px-4 py-3 text-left sm:w-auto sm:text-right">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Semanas</p>
                <p className="text-xl font-semibold">{weeksCompleted}/{plan.weeks}</p>
              </div>
            </div>

            <div className={`mt-5 h-3 overflow-hidden rounded-full ${STUDENT_PROGRESS_TRACK_CLASS}`}>
              <div
                className={`h-full rounded-full ${STUDENT_PROGRESS_FILL_CLASS}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <div className="min-w-0 rounded-[1.8rem] border border-primary/20 bg-card/85 p-4 shadow-sm sm:p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Etapa actual</p>
            <h3 className="mt-2 text-2xl font-semibold">
              {currentStage?.title || `Semana ${currentWeek}`}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {currentStage?.description || planDescription}
            </p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-secondary/70 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Plan</p>
                <p className="mt-1 font-semibold">{plan.duration}</p>
              </div>
              <div className="rounded-2xl bg-secondary/70 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Meta</p>
                <p className="mt-1 font-semibold">{planName}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function formatShortDate(date: Date): string {
  return date.toLocaleDateString('es-UY', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function buildAdminStudentTrialRow(uid: string, data: Record<string, unknown>): AdminStudentTrialRow {
  const createdAt = parseDateLike(data.createdAt);
  const lastFeedbackAt = parseDateLike(data.lastFeedbackAt);
  const trialExtensionDays = parseNonNegativeInt(data.trialExtensionDays);
  const trialStatus = getTrialStatus(createdAt, { extraDays: trialExtensionDays });
  const lockStage = getTrialLockStage(trialStatus, { lastFeedbackAt });

  return {
    uid,
    displayName: typeof data.displayName === 'string' ? data.displayName : null,
    email: typeof data.email === 'string' ? data.email : null,
    createdAt,
    lastFeedbackAt,
    trialExtensionDays,
    trialRemainingDays: trialStatus.remainingDays,
    trialTotalDays: trialStatus.totalDays,
    lockStage,
  };
}

function parseDateLike(value: unknown): Date | null {
  if (!value) return null;

  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value : null;
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    return Number.isFinite(parsed.getTime()) ? parsed : null;
  }

  if (typeof value === 'object' && value) {
    const maybeTimestamp = value as {
      toDate?: () => unknown;
      toMillis?: () => unknown;
    };

    if (typeof maybeTimestamp.toDate === 'function') {
      try {
        const parsed = maybeTimestamp.toDate();
        if (parsed instanceof Date && Number.isFinite(parsed.getTime())) {
          return parsed;
        }
      } catch {
        // Continues with other parsing strategies.
      }
    }

    if (typeof maybeTimestamp.toMillis === 'function') {
      try {
        const millis = Number(maybeTimestamp.toMillis());
        if (Number.isFinite(millis)) {
          const parsed = new Date(millis);
          return Number.isFinite(parsed.getTime()) ? parsed : null;
        }
      } catch {
        // Ignore malformed timestamp-like values.
      }
    }
  }

  return null;
}

function parseNonNegativeInt(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.floor(parsed));
}

function getSavedWeekDays(progress: SavedPlan, week: number): boolean[] {
  const stored = progress.daysByWeek[String(week)] ?? [];
  return Array.from({ length: STUDENT_WORK_DAYS_PER_WEEK }, (_, index) => Boolean(stored[index]));
}

function isSavedWeekCompleted(progress: SavedPlan, week: number): boolean {
  return getSavedWeekDays(progress, week).every(Boolean);
}

function countWorkedDays(progress: SavedPlan, totalWeeks: number): number {
  return Array.from({ length: totalWeeks }, (_, index) => index + 1)
    .map((week) => getSavedWeekDays(progress, week).filter(Boolean).length)
    .reduce((total, value) => total + value, 0);
}

function countCompletedWeeks(progress: SavedPlan, totalWeeks: number): number {
  return Array.from({ length: totalWeeks }, (_, index) => index + 1).filter((week) =>
    isSavedWeekCompleted(progress, week)
  ).length;
}

function getStudentPlanPanelTone(category: Category) {
  switch (category) {
    case 'Retraining':
      return {
        heroGlow: 'from-[#d8ea65]/0 via-[#a7c338]/12 to-[#5f6e1d]/32',
        barGlow: 'from-[#a7c338] via-[#cadf63] to-[#eef7b7]',
        thumbGlow: 'from-[#7c8d24] to-[#d8ea65]',
      };
    case 'Continuing Training':
      return {
        heroGlow: 'from-[#f1d5b0]/0 via-[#b08363]/12 to-[#4E342E]/30',
        barGlow: 'from-[#9b6b4a] via-[#c69a73] to-[#f1d5b0]',
        thumbGlow: 'from-[#7b5a45] to-[#d7b08b]',
      };
    case 'Unbroke':
    default:
      return {
        heroGlow: 'from-[#ffdfbf]/0 via-[#b85a2b]/10 to-[#6f2f16]/34',
        barGlow: 'from-[#8f3c16] via-[#c36a35] to-[#efc596]',
        thumbGlow: 'from-[#8f3c16] to-[#ddb07b]',
      };
  }
}

function getLockStageRank(stage: TrialLockStage): number {
  switch (stage) {
    case 'pending_admin':
      return 0;
    case 'feedback_required':
      return 1;
    case 'active':
    default:
      return 2;
  }
}

function firestoreAdminErrorMessage(error: unknown): string {
  if (typeof error !== 'object' || !error || !('code' in error)) {
    return 'Inténtalo de nuevo.';
  }

  const code = String(error.code);

  switch (code) {
    case 'permission-denied':
      return 'Tu cuenta no tiene permisos para leer/editar users en Firestore.';
    case 'unavailable':
      return 'Firestore no está disponible temporalmente.';
    default:
      return `Error de Firestore (${code}).`;
  }
}
