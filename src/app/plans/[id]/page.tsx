'use client';

import Image from 'next/image';
import Link from 'next/link';
import { notFound, useParams, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/components/auth-provider';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useUserAccountMeta } from '@/hooks/use-user-account-meta';
import { USE_FIRESTORE } from '@/lib/firebase';
import {
  canUserAccessPlan,
  getPlanDisplayDescription,
  getPlanDisplayName,
  isAdminUser,
} from '@/lib/plan-visibility';
import { getTrialLockStage, getTrialStatus } from '@/lib/pricing';
import {
  appendLocalHistoryEntry,
  createEmptyProgress,
  getSavedPlanFingerprint,
  loadRemotePlanProgress,
  mergeSavedPlanProgress,
  normalizeSavedPlan,
  PROGRESS_ACTION_LABELS,
  readLocalPlanProgress,
  savePlanProgress,
  subscribeHistory,
  writeLocalPlanProgress,
  type ProgressAction,
  type ProgressHistoryEntry,
  type SavedPlan,
} from '@/lib/progress-store';
import { trainingPlans } from '@/data/training-plans';

type ProgressEvent = {
  action: ProgressAction;
  week?: number | null;
  note?: string | null;
};

const WORK_DAYS_PER_WEEK = 5;
const WORKDAY_LABELS = ['Día 1', 'Día 2', 'Día 3', 'Día 4', 'Día 5'];
const SCORE_VALUES = [1, 2, 3, 4, 5] as const;

export default function PlanDetailPage() {
  const searchParams = useSearchParams();
  const { id } = useParams<{ id: string }>();
  const plan = trainingPlans.find((entry) => entry.id === id);
  if (!plan) notFound();

  const STORAGE_KEY = `equi:plan:${plan.id}`;

  const { user, loading: authLoading } = useAuth();
  const { trialExtensionDays, lastFeedbackAt, loading: accountMetaLoading } = useUserAccountMeta(user);
  const { toast } = useToast();
  const isAdmin = isAdminUser(user);
  const canAccessPlan = canUserAccessPlan(plan.id, isAdmin);
  const simulatedTrialPreview = (() => {
    const raw = searchParams.get('trialPreview');
    return raw === 'expired' || raw === 'pending' ? raw : null;
  })();
  const trialStatus = useMemo(() => {
    if (!user || isAdmin) return null;
    return getTrialStatus(user.metadata.creationTime, { extraDays: trialExtensionDays });
  }, [isAdmin, trialExtensionDays, user]);
  const trialLockStage = useMemo(() => {
    if (!trialStatus || isAdmin) return 'active';
    return getTrialLockStage(trialStatus, {
      lastFeedbackAt,
      simulate: simulatedTrialPreview,
    });
  }, [isAdmin, lastFeedbackAt, simulatedTrialPreview, trialStatus]);
  const isTrialLocked = !isAdmin && trialLockStage !== 'active';
  const canOpenPlan = canAccessPlan && !isTrialLocked;
  const planName = getPlanDisplayName(plan.id, plan.name, isAdmin);
  const planDescription = getPlanDisplayDescription(plan.id, plan.description, isAdmin);

  const [saved, setSaved] = useState<SavedPlan>(createEmptyProgress());
  const [isLoadingProgress, setIsLoadingProgress] = useState(true);
  const [recentHistory, setRecentHistory] = useState<ProgressHistoryEntry[]>([]);
  const [hasShownSyncError, setHasShownSyncError] = useState(false);
  const [selectedScoreDayByWeek, setSelectedScoreDayByWeek] = useState<Record<string, number>>({});

  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;

    async function loadProgress() {
      setIsLoadingProgress(true);

      const localProgress = readLocalPlanProgress(STORAGE_KEY);
      let nextProgress = localProgress;
      // Evita bloquear la UI si la nube tarda o falla: usamos local como fallback.
      const unblockTimer = setTimeout(() => {
        if (cancelled) return;
        setSaved(normalizeSavedPlan(localProgress));
        setIsLoadingProgress(false);
      }, 3500);

      if (user && canOpenPlan && USE_FIRESTORE) {
        try {
          const remoteProgress = await loadRemotePlanProgress(user.uid, plan.id);

          if (remoteProgress) {
            const mergedProgress = mergeSavedPlanProgress(localProgress, remoteProgress);
            nextProgress = mergedProgress;

            if (getSavedPlanFingerprint(mergedProgress) !== getSavedPlanFingerprint(remoteProgress)) {
              await savePlanProgress({
                uid: user.uid,
                planId: plan.id,
                planName,
                progress: mergedProgress,
              });
            }
          } else if (hasAnyProgress(localProgress)) {
            await savePlanProgress({
              uid: user.uid,
              planId: plan.id,
              planName,
              progress: localProgress,
            });
          }
        } catch (error) {
          if (!cancelled && !hasShownSyncError) {
            toast({
              variant: 'destructive',
              title: 'Falló la sincronización en la nube',
              description: firestoreSyncErrorMessage(error),
            });
            setHasShownSyncError(true);
          }
        }
      }

      clearTimeout(unblockTimer);

      if (cancelled) return;

      const normalized = normalizeSavedPlan(nextProgress);
      writeLocalPlanProgress(STORAGE_KEY, normalized);
      setSaved(normalized);
      setIsLoadingProgress(false);
    }

    void loadProgress();

    return () => {
      cancelled = true;
    };
  }, [STORAGE_KEY, authLoading, canOpenPlan, hasShownSyncError, plan.id, planName, toast, user]);

  useEffect(() => {
    if (!user || !canOpenPlan || !USE_FIRESTORE || authLoading) {
      setRecentHistory([]);
      return;
    }

    const unsubscribe = subscribeHistory(user.uid, (entries) => {
      const filtered = entries
        .filter((entry) => entry.planId === plan.id)
        .slice(0, 1);
      setRecentHistory(filtered);
    }, 120);

    return unsubscribe;
  }, [authLoading, canOpenPlan, plan.id, user]);

  function persist(next: SavedPlan, event?: ProgressEvent) {
    const normalized = normalizeSavedPlan(next);

    setSaved(normalized);
    writeLocalPlanProgress(STORAGE_KEY, normalized);

    if (!user || !USE_FIRESTORE) return;

    void savePlanProgress({
      uid: user.uid,
      planId: plan.id,
      planName,
      progress: normalized,
      event,
    }).catch((error) => {
      if (event) {
        appendLocalHistoryEntry({
          uid: user.uid,
          planId: plan.id,
          planName,
          progress: normalized,
          event,
        });
      }

      if (!hasShownSyncError) {
        toast({
          variant: 'destructive',
          title: 'No se pudo sincronizar el progreso',
          description: firestoreSyncErrorMessage(error),
        });
        setHasShownSyncError(true);
      }
    });
  }

  function startPlan() {
    const baseProgress = createEmptyProgress();
    persist(
      {
        ...baseProgress,
        startAt: new Date().toISOString(),
        currentWeek: 1,
      },
      {
        action: 'plan_started',
        week: 1,
      }
    );
  }

  function resetPlan() {
    persist(createEmptyProgress(), { action: 'plan_reset' });
  }

  function getWeekDays(week: number): boolean[] {
    const key = String(week);
    const stored = saved.daysByWeek[key] ?? [];
    return Array.from({ length: WORK_DAYS_PER_WEEK }, (_, index) => Boolean(stored[index]));
  }

  function getExerciseScores(week: number, exerciseId: string): Array<number | null> {
    const weekKey = String(week);
    const rawScores = saved.scoresByWeek[weekKey]?.[exerciseId] ?? [];
    return Array.from({ length: WORK_DAYS_PER_WEEK }, (_, index) => {
      const value = Number(rawScores[index]);
      if (!Number.isFinite(value)) return null;
      const rounded = Math.round(value);
      return rounded >= 1 && rounded <= 5 ? rounded : null;
    });
  }

  function getExerciseScoreAverage(week: number, exerciseId: string): number | null {
    const values = getExerciseScores(week, exerciseId).filter(
      (value): value is number => typeof value === 'number'
    );
    if (values.length === 0) return null;
    const avg = values.reduce((sum, value) => sum + value, 0) / values.length;
    return Math.round(avg * 10) / 10;
  }

  function getSelectedScoreDay(week: number): number {
    const key = String(week);
    const explicitDay = selectedScoreDayByWeek[key];
    if (explicitDay && explicitDay >= 1 && explicitDay <= WORK_DAYS_PER_WEEK) return explicitDay;

    const firstWorkedDay = getWeekDays(week).findIndex(Boolean);
    if (firstWorkedDay >= 0) return firstWorkedDay + 1;
    return 1;
  }

  function setSelectedScoreDay(week: number, dayNumber: number) {
    const clampedDay = Math.max(1, Math.min(WORK_DAYS_PER_WEEK, dayNumber));
    const key = String(week);
    setSelectedScoreDayByWeek((previous) => ({ ...previous, [key]: clampedDay }));
  }

  function getStageExercises(week: number): (typeof plan.exercises)[number][] {
    const stage = plan.stages?.find((entry) => entry.week === week);
    return (stage?.exerciseIds ?? [])
      .map((exerciseId) => plan.exercises.find((entry) => entry.id === exerciseId))
      .filter((entry): entry is (typeof plan.exercises)[number] => Boolean(entry));
  }

  function isCompleted(week: number) {
    return getWeekDays(week).every(Boolean);
  }

  function setCurrentWeek(week: number) {
    const clampedWeek = Math.max(1, Math.min(plan.weeks, week));
    if (clampedWeek === saved.currentWeek) return;

    persist(
      { ...saved, currentWeek: clampedWeek },
      {
        action: 'week_selected',
        week: clampedWeek,
      }
    );
  }

  function markWeekDone(week: number) {
    if (isCompleted(week)) return;

    const completedWeeks = [...new Set([...saved.completedWeeks, week])].sort((a, b) => a - b);
    const completedDays = Array.from({ length: WORK_DAYS_PER_WEEK }, () => true);
    let currentWeek = saved.currentWeek;

    if (week === saved.currentWeek && saved.currentWeek < plan.weeks) {
      currentWeek = saved.currentWeek + 1;
    }

    persist(
      {
        ...saved,
        completedWeeks,
        currentWeek,
        daysByWeek: {
          ...saved.daysByWeek,
          [String(week)]: completedDays,
        },
      },
      {
        action: 'week_completed',
        week,
      }
    );
  }

  function unmarkWeek(week: number) {
    if (!isCompleted(week)) return;

    const completedWeeks = saved.completedWeeks.filter((entry) => entry !== week);
    const resetDays = Array.from({ length: WORK_DAYS_PER_WEEK }, () => false);
    const weekKey = String(week);
    const nextScoresByWeek = { ...saved.scoresByWeek };
    delete nextScoresByWeek[weekKey];

    persist(
      {
        ...saved,
        completedWeeks,
        daysByWeek: {
          ...saved.daysByWeek,
          [weekKey]: resetDays,
        },
        scoresByWeek: nextScoresByWeek,
      },
      {
        action: 'week_unmarked',
        week,
      }
    );
  }

  function setWorkDay(week: number, dayIndex: number, checked: boolean) {
    if (!isWeekEditable(week)) return;

    const weekKey = String(week);
    const currentDays = getWeekDays(week);
    if (currentDays[dayIndex] === checked) return;

    const nextDays = [...currentDays];
    nextDays[dayIndex] = checked;

    const weekWasCompleted = isCompleted(week);
    const weekIsCompleted = nextDays.every(Boolean);

    let completedWeeks = saved.completedWeeks;
    let currentWeek = saved.currentWeek;
    let event: ProgressEvent = {
      action: checked ? 'day_checked' : 'day_unchecked',
      week,
    };

    if (weekIsCompleted && !weekWasCompleted) {
      completedWeeks = [...new Set([...saved.completedWeeks, week])].sort((a, b) => a - b);
      event = { action: 'week_completed', week };
      if (week === saved.currentWeek && saved.currentWeek < plan.weeks) {
        currentWeek = saved.currentWeek + 1;
      }
    }

    if (!weekIsCompleted && weekWasCompleted) {
      completedWeeks = saved.completedWeeks.filter((entry) => entry !== week);
      event = { action: 'week_unmarked', week };
    }

    const nextScoresByWeek = { ...saved.scoresByWeek };
    if (!checked) {
      const weekScores = nextScoresByWeek[weekKey] ?? {};
      const cleanedWeekScores = Object.entries(weekScores).reduce<
        Record<string, Array<number | null>>
      >((acc, [exerciseId, scores]) => {
        const normalizedScores = Array.from({ length: WORK_DAYS_PER_WEEK }, (_, index) => {
          const value = Number(scores[index]);
          if (!Number.isFinite(value)) return null;
          const rounded = Math.round(value);
          return rounded >= 1 && rounded <= 5 ? rounded : null;
        });
        normalizedScores[dayIndex] = null;
        acc[exerciseId] = normalizedScores;
        return acc;
      }, {});
      nextScoresByWeek[weekKey] = cleanedWeekScores;
    }

    persist(
      {
        ...saved,
        currentWeek,
        completedWeeks,
        daysByWeek: {
          ...saved.daysByWeek,
          [weekKey]: nextDays,
        },
        scoresByWeek: nextScoresByWeek,
      },
      event
    );
  }

  function setExerciseScore(week: number, exerciseId: string, dayIndex: number, score: number | null) {
    if (!isWeekScoreEditable(week)) return;

    const normalizedScore =
      typeof score === 'number' && score >= 1 && score <= 5 ? Math.round(score) : null;
    const currentScores = getExerciseScores(week, exerciseId);
    if (currentScores[dayIndex] === normalizedScore) return;

    const currentDays = getWeekDays(week);
    const dayWasWorked = currentDays[dayIndex];
    const nextDays = [...currentDays];
    if (!dayWasWorked) {
      nextDays[dayIndex] = true;
    }

    const weekWasCompleted = currentDays.every(Boolean);
    const weekIsCompleted = nextDays.every(Boolean);
    let completedWeeks = saved.completedWeeks;
    let currentWeek = saved.currentWeek;

    if (weekIsCompleted && !weekWasCompleted) {
      completedWeeks = [...new Set([...saved.completedWeeks, week])].sort((a, b) => a - b);
      if (week === saved.currentWeek && saved.currentWeek < plan.weeks) {
        currentWeek = saved.currentWeek + 1;
      }
    }

    const nextScores = [...currentScores];
    nextScores[dayIndex] = normalizedScore;

    const weekKey = String(week);
    const nextScoresByWeek = {
      ...saved.scoresByWeek,
      [weekKey]: {
        ...(saved.scoresByWeek[weekKey] ?? {}),
        [exerciseId]: nextScores,
      },
    };

    persist(
      {
        ...saved,
        currentWeek,
        completedWeeks,
        daysByWeek: {
          ...saved.daysByWeek,
          [weekKey]: nextDays,
        },
        scoresByWeek: nextScoresByWeek,
      },
      {
        action: 'exercise_scored',
        week,
        note:
          normalizedScore === null
            ? `${exerciseId}:dia-${dayIndex + 1}:sin-puntaje`
            : `${exerciseId}:dia-${dayIndex + 1}:${normalizedScore}${dayWasWorked ? '' : ':dia-auto-marcado'}`,
      }
    );
  }

  function isWeekEditable(week: number): boolean {
    return editableWeek > 0 && week === editableWeek;
  }

  function isWeekScoreEditable(week: number): boolean {
    if (week <= 0) return false;
    if (isWeekEditable(week)) return true;
    if (editableWeek === 0) return true;
    return week < editableWeek && isCompleted(week);
  }

  const weeksCompleted = Array.from({ length: plan.weeks }, (_, index) => index + 1).filter(
    (week) => isCompleted(week)
  ).length;

  const editableWeek =
    Array.from({ length: plan.weeks }, (_, index) => index + 1).find(
      (week) => !isCompleted(week)
    ) ?? 0;
  const progressPct = Math.round((weeksCompleted / plan.weeks) * 100);

  const totalDays = Math.max(1, plan.weeks * WORK_DAYS_PER_WEEK);
  const workedDays = Array.from({ length: plan.weeks }, (_, index) => {
    const week = index + 1;
    return getWeekDays(week).filter(Boolean).length;
  }).reduce((total, value) => total + value, 0);
  const daysRemaining = Math.max(0, totalDays - workedDays);
  const dayProgressPct = Math.round((workedDays / totalDays) * 100);
  const currentWeekDays =
    saved.currentWeek > 0
      ? getWeekDays(saved.currentWeek)
      : Array.from({ length: WORK_DAYS_PER_WEEK }, () => false);
  const isCurrentWeekEditable = isWeekEditable(saved.currentWeek);
  const isCurrentWeekScoreEditable = isWeekScoreEditable(saved.currentWeek);
  const currentWeekExercises =
    saved.currentWeek > 0 ? getStageExercises(saved.currentWeek) : [];
  const selectedCurrentWeekScoreDay =
    saved.currentWeek > 0 ? getSelectedScoreDay(saved.currentWeek) : 1;
  const selectedCurrentWeekScoreDayIndex = selectedCurrentWeekScoreDay - 1;
  const canScoreCurrentSelectedDay = isCurrentWeekScoreEditable;
  const previousWeekTarget = Math.max(1, saved.currentWeek - 1);
  const nextWeekTarget = Math.min(plan.weeks, saved.currentWeek + 1);
  const canGoToPreviousWeek = !isLoadingProgress && saved.currentWeek > 1;
  const canGoToNextWeek =
    !isLoadingProgress && saved.currentWeek > 0 && saved.currentWeek < plan.weeks;
  const latestHistoryEntry = recentHistory[0] ?? null;
  const stageTabDefault = `week-${
    plan.stages?.find((stage) => stage.week === saved.currentWeek)?.week ??
    plan.stages?.[0]?.week ??
    1
  }`;

  if (authLoading || (Boolean(user) && !isAdmin && accountMetaLoading)) {
    return (
      <div className="min-h-screen bg-background text-foreground font-body antialiased">
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Cargando plan...</CardTitle>
              <CardDescription>Verificando acceso de la cuenta.</CardDescription>
            </CardHeader>
          </Card>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background text-foreground font-body antialiased">
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="max-w-xl mx-auto">
            <CardHeader>
              <CardTitle>Inicio de sesión requerido</CardTitle>
              <CardDescription>
                Los estudiantes deben iniciar sesión para abrir los planes asignados.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild className="w-full">
                <Link href="/login">Ir a iniciar sesión</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/">Volver al inicio</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!canAccessPlan) {
    return (
      <div className="min-h-screen bg-background text-foreground font-body antialiased">
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="max-w-xl mx-auto">
            <CardHeader>
              <CardTitle>Plan no asignado</CardTitle>
              <CardDescription>
                Esta cuenta no tiene acceso a este plan.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/">Volver a planes asignados</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (isTrialLocked) {
    return (
      <div className="min-h-screen bg-background text-foreground font-body antialiased">
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card className="max-w-xl mx-auto">
            <CardHeader>
              <CardTitle>
                {trialLockStage === 'feedback_required'
                  ? 'Acceso temporal finalizado'
                  : 'Opinión recibida'}
              </CardTitle>
              <CardDescription>
                {trialLockStage === 'feedback_required'
                  ? `Tu período de ${trialStatus?.totalDays ?? 30} días terminó. Envía tu opinión para desbloquear 30 días más.`
                  : 'Tu opinión ya fue enviada. Un administrador debe habilitar 30 días más para continuar.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {trialLockStage === 'feedback_required' ? (
                <Button asChild className="w-full">
                  <Link href={`/feedback?source=trial-lock&from=${encodeURIComponent(`/plans/${plan.id}`)}`}>
                    Enviar opinión ahora
                  </Link>
                </Button>
              ) : (
                <Button asChild variant="outline" className="w-full">
                  <Link href="/feedback">Ver/editar opinión enviada</Link>
                </Button>
              )}
              <Button asChild variant="outline" className="w-full">
                <Link href="/">Volver al inicio</Link>
              </Button>
              {simulatedTrialPreview && (
                <p className="text-xs text-muted-foreground">
                  Simulación activa: {simulatedTrialPreview}.
                </p>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground font-body antialiased">
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b border-primary/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="p-2 text-sm text-muted-foreground hover:text-primary">
            &larr;
          </Link>
          <h1 className="text-lg font-headline font-semibold">{planName}</h1>
          <div />
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {(plan.image || plan.exercises?.length) && (
          <section>
            <Carousel opts={{ loop: true, align: 'center' }}>
              <CarouselContent>
                <CarouselItem className="basis-full">
                  <Card className="h-full overflow-hidden rounded-2xl">
                    {plan.image && (
                      <div className="relative w-full aspect-square overflow-hidden">
                        <Image
                          src={plan.image}
                          alt={`Imagen de ${planName}`}
                          fill
                          priority
                          sizes="100vw"
                          className="object-cover"
                        />
                      </div>
                    )}
                    <CardHeader className="py-3">
                      <CardTitle>{planName}</CardTitle>
                      <CardDescription>{plan.duration}</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0 pb-4 space-y-4">
                      <div className="space-y-2">
                        <p className="text-xl font-semibold">Descripción general</p>
                        <p className="text-muted-foreground leading-relaxed">
                          {planDescription}
                        </p>
                      </div>
                      <div className="rounded-xl border border-primary/20 p-3">
                        <p className="text-sm text-muted-foreground">Duración</p>
                        <p className="text-base font-medium">
                          {plan.weeks} semana{plan.weeks === 1 ? '' : 's'} estimada{plan.weeks === 1 ? '' : 's'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>

                {plan.exercises?.map((exercise, index) => (
                  <CarouselItem
                    key={`${plan.id}-hero-ex-${exercise.id ?? 'noid'}-${index}`}
                    className="basis-full"
                  >
                    <Card className="h-full overflow-hidden rounded-2xl">
                      <div className="relative w-full aspect-square overflow-hidden">
                        <Image
                          src={exercise.image || '/placeholder.jpg'}
                          alt={exercise.name}
                          fill
                          className="object-cover"
                          sizes="100vw"
                        />
                      </div>

                      <CardHeader className="py-3">
                        <CardTitle className="leading-tight">{exercise.name}</CardTitle>
                        <CardDescription>
                          {exercise.duration ?? exercise.reps ?? '—'}
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="pt-0 pb-3 space-y-3">
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {exercise.description ?? exercise.objective ?? 'Ejercicio guiado de esta etapa.'}
                        </p>
                        <Button asChild className="w-full">
                          <Link href={`/exercises/${exercise.id}?from=${plan.id}`}>
                            Ver ejercicio
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>

              <CarouselPrevious className="left-2 top-1/2 -translate-y-1/2 h-9 w-9" />
              <CarouselNext className="right-2 top-1/2 -translate-y-1/2 h-9 w-9" />
            </Carousel>
          </section>
        )}

        {plan.stages?.length ? (
          <section>
            <Card>
              <CardHeader>
                <CardTitle>Etapas del programa</CardTitle>
                <CardDescription>
                  Resumen simple por semana para seguir el taller paso a paso.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs key={`${plan.id}-${stageTabDefault}`} defaultValue={stageTabDefault}>
                  <div className="overflow-x-auto pb-2">
                    <TabsList className="h-auto min-w-max gap-1">
                      {plan.stages.map((stage) => (
                        <TabsTrigger
                          key={`${plan.id}-stage-tab-${stage.week}`}
                          value={`week-${stage.week}`}
                          className="rounded-full px-4 py-2"
                        >
                          Semana {stage.week}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>

                  {plan.stages.map((stage) => {
                    const stageExercises = getStageExercises(stage.week);

                    return (
                      <TabsContent key={`${plan.id}-stage-content-${stage.week}`} value={`week-${stage.week}`}>
                        <div className="rounded-xl border border-primary/20 p-4 space-y-4">
                          <div className="space-y-2">
                            <p className="text-xs font-medium text-muted-foreground">
                              Etapa {stage.week}
                            </p>
                            <h3 className="text-lg font-semibold">
                              {stage.title || `Semana ${stage.week}`}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {stage.description}
                            </p>
                          </div>

                          {stageExercises.length > 0 ? (
                            <div className="space-y-2">
                              <p className="text-sm font-medium">Ejercicios de esta etapa</p>
                              <Accordion type="multiple" className="space-y-2">
                                {stageExercises.map((exercise) => {
                                  return (
                                    <AccordionItem
                                      key={`${plan.id}-stage-${stage.week}-exercise-tab-${exercise.id}`}
                                      value={`stage-${stage.week}-${exercise.id}`}
                                      className="rounded-lg border px-3"
                                    >
                                      <AccordionTrigger className="py-3 text-left hover:no-underline">
                                        <span className="font-medium">{exercise.name}</span>
                                      </AccordionTrigger>
                                      <AccordionContent className="pb-3">
                                        <p className="text-sm text-muted-foreground">
                                          {exercise.description ??
                                            exercise.objective ??
                                            'Ejercicio guiado de esta etapa.'}
                                        </p>
                                      </AccordionContent>
                                    </AccordionItem>
                                  );
                                })}
                              </Accordion>
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">
                              Esta etapa no tiene ejercicios vinculados todavía.
                            </p>
                          )}
                        </div>
                      </TabsContent>
                    );
                  })}
                </Tabs>
              </CardContent>
            </Card>
          </section>
        ) : null}

        <section>
          <Card>
            <CardHeader className="space-y-3 sm:space-y-0 sm:flex sm:items-start sm:justify-between">
              <div className="min-w-0">
                <CardTitle>Progreso del plan</CardTitle>
                <CardDescription>
                  {saved.startAt
                    ? `Iniciado el ${formatDate(saved.startAt)}`
                    : 'Aún no iniciado'}
                </CardDescription>
              </div>

              {!saved.startAt || saved.currentWeek === 0 ? (
                <Button
                  className="w-full sm:w-auto"
                  onClick={startPlan}
                  disabled={isLoadingProgress}
                >
                  Iniciar plan
                </Button>
              ) : (
                <div className="flex w-full sm:w-auto flex-col sm:flex-row gap-2 min-w-0">
                  <div className="flex w-full gap-2 min-w-0">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentWeek(previousWeekTarget)}
                      disabled={!canGoToPreviousWeek}
                      className="flex-1 sm:flex-none whitespace-normal text-center"
                    >
                      Ver semana {previousWeekTarget}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setCurrentWeek(nextWeekTarget)}
                      disabled={!canGoToNextWeek}
                      className="flex-1 sm:flex-none whitespace-normal text-center"
                    >
                      Ir a semana {nextWeekTarget}
                    </Button>
                  </div>

                  <Button
                    variant="ghost"
                    onClick={resetPlan}
                    disabled={isLoadingProgress}
                    className="w-full sm:w-auto whitespace-normal text-center"
                  >
                    Reiniciar
                  </Button>
                </div>
              )}
            </CardHeader>

            <CardContent className="space-y-3">
              {isLoadingProgress && (
                <p className="text-xs text-muted-foreground">
                  Cargando progreso...
                </p>
              )}

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  {weeksCompleted} / {plan.weeks} semanas completadas
                </span>
                <span>{progressPct}%</span>
              </div>

              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${progressPct}%` }}
                  role="progressbar"
                  aria-valuenow={progressPct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>

              {saved.currentWeek > 0 && (
                <Accordion type="single" collapsible className="rounded-lg border border-primary/20 px-3">
                  <AccordionItem value="week-detail" className="border-none">
                    <AccordionTrigger className="py-3 text-left hover:no-underline">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">
                          Semana actual: <strong>{saved.currentWeek}</strong> de {plan.weeks}
                        </p>
                        <p className="text-sm font-medium">
                          Semana {saved.currentWeek}: marcar días trabajados
                        </p>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-2 pt-1">
                      {!isCurrentWeekEditable && editableWeek > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Semana en solo lectura. La semana activa para editar es la {editableWeek}.
                        </p>
                      )}
                      {!isCurrentWeekEditable && isCurrentWeekScoreEditable && (
                        <p className="text-xs text-muted-foreground">
                          Puedes cargar puntajes en esta semana ya completada.
                        </p>
                      )}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {WORKDAY_LABELS.map((label, dayIndex) => (
                          <label
                            key={`${saved.currentWeek}-${label}`}
                            className="flex items-center gap-2 rounded-md border px-2 py-2 text-sm"
                          >
                            <input
                              type="checkbox"
                              checked={currentWeekDays[dayIndex]}
                              onChange={(event) =>
                                setWorkDay(saved.currentWeek, dayIndex, event.target.checked)
                              }
                              disabled={isLoadingProgress || !isCurrentWeekEditable}
                            />
                            <span>{label}</span>
                          </label>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {currentWeekDays.filter(Boolean).length} / {WORK_DAYS_PER_WEEK} días trabajados
                        en esta semana.
                      </p>

                      {currentWeekExercises.length > 0 && (
                        <div className="space-y-2 rounded-md border p-3">
                          <p className="text-sm font-medium">Puntaje semanal por ejercicio</p>
                          <div className="flex flex-wrap gap-1">
                            {WORKDAY_LABELS.map((_, dayIdx) => (
                              <Button
                                key={`current-week-score-day-${dayIdx}`}
                                type="button"
                                variant={selectedCurrentWeekScoreDayIndex === dayIdx ? 'default' : 'outline'}
                                size="sm"
                                className="h-8 px-2 text-xs"
                                onClick={() => setSelectedScoreDay(saved.currentWeek, dayIdx + 1)}
                                disabled={saved.currentWeek <= 0}
                              >
                                D{dayIdx + 1}
                                {currentWeekDays[dayIdx] ? '' : ' ·'}
                              </Button>
                            ))}
                          </div>

                          <p className="text-xs text-muted-foreground">
                            Si puntúas un día no marcado, se marcará automáticamente como trabajado.
                          </p>

                          <Accordion type="multiple" className="space-y-2">
                            {currentWeekExercises.map((exercise) => {
                              const exerciseScores = getExerciseScores(saved.currentWeek, exercise.id);
                              const selectedScore = exerciseScores[selectedCurrentWeekScoreDayIndex];
                              const averageScore = getExerciseScoreAverage(saved.currentWeek, exercise.id);

                              return (
                                <AccordionItem
                                  key={`${plan.id}-progress-week-${saved.currentWeek}-exercise-${exercise.id}`}
                                  value={`score-${saved.currentWeek}-${exercise.id}`}
                                  className="rounded-md border px-2"
                                >
                                  <AccordionTrigger className="py-2 hover:no-underline">
                                    <div className="flex w-full items-center justify-between gap-2 pr-2">
                                      <span className="text-sm font-medium text-left">
                                        {exercise.name}
                                      </span>
                                      <span className="text-xs text-muted-foreground shrink-0">
                                        {averageScore === null ? 'Sin puntaje' : `Prom: ${averageScore}/5`}
                                      </span>
                                    </div>
                                  </AccordionTrigger>

                                  <AccordionContent className="space-y-2 pb-2">
                                    <p className="text-xs text-muted-foreground line-clamp-2">
                                      {exercise.description ??
                                        exercise.objective ??
                                        'Ejercicio guiado de esta etapa.'}
                                    </p>

                                    <div className="flex flex-wrap gap-1">
                                      {SCORE_VALUES.map((value) => (
                                        <Button
                                          key={`${exercise.id}-progress-score-${value}`}
                                          type="button"
                                          variant={selectedScore === value ? 'default' : 'outline'}
                                          size="sm"
                                          className="h-8 w-8 px-0 text-xs"
                                          onClick={() =>
                                            setExerciseScore(
                                              saved.currentWeek,
                                              exercise.id,
                                              selectedCurrentWeekScoreDayIndex,
                                              value
                                            )
                                          }
                                          disabled={!canScoreCurrentSelectedDay}
                                        >
                                          {value}
                                        </Button>
                                      ))}
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 px-2 text-xs"
                                        onClick={() =>
                                          setExerciseScore(
                                            saved.currentWeek,
                                            exercise.id,
                                            selectedCurrentWeekScoreDayIndex,
                                            null
                                          )
                                        }
                                        disabled={!canScoreCurrentSelectedDay}
                                      >
                                        Limpiar
                                      </Button>
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>
                              );
                            })}
                          </Accordion>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}

              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground">
                  <span>{workedDays} / {totalDays} días</span>
                  <span>{dayProgressPct}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary/70 transition-all"
                    style={{ width: `${dayProgressPct}%` }}
                    role="progressbar"
                    aria-valuenow={dayProgressPct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {daysRemaining > 0
                    ? `Quedan ${daysRemaining} día${daysRemaining === 1 ? '' : 's'}.`
                    : '¡Duración estimada completada!'}
                </p>
              </div>

              {user && latestHistoryEntry && (
                <div className="pt-2">
                  <h3 className="text-sm font-medium">Último registro</h3>
                  <div className="mt-2 rounded-lg border p-2 text-xs sm:text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">
                        {PROGRESS_ACTION_LABELS[latestHistoryEntry.action]}
                      </span>
                      <span className="text-muted-foreground">
                        {formatDateTime(latestHistoryEntry.createdAt)}
                      </span>
                    </div>
                    <p className="text-muted-foreground">
                      Semana: {latestHistoryEntry.week ?? '-'} | Actual: {latestHistoryEntry.currentWeek}
                    </p>
                  </div>
                  <div className="mt-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href="/history">Ver historial completo</Link>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {plan.stages?.length && isAdmin ? (
          <section>
            <h2 className="text-xl font-semibold mb-4">Etapas del plan</h2>
            <ol className="relative border-l border-primary/30 space-y-6 pl-6">
              {plan.stages.map((stage) => {
                const active = stage.week === saved.currentWeek;
                const completed = isCompleted(stage.week);
                const editable = isWeekEditable(stage.week);
                const stageExercises = (stage.exerciseIds ?? [])
                  .map((exerciseId) => plan.exercises.find((entry) => entry.id === exerciseId))
                  .filter((entry): entry is (typeof plan.exercises)[number] => Boolean(entry));
                return (
                  <li key={`${plan.id}-timeline-${stage.week}`} className="ml-2">
                    <div
                      className={`absolute -left-[9px] mt-1 h-4 w-4 rounded-full ${
                        completed ? 'bg-primary' : 'bg-muted'
                      }`}
                    />
                    <div className="flex flex-col items-start gap-2">
                      <Badge variant={active ? 'default' : 'secondary'}>
                        Semana {stage.week}
                      </Badge>
                      <div className="flex items-center gap-2">
                        {stage.title && (
                          <span className="font-medium">{stage.title}</span>
                        )}
                        {completed && (
                          <span className="text-xs text-muted-foreground">
                            (Completada)
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      {stageExercises.length > 0
                        ? stageExercises.map((exercise) => (
                            <Button
                              key={`${plan.id}-stage-${stage.week}-exercise-${exercise.id}`}
                              asChild
                              size="sm"
                              variant="secondary"
                            >
                              <Link href={`/exercises/${exercise.id}?from=${plan.id}`}>
                                Ver ejercicio: {exercise.name}
                              </Link>
                            </Button>
                          ))
                        : null}
                      <label className="flex items-center gap-2 text-sm text-muted-foreground select-none cursor-pointer">
                        <input
                          type="checkbox"
                          checked={completed}
                          onChange={(event) =>
                            event.target.checked
                              ? markWeekDone(stage.week)
                              : unmarkWeek(stage.week)
                          }
                          disabled={isLoadingProgress || !editable}
                        />
                        {editable ? 'Marcar completada' : 'Semana cerrada'}
                      </label>
                    </div>

                    <p className="mt-2 text-sm text-muted-foreground">
                      {stage.description}
                    </p>
                  </li>
                );
              })}
            </ol>
          </section>
        ) : null}

        <section>
          <Card>
            <CardHeader>
              <CardTitle>{isAdmin ? 'Vista de administrador' : 'Sincronización de estudiante activa'}</CardTitle>
              <CardDescription>
                El progreso está vinculado a {user.displayName || user.email}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Cada avance diario y semanal se guarda y se agrega al historial de este estudiante.
              </p>
              {!USE_FIRESTORE && (
                <p className="text-sm text-muted-foreground">
                  Modo local activo: el historial se guarda en este dispositivo.
                </p>
              )}
            </CardContent>
          </Card>
        </section>

      </main>
    </div>
  );
}

function hasAnyProgress(saved: SavedPlan): boolean {
  const hasAnyDayChecked = Object.values(saved.daysByWeek ?? {}).some(
    (days) => Array.isArray(days) && days.some(Boolean)
  );
  const hasAnyScore = Object.values(saved.scoresByWeek ?? {}).some((weekScores) =>
    Object.values(weekScores ?? {}).some((scores) =>
      Array.isArray(scores) && scores.some((value) => typeof value === 'number')
    )
  );

  return Boolean(
    saved.startAt || saved.currentWeek > 0 || saved.completedWeeks.length > 0 || hasAnyDayChecked || hasAnyScore
  );
}

function formatDate(dateIso: string): string {
  return new Date(dateIso).toLocaleDateString('es-UY', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(date: Date | null): string {
  if (!date) return 'Ahora';
  return date.toLocaleString('es-UY', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function firestoreSyncErrorMessage(error: unknown): string {
  if (typeof error !== 'object' || !error || !('code' in error)) {
    return 'Se guardara localmente por ahora.';
  }

  const code = String(error.code);

  switch (code) {
    case 'permission-denied':
      return 'Firestore bloqueó el acceso. Revisa las reglas para users/{uid}.';
    case 'failed-precondition':
      return 'Firestore no está habilitado en este proyecto. Actívalo en Firebase Console.';
    case 'unauthenticated':
      return 'La sesión no es válida para escribir en Firestore. Inicia sesión de nuevo.';
    case 'unavailable':
      return 'Firestore está temporalmente no disponible. Intenta de nuevo en unos minutos.';
    case 'not-found':
      return 'No se encontró la base de datos de Firestore para este proyecto.';
    default:
      return `Error de sincronización (${code}). Se guardará localmente por ahora.`;
  }
}
