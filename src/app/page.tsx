'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { collection, doc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Autoplay from 'embla-carousel-autoplay';

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
import { Carousel, CarouselContent, CarouselItem, CarouselPrevious, CarouselNext } from '@/components/ui/carousel';
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

  const autoplay = useRef(
    Autoplay({ delay: 2500, stopOnInteraction: false, stopOnMouseEnter: false, playOnInit: true })
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
    <div className="min-h-screen bg-background text-foreground font-body flex flex-col antialiased">
      <header className="sticky top-0 z-20 w-full bg-background/80 backdrop-blur-sm border-b border-primary/20">
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
                <Button asChild variant="outline" size="sm">
                  <Link href="/history">Historia</Link>
                </Button>
                <Button asChild variant="outline" size="sm">
                  <Link href="/feedback">Opinión</Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                >
                  {isSigningOut ? 'Cerrando sesión...' : 'Cerrar sesión'}
                </Button>
              </div>
            ) : (
              <Button asChild size="sm">
                <Link href="/login">Iniciar sesión</Link>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-grow w-full container mx-auto px-4 sm:px-6 lg:px-8 py-8">
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

        {(!user || isAdmin) && (
          <div className="flex flex-col items-center text-center mb-12">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold font-headline tracking-tight text-foreground">
              Planes de Entrenamiento para Caballos
            </h2>
            <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
              Desde iniciar un caballo joven hasta refinar movimientos avanzados, encuentra un plan que se adapte a tu viaje.
            </p>
          </div>
        )}

        {!loading && !user && (
          <>
            <Card className="mb-6 border-dashed">
              <CardHeader>
                <CardTitle>Para tus estudiantes</CardTitle>
                <CardDescription>
                  Pide a cada estudiante que cree una cuenta para guardar su progreso e historial de forma individual.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row gap-3">
                <Button asChild>
                  <Link href="/register">Crear cuenta</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/login">Iniciar sesión</Link>
                </Button>
                <Button asChild variant="ghost">
                  <Link href="/reset-password">Restablecer contraseña</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="mb-8">
              <CardHeader>
                <CardTitle>Prueba gratis de {PRICING.trialDays} días</CardTitle>
                <CardDescription>{getTrialNotice()}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row gap-3">
                <Button asChild variant="outline">
                  <Link href="/pricing">Ver detalles de la prueba</Link>
                </Button>
                <Button asChild variant="ghost">
                  <Link href="/register">Comenzar prueba gratis</Link>
                </Button>
              </CardContent>
            </Card>
          </>
        )}

        {!loading && user && isAdmin && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>{isAdmin ? 'Modo administrador activo' : 'Modo estudiante activo'}</CardTitle>
              <CardDescription>
                {isAdmin
                  ? 'Puedes ver todos los planes y gestionar las asignaciones de estudiantes.'
                  : `El progreso está vinculado a ${user.displayName || user.email}. Aquí verás solo el plan asignado a tus clases.`}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row gap-3">
                <Button asChild variant="outline">
                  <Link href="/history">Abrir historial de progreso</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/feedback">Enviar opinión</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {!loading && user && isAdmin && (
          <>
            <section className="mb-8">
              <Card className="border-primary/30">
                <CardHeader>
                  <CardTitle>Extensiones de prueba (Admin)</CardTitle>
                  <CardDescription>
                    Estudiantes bloqueados con opinión enviada pueden recibir +30 días con un clic.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-muted-foreground">
                      {isAdminStudentsLoading
                        ? 'Cargando estudiantes...'
                        : `${adminStudents.length} cuentas de estudiante encontradas.`}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void loadAdminStudents()}
                      disabled={isAdminStudentsLoading || Boolean(grantingStudentUid)}
                    >
                      Recargar lista
                    </Button>
                  </div>

                  {adminStudentsError && (
                    <p className="text-sm text-destructive">{adminStudentsError}</p>
                  )}

                  {!db || !USE_FIRESTORE ? (
                    <p className="text-sm text-muted-foreground">
                      Firestore está desactivado. Este panel requiere nube activa.
                    </p>
                  ) : isAdminStudentsLoading ? (
                    <p className="text-sm text-muted-foreground">Preparando panel...</p>
                  ) : adminStudents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No se encontraron estudiantes todavía.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {adminStudents.map((student) => (
                        <div
                          key={student.uid}
                          className="rounded-md border border-primary/20 bg-background px-3 py-3 space-y-2"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-medium">
                              {student.displayName || student.email || student.uid}
                            </p>
                            <p className="text-xs text-muted-foreground">
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
                              onClick={() => void handleGrantThirtyDays(student)}
                              disabled={Boolean(grantingStudentUid)}
                            >
                              {grantingStudentUid === student.uid ? 'Otorgando...' : 'Otorgar +30 días'}
                            </Button>
                            {student.lockStage === 'feedback_required' && (
                              <Button type="button" size="sm" variant="outline" asChild>
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

            <div className="relative mb-12 w-full max-w-2xl mx-auto">
              <Carousel
                opts={{ loop: true, align: 'center' }}
                plugins={[autoplay.current]}
                onMouseEnter={() => autoplay.current?.stop?.()}
                onMouseLeave={() => autoplay.current?.play?.()}
                className="px-6 sm:px-8"
              >
                <CarouselContent>
                  {CATEGORIES.map((category) => (
                    <CarouselItem key={category} className="basis-auto pr-4">
                      <Button
                        variant={selectedCategory === category ? 'default' : 'ghost'}
                        onClick={() => setSelectedCategory(category)}
                        className={`whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                          selectedCategory === category
                            ? 'bg-primary text-primary-foreground shadow-sm'
                            : 'text-muted-foreground hover:bg-background/50 hover:text-primary'
                        }`}
                        aria-pressed={selectedCategory === category}
                      >
                        {CATEGORY_LABELS[category]}
                      </Button>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="left-0 top-1/2 -translate-y-1/2 shadow-sm" />
                <CarouselNext className="right-0 top-1/2 -translate-y-1/2 shadow-sm" />
              </Carousel>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {adminFilteredPlans.map((plan: TrainingPlan) => {
                const planName = getPlanDisplayName(plan.id, plan.name, isAdmin);
                const planDescription = getPlanDisplayDescription(
                  plan.id,
                  plan.description,
                  isAdmin
                );

                return (
                  <Link
                    key={plan.id}
                    href={`/plans/${plan.id}`}
                    className="group focus:outline-none"
                    aria-label={`Abrir plan: ${planName}`}
                  >
                    <Card className="flex h-full flex-col transition-transform group-hover:-translate-y-0.5">
                      <CardHeader>
                        <div>
                          <CardTitle>{planName}</CardTitle>
                          <CardDescription>{plan.duration}</CardDescription>
                        </div>
                      </CardHeader>
                      <CardContent className="flex-grow">
                        <p className="text-muted-foreground mb-4 line-clamp-3">
                          {planDescription}
                        </p>
                        <Button variant="outline" className="mt-auto">
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
    <div className="min-h-screen bg-background text-foreground font-body flex flex-col antialiased">
      <header className="sticky top-0 z-20 w-full bg-background/80 backdrop-blur-sm border-b border-primary/20">
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
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>Cargando inicio...</CardTitle>
            <CardDescription>Preparando panel y planes.</CardDescription>
          </CardHeader>
        </Card>
      </main>
    </div>
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
