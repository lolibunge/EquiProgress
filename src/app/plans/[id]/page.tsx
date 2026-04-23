'use client';

import Image from 'next/image';
import Link from 'next/link';
import { notFound, useParams, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/components/auth-provider';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
import {
  getPlanDayExercises,
  getPlanWeekExercises,
  trainingPlans,
  type TrainingPlan,
  weekUsesMultiExerciseDays,
} from '@/data/training-plans';

type ProgressEvent = {
  action: ProgressAction;
  week?: number | null;
  note?: string | null;
};

const WORK_DAYS_PER_WEEK = 5;
const WORKDAY_LABELS = ['Día 1', 'Día 2', 'Día 3', 'Día 4', 'Día 5'];
const SCORE_VALUES = [1, 2, 3, 4, 5] as const;
const STUDENT_PANEL_CLASS =
  'rounded-[1.9rem] border border-[#dccab7] bg-[#fffaf2]/95 shadow-[0_18px_45px_rgba(120,92,68,0.10)]';
const STUDENT_PANEL_INSET_CLASS =
  'rounded-[1.5rem] border border-[#ddceb9] bg-white/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.55)]';
const STUDENT_MUTED_PANEL_CLASS =
  'rounded-[1.35rem] border border-[#e3d7c7] bg-[#f4ecde]/78';
const STUDENT_PROGRESS_TRACK_CLASS = 'bg-[#e6dccb]';
const STUDENT_PROGRESS_FILL_CLASS =
  'bg-gradient-to-r from-[#a24a1d] via-[#d88348] to-[#f4c68b]';
const STUDENT_PRIMARY_BUTTON_CLASS =
  'h-16 w-full rounded-full border-0 bg-[#b99b6a] px-8 text-lg font-bold text-[#2f2118] shadow-none hover:bg-[#ad8d5d] hover:text-[#2f2118] sm:w-auto';
const STUDENT_SECONDARY_BUTTON_CLASS =
  'h-12 rounded-full border border-[#ddceb9] bg-[#fff8ee] px-6 text-base font-semibold text-[#5f4636] shadow-none hover:bg-[#f3eadc] hover:text-[#4c382c]';

export default function PlanDetailPage() {
  return (
    <Suspense fallback={<PlanDetailPageLoading />}>
      <PlanDetailPageContent />
    </Suspense>
  );
}

function PlanDetailPageContent() {
  const searchParams = useSearchParams();
  const { id } = useParams<{ id: string }>();
  const matchedPlan = trainingPlans.find((entry) => entry.id === id);
  if (!matchedPlan) {
    notFound();
  }
  const plan: TrainingPlan = matchedPlan;

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
    return getPlanWeekExercises(plan, week);
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
  const spotlightWeek =
    saved.currentWeek > 0 ? saved.currentWeek : editableWeek > 0 ? editableWeek : 1;
  const spotlightStage =
    plan.stages?.find((stage) => stage.week === spotlightWeek) ?? plan.stages?.[0] ?? null;
  const spotlightWeekDays = getWeekDays(spotlightWeek);
  const spotlightExercises = getStageExercises(spotlightWeek);
  const spotlightUsesMultiExerciseDays = weekUsesMultiExerciseDays(plan, spotlightWeek);
  const spotlightDayIndex = (() => {
    const nextOpenDay = spotlightWeekDays.findIndex((done) => !done);
    return nextOpenDay >= 0 ? nextOpenDay : 0;
  })();
  const spotlightDayNumber = spotlightDayIndex + 1;
  const spotlightDayExercises = getPlanDayExercises(plan, spotlightWeek, spotlightDayNumber);
  const spotlightExercise =
    spotlightDayExercises[0] ??
    spotlightExercises[0] ??
    plan.exercises[0] ??
    null;
  const spotlightDayLabel = `session-day-${spotlightDayNumber}`;
  const spotlightDaysWorked = spotlightWeekDays.filter(Boolean).length;
  const spotlightWeekPct = Math.round((spotlightDaysWorked / WORK_DAYS_PER_WEEK) * 100);
  const planHeroTone = getPlanHeroTone(plan.category);

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
        {(plan.image || spotlightExercise || plan.exercises?.length) && (
          <section className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.85fr)]">
            <div className="relative min-w-0 overflow-hidden rounded-[2rem] border border-primary/20 bg-[#211713] text-white shadow-[0_28px_70px_rgba(78,52,46,0.16)]">
              <div className="absolute inset-0">
                <Image
                  src={spotlightExercise?.image || plan.image || '/placeholder.jpg'}
                  alt={spotlightExercise?.name || planName}
                  fill
                  priority
                  sizes="100vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-black/35 to-[#1c1411]/95" />
                <div className={`absolute inset-0 bg-gradient-to-tr ${planHeroTone.heroGlow}`} />
              </div>

              <div className="relative flex min-h-[34rem] flex-col justify-between gap-8 p-5 sm:p-8">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/20 bg-black/15 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-white/95 backdrop-blur-sm [text-shadow:0_1px_8px_rgba(0,0,0,0.45)]">
                      Plan activo
                    </span>
                    <span className="rounded-full border border-white/20 bg-black/15 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.2em] text-white/95 backdrop-blur-sm [text-shadow:0_1px_8px_rgba(0,0,0,0.45)]">
                      Semana {spotlightWeek} de {plan.weeks}
                    </span>
                  </div>
                  <div className="rounded-2xl border border-white/12 bg-black/15 px-4 py-3 text-right backdrop-blur-sm">
                    <p className="text-[10px] uppercase tracking-[0.22em] text-white/78 [text-shadow:0_1px_8px_rgba(0,0,0,0.45)]">Semana</p>
                    <p className="text-2xl font-semibold leading-none text-white [text-shadow:0_3px_16px_rgba(0,0,0,0.5)]">{spotlightDaysWorked}/{WORK_DAYS_PER_WEEK}</p>
                    <p className="mt-1 text-xs text-white/90 [text-shadow:0_1px_8px_rgba(0,0,0,0.45)]">días trabajados</p>
                  </div>
                </div>

                <div className="max-w-2xl space-y-4">
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.24em] text-white/82 [text-shadow:0_1px_8px_rgba(0,0,0,0.5)]">
                      {spotlightStage?.title || 'Sesión recomendada'}
                    </p>
                    <h2 className="text-4xl font-black leading-[0.92] tracking-tight text-white [text-shadow:0_5px_22px_rgba(0,0,0,0.6)] sm:text-5xl">
                      {spotlightUsesMultiExerciseDays
                        ? `Sesión del día ${spotlightDayNumber}`
                        : spotlightExercise?.name || planName}
                    </h2>
                    <p className="max-w-xl text-sm leading-relaxed text-white/92 [text-shadow:0_2px_12px_rgba(0,0,0,0.55)] sm:text-base">
                      {spotlightUsesMultiExerciseDays
                        ? `Hoy repites los ${spotlightDayExercises.length} ejercicios de ${spotlightStage?.title || 'esta etapa'}.`
                        : spotlightExercise?.objective || spotlightStage?.description || planDescription}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs text-white/95 sm:text-sm">
                    <span className="rounded-full bg-black/15 px-3 py-1 backdrop-blur-sm [text-shadow:0_1px_8px_rgba(0,0,0,0.45)]">
                      {spotlightUsesMultiExerciseDays
                        ? `${spotlightDayExercises.length} ejercicios`
                        : spotlightExercise?.duration || plan.duration}
                    </span>
                    <span className="rounded-full bg-black/15 px-3 py-1 backdrop-blur-sm [text-shadow:0_1px_8px_rgba(0,0,0,0.45)]">
                      {planName}
                    </span>
                    <span className="rounded-full bg-black/15 px-3 py-1 backdrop-blur-sm [text-shadow:0_1px_8px_rgba(0,0,0,0.45)]">
                      {progressPct}% completado
                    </span>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                  <div className="min-w-0 rounded-[1.6rem] border border-white/12 bg-white/10 p-4 backdrop-blur-sm">
                    <p className="text-[11px] uppercase tracking-[0.2em] text-white/82 [text-shadow:0_1px_8px_rgba(0,0,0,0.45)]">
                      {spotlightUsesMultiExerciseDays ? 'Sesión del día' : 'En foco ahora'}
                    </p>
                    <div className="mt-3 flex items-start gap-3 sm:items-center">
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-[1rem] border border-white/12 bg-black/20 sm:h-20 sm:w-20 sm:rounded-[1.2rem]">
                        {spotlightExercise?.image ? (
                          <Image
                            src={spotlightExercise.image}
                            alt={spotlightExercise.name}
                            fill
                            sizes="80px"
                            className="object-cover"
                          />
                        ) : (
                          <div className={`h-full w-full bg-gradient-to-br ${planHeroTone.thumbGlow}`} />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="break-words text-base font-semibold leading-tight text-white [text-shadow:0_3px_16px_rgba(0,0,0,0.55)] sm:text-lg">
                          {spotlightUsesMultiExerciseDays
                            ? `Día ${spotlightDayNumber} · sesión completa`
                            : spotlightExercise?.name || planName}
                        </p>
                        <p className="mt-1 text-sm text-white/92 [text-shadow:0_2px_10px_rgba(0,0,0,0.5)]">
                          {spotlightUsesMultiExerciseDays
                            ? `Incluye ${spotlightDayExercises.length} ejercicios`
                            : spotlightExercise?.duration || spotlightStage?.title || 'Sesión destacada'}
                        </p>
                        {spotlightUsesMultiExerciseDays ? (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {spotlightDayExercises.map((exercise) => (
                              <span
                                key={`${plan.id}-spotlight-hero-${exercise.id}`}
                                className="rounded-full bg-black/15 px-3 py-1 text-xs text-white/95 backdrop-blur-sm [text-shadow:0_1px_8px_rgba(0,0,0,0.45)]"
                              >
                                {exercise.name}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-2 text-xs text-white/82 [text-shadow:0_1px_8px_rgba(0,0,0,0.45)]">
                            {spotlightStage?.description || planDescription}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    {spotlightUsesMultiExerciseDays ? (
                      <Button
                        type="button"
                        className={STUDENT_PRIMARY_BUTTON_CLASS}
                        onClick={() =>
                          document.getElementById(spotlightDayLabel)?.scrollIntoView({ behavior: 'smooth' })
                        }
                      >
                        Ver sesión del día
                      </Button>
                    ) : spotlightExercise?.id ? (
                      <Button asChild className={STUDENT_PRIMARY_BUTTON_CLASS}>
                        <Link href={`/exercises/${spotlightExercise.id}?from=${plan.id}&week=${spotlightWeek}&day=${spotlightDayNumber}`}>
                          Abrir sesión
                        </Link>
                      </Button>
                    ) : (
                      <Button
                        className={STUDENT_PRIMARY_BUTTON_CLASS}
                        onClick={saved.startAt ? () => setCurrentWeek(spotlightWeek) : startPlan}
                      >
                        {saved.startAt ? 'Continuar semana' : 'Comenzar plan'}
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      className="h-14 w-full rounded-full border-white/20 bg-white/5 px-7 text-base font-semibold text-white hover:bg-white/10 hover:text-white sm:w-auto"
                      onClick={() =>
                        document.getElementById('plan-progress')?.scrollIntoView({ behavior: 'smooth' })
                      }
                    >
                      Ver progreso
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="min-w-0 space-y-4">
              <Card className={`min-w-0 ${STUDENT_PANEL_CLASS}`}>
                <CardHeader>
                  <CardTitle>Resumen rápido</CardTitle>
                  <CardDescription>Un vistazo claro de dónde estás dentro del plan.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className={`${STUDENT_MUTED_PANEL_CLASS} px-4 py-3`}>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Semanas</p>
                      <p className="mt-1 text-2xl font-semibold">{weeksCompleted}/{plan.weeks}</p>
                    </div>
                    <div className={`${STUDENT_MUTED_PANEL_CLASS} px-4 py-3`}>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Días</p>
                      <p className="mt-1 text-2xl font-semibold">{workedDays}/{totalDays}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>Avance acumulado</span>
                      <span>{progressPct}%</span>
                    </div>
                    <div className={`h-3 overflow-hidden rounded-full ${STUDENT_PROGRESS_TRACK_CLASS}`}>
                      <div
                        className={`h-full rounded-full ${STUDENT_PROGRESS_FILL_CLASS}`}
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className={`min-w-0 ${STUDENT_PANEL_CLASS}`}>
                <CardHeader>
                  <CardTitle>Esta semana</CardTitle>
                  <CardDescription>
                    {spotlightStage?.title || `Semana ${spotlightWeek}`} · {spotlightWeekPct}% completada
                    {spotlightUsesMultiExerciseDays
                      ? ' · Los mismos 5 ejercicios se repiten cada día.'
                      : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {WORKDAY_LABELS.map((label, dayIndex) => (
                    (() => {
                      const dayExercises = getPlanDayExercises(plan, spotlightWeek, dayIndex + 1);
                      const primaryExercise = dayExercises[0] ?? null;

                      return (
                        <div
                          key={`${plan.id}-spotlight-day-${dayIndex}`}
                          id={`session-day-${dayIndex + 1}`}
                          className={`flex flex-col items-start gap-2 rounded-2xl border px-3 py-3 ${
                            spotlightWeekDays[dayIndex]
                              ? 'border-[#d1dfc4] bg-[#eef4e7]'
                              : 'border-primary/10 bg-background/75'
                          }`}
                        >
                          <div className="flex w-full items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                                {label}
                              </p>
                              {dayExercises.length > 1 ? (
                                <div className="mt-1 space-y-1">
                                  {dayExercises.map((exercise) => (
                                    <p
                                      key={`${plan.id}-spotlight-day-${dayIndex}-${exercise.id}`}
                                      className="break-words text-sm font-medium"
                                    >
                                      {exercise.name}
                                    </p>
                                  ))}
                                </div>
                              ) : (
                                <p className="mt-1 break-words text-sm font-medium">
                                  {primaryExercise?.name || 'Práctica del plan'}
                                </p>
                              )}
                            </div>
                            <span
                              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                                spotlightWeekDays[dayIndex]
                                  ? 'bg-[#dceacb] text-[#42552a]'
                                  : 'bg-secondary text-secondary-foreground'
                              }`}
                            >
                              {spotlightWeekDays[dayIndex] ? 'Hecho' : 'Pendiente'}
                            </span>
                          </div>
                        </div>
                      );
                    })()
                  ))}
                </CardContent>
              </Card>
            </div>
          </section>
        )}

        {plan.stages?.length ? (
          <section>
            <Card className={STUDENT_PANEL_CLASS}>
              <CardHeader>
                <CardTitle>Etapas del plan</CardTitle>
                <CardDescription>
                  Resumen simple por semana para seguir el taller paso a paso.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs key={`${plan.id}-${stageTabDefault}`} defaultValue={stageTabDefault}>
                  <div className="overflow-x-auto pb-2">
                    <TabsList className="h-auto min-w-max gap-2 rounded-[1.4rem] bg-[#efe6d8] p-2">
                      {plan.stages.map((stage) => (
                        <TabsTrigger
                          key={`${plan.id}-stage-tab-${stage.week}`}
                          value={`week-${stage.week}`}
                          className="rounded-full px-5 py-2.5 text-base text-[#745340] data-[state=active]:bg-[#fffaf2] data-[state=active]:text-[#4f3629] data-[state=active]:shadow-[0_10px_22px_rgba(120,92,68,0.12)]"
                        >
                          Semana {stage.week}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                  </div>

                  {plan.stages.map((stage) => {
                    const stageExercises = getStageExercises(stage.week);

                    return (
                      <TabsContent
                        key={`${plan.id}-stage-content-${stage.week}`}
                        value={`week-${stage.week}`}
                        className="mt-5"
                      >
                        <div className={`${STUDENT_PANEL_INSET_CLASS} space-y-4 p-5`}>
                          <div className="space-y-2">
                            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                              Etapa {stage.week}
                            </p>
                            <h3 className="text-2xl font-semibold">
                              {stage.title || `Semana ${stage.week}`}
                            </h3>
                            <p className="text-base text-muted-foreground">
                              {stage.description}
                            </p>
                          </div>

                          {stageExercises.length > 0 ? (
                            <div className="space-y-2">
                              <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
                                Ejercicios de esta etapa
                              </p>
                              <Accordion type="multiple" className="space-y-2">
                                {stageExercises.map((exercise) => {
                                  return (
                                    <AccordionItem
                                      key={`${plan.id}-stage-${stage.week}-exercise-tab-${exercise.id}`}
                                      value={`stage-${stage.week}-${exercise.id}`}
                                      className="rounded-[1.3rem] border border-[#dccdb8] bg-white/60 px-4"
                                    >
                                      <AccordionTrigger className="py-4 text-left text-base font-medium hover:no-underline">
                                        <span className="font-medium">{exercise.name}</span>
                                      </AccordionTrigger>
                                      <AccordionContent className="pb-4">
                                        <div className="space-y-3">
                                          <p className="text-sm leading-relaxed text-muted-foreground">
                                            {exercise.description ??
                                              exercise.objective ??
                                              'Ejercicio guiado de esta etapa.'}
                                          </p>
                                          <Button
                                            asChild
                                            variant="secondary"
                                            className={`${STUDENT_SECONDARY_BUTTON_CLASS} h-11 px-5 text-sm`}
                                          >
                                            <Link href={`/exercises/${exercise.id}?from=${plan.id}`}>
                                              Ver ficha completa
                                            </Link>
                                          </Button>
                                        </div>
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

        <section id="plan-progress">
          <Card className={STUDENT_PANEL_CLASS}>
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
                  className={STUDENT_PRIMARY_BUTTON_CLASS}
                  onClick={startPlan}
                  disabled={isLoadingProgress}
                >
                  Iniciar plan
                </Button>
              ) : (
                <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto">
                  <div className="grid w-full min-w-0 grid-cols-2 gap-2 sm:min-w-[24rem]">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCurrentWeek(previousWeekTarget)}
                      disabled={!canGoToPreviousWeek}
                      className="h-auto min-h-[4.25rem] w-full flex-col items-start justify-center rounded-[1.5rem] border-[#ddceb9] bg-white/55 px-4 py-3 text-left hover:bg-[#f6efe4] disabled:opacity-45"
                    >
                      <span className="text-[11px] uppercase tracking-[0.16em] text-[#8f7a67]">
                        Anterior
                      </span>
                      <span className="text-base font-semibold leading-tight text-[#5f4636]">
                        Semana {previousWeekTarget}
                      </span>
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCurrentWeek(nextWeekTarget)}
                      disabled={!canGoToNextWeek}
                      className="h-auto min-h-[4.25rem] w-full flex-col items-start justify-center rounded-[1.5rem] border-[#ddceb9] bg-white/55 px-4 py-3 text-left hover:bg-[#f6efe4] disabled:opacity-45"
                    >
                      <span className="text-[11px] uppercase tracking-[0.16em] text-[#8f7a67]">
                        Siguiente
                      </span>
                      <span className="text-base font-semibold leading-tight text-[#5f4636]">
                        Semana {nextWeekTarget}
                      </span>
                    </Button>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={resetPlan}
                    disabled={isLoadingProgress}
                    className="h-11 w-full rounded-full px-5 text-center text-[#6d4d3a] hover:bg-[#f6efe4] sm:w-auto"
                  >
                    Reiniciar progreso
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

              <div className={`w-full h-2 overflow-hidden rounded-full ${STUDENT_PROGRESS_TRACK_CLASS}`}>
                <div
                  className={`h-full transition-all ${STUDENT_PROGRESS_FILL_CLASS}`}
                  style={{ width: `${progressPct}%` }}
                  role="progressbar"
                  aria-valuenow={progressPct}
                  aria-valuemin={0}
                  aria-valuemax={100}
                />
              </div>

              {saved.currentWeek > 0 && (
                <Accordion
                  type="single"
                  collapsible
                  className="rounded-[1.45rem] border border-[#ddceb9] bg-white/55 px-4"
                >
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
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                        {WORKDAY_LABELS.map((label, dayIndex) => (
                          <label
                            key={`${saved.currentWeek}-${label}`}
                            className={`${STUDENT_MUTED_PANEL_CLASS} flex items-center gap-2 px-3 py-3 text-sm`}
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
                        <div className={`${STUDENT_PANEL_INSET_CLASS} space-y-3 p-4`}>
                          <p className="text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">
                            Puntaje semanal por ejercicio
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {WORKDAY_LABELS.map((_, dayIdx) => (
                              <Button
                                key={`current-week-score-day-${dayIdx}`}
                                type="button"
                                variant={selectedCurrentWeekScoreDayIndex === dayIdx ? 'default' : 'outline'}
                                size="sm"
                                className="h-8 rounded-full px-3 text-xs"
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
                                className="rounded-[1.2rem] border border-[#ddceb9] bg-white/60 px-3"
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
                                        className="h-8 w-8 rounded-full px-0 text-xs"
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
                                        className="h-8 rounded-full px-3 text-xs"
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
                <div className={`w-full h-2 overflow-hidden rounded-full ${STUDENT_PROGRESS_TRACK_CLASS}`}>
                  <div
                    className={`h-full transition-all ${STUDENT_PROGRESS_FILL_CLASS}`}
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
                  <div className="mt-2 rounded-[1.2rem] border border-[#ddceb9] bg-white/60 p-3 text-xs sm:text-sm">
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
                    <Button asChild variant="outline" className={STUDENT_SECONDARY_BUTTON_CLASS}>
                      <Link href="/history">Ver historial completo</Link>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <section>
          <Card className={STUDENT_PANEL_CLASS}>
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

function PlanDetailPageLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground font-body antialiased">
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Cargando plan...</CardTitle>
            <CardDescription>Preparando detalles del plan.</CardDescription>
          </CardHeader>
        </Card>
      </main>
    </div>
  );
}

function getPlanHeroTone(category: string) {
  switch (category) {
    case 'Retraining':
      return {
        heroGlow: 'from-[#d8ea65]/0 via-[#a7c338]/12 to-[#5f6e1d]/30',
        barGlow: 'from-[#7c8d24] via-[#bfd84f] to-[#eef7b7]',
        thumbGlow: 'from-[#7c8d24] to-[#d8ea65]',
      };
    case 'Continuing Training':
      return {
        heroGlow: 'from-[#f1d5b0]/0 via-[#a97c60]/12 to-[#4E342E]/28',
        barGlow: 'from-[#7b5843] via-[#b48b68] to-[#f1d5b0]',
        thumbGlow: 'from-[#7b5843] to-[#d8b28d]',
      };
    case 'Unbroke':
    default:
      return {
        heroGlow: 'from-[#f8d7b0]/0 via-[#b85a2b]/10 to-[#6f2f16]/32',
        barGlow: 'from-[#8f3c16] via-[#cf7842] to-[#efc596]',
        thumbGlow: 'from-[#8f3c16] to-[#ddb07b]',
      };
  }
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
