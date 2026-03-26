'use client';

import Image from 'next/image';
import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { useAuth } from '@/components/auth-provider';
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
import { useToast } from '@/hooks/use-toast';
import { USE_FIRESTORE } from '@/lib/firebase';
import {
  canUserAccessPlan,
  getPlanDisplayDescription,
  getPlanDisplayName,
  isAdminUser,
} from '@/lib/plan-visibility';
import {
  createEmptyProgress,
  loadRemotePlanProgress,
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
const WORKDAY_LABELS = ['Dia 1', 'Dia 2', 'Dia 3', 'Dia 4', 'Dia 5'];

export default function PlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const plan = trainingPlans.find((entry) => entry.id === id);
  if (!plan) notFound();

  const STORAGE_KEY = `equi:plan:${plan.id}`;

  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const isAdmin = isAdminUser(user);
  const canAccessPlan = canUserAccessPlan(plan.id, isAdmin);
  const planName = getPlanDisplayName(plan.id, plan.name, isAdmin);
  const planDescription = getPlanDisplayDescription(plan.id, plan.description, isAdmin);

  const [saved, setSaved] = useState<SavedPlan>(createEmptyProgress());
  const [isLoadingProgress, setIsLoadingProgress] = useState(true);
  const [recentHistory, setRecentHistory] = useState<ProgressHistoryEntry[]>([]);
  const [hasShownSyncError, setHasShownSyncError] = useState(false);

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

      if (user && canAccessPlan && USE_FIRESTORE) {
        try {
          const remoteProgress = await loadRemotePlanProgress(user.uid, plan.id);

          if (remoteProgress) {
            nextProgress = remoteProgress;
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
              title: 'Fallo la sincronizacion en la nube',
              description: firestoreSyncErrorMessage(error),
            });
            setHasShownSyncError(true);
          }
        }
      }

      clearTimeout(unblockTimer);

      if (cancelled) return;

      setSaved(normalizeSavedPlan(nextProgress));
      setIsLoadingProgress(false);
    }

    void loadProgress();

    return () => {
      cancelled = true;
    };
  }, [STORAGE_KEY, authLoading, canAccessPlan, hasShownSyncError, plan.id, planName, toast, user]);

  useEffect(() => {
    if (!user || !canAccessPlan || !USE_FIRESTORE || authLoading) {
      setRecentHistory([]);
      return;
    }

    const unsubscribe = subscribeHistory(user.uid, (entries) => {
      const filtered = entries
        .filter((entry) => entry.planId === plan.id)
        .slice(0, 8);
      setRecentHistory(filtered);
    }, 120);

    return unsubscribe;
  }, [authLoading, canAccessPlan, plan.id, user]);

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

    persist(
      {
        ...saved,
        completedWeeks,
        daysByWeek: {
          ...saved.daysByWeek,
          [String(week)]: resetDays,
        },
      },
      {
        action: 'week_unmarked',
        week,
      }
    );
  }

  function setWorkDay(week: number, dayIndex: number, checked: boolean) {
    if (!isWeekEditable(week)) return;

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

    persist(
      {
        ...saved,
        currentWeek,
        completedWeeks,
        daysByWeek: {
          ...saved.daysByWeek,
          [String(week)]: nextDays,
        },
      },
      event
    );
  }

  function goToNextWeek() {
    if (editableWeek <= 0) return;

    if (saved.currentWeek !== editableWeek) {
      setCurrentWeek(editableWeek);
      return;
    }

    markWeekDone(editableWeek);
  }

  function isWeekEditable(week: number): boolean {
    return editableWeek > 0 && week === editableWeek;
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

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground font-body antialiased">
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Loading plan...</CardTitle>
              <CardDescription>Checking account access.</CardDescription>
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
              <CardTitle>Login required</CardTitle>
              <CardDescription>
                Students must log in to open assigned training plans.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild className="w-full">
                <Link href="/login">Go to login</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/">Back to home</Link>
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
              <CardTitle>Plan not assigned</CardTitle>
              <CardDescription>
                This account does not have access to this plan.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link href="/">Back to assigned plans</Link>
              </Button>
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
        {plan.image && (
          <div className="relative w-full aspect-[1/1] overflow-hidden rounded-2xl">
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

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Descripción general</CardTitle>
              <CardDescription>{plan.duration}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                {planDescription}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Duración</CardTitle>
              <CardDescription>Semanas estimadas</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-4">
              <span className="text-4xl font-extrabold">{plan.weeks}</span>
              <span className="text-muted-foreground">semanas</span>
            </CardContent>
          </Card>
        </section>

        <section>
          <Card>
            <CardHeader>
              <CardTitle>{isAdmin ? 'Vista de administrador' : 'Sincronizacion de estudiante activa'}</CardTitle>
              <CardDescription>
                El progreso esta vinculado a {user.displayName || user.email}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Cada avance diario y semanal se guarda y se agrega al historial de este estudiante.
              </p>
              <Button asChild variant="outline">
                <Link href="/history">Abrir historial completo</Link>
              </Button>
              {!USE_FIRESTORE && (
                <p className="text-sm text-muted-foreground">
                  La sincronizacion de Firestore esta desactivada. Define `NEXT_PUBLIC_USE_FIRESTORE=true` para guardar historial en la nube.
                </p>
              )}
            </CardContent>
          </Card>
        </section>

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
                      onClick={() => setCurrentWeek(saved.currentWeek - 1)}
                      disabled={saved.currentWeek <= 1 || isLoadingProgress}
                      className="flex-1 sm:flex-none whitespace-normal text-center"
                    >
                      Semana anterior
                    </Button>
                    <Button
                      variant="outline"
                      onClick={goToNextWeek}
                      disabled={
                        editableWeek <= 0 ||
                        isLoadingProgress ||
                        saved.currentWeek <= 0
                      }
                      className="flex-1 sm:flex-none whitespace-normal text-center"
                    >
                      {editableWeek <= 0
                        ? 'Plan completado'
                        : saved.currentWeek === editableWeek
                          ? editableWeek >= plan.weeks
                            ? 'Finalizar semana'
                            : 'Siguiente semana'
                          : `Ir a semana ${editableWeek}`}
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
                <div className="space-y-2 rounded-lg border border-primary/20 p-3">
                  <p className="text-xs text-muted-foreground">
                    Semana actual: <strong>{saved.currentWeek}</strong> de {plan.weeks}
                  </p>
                  <p className="text-sm font-medium">
                    Semana {saved.currentWeek}: marcar dias trabajados
                  </p>
                  {!isCurrentWeekEditable && editableWeek > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Semana en solo lectura. La semana activa para editar es la {editableWeek}.
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
                    {currentWeekDays.filter(Boolean).length} / {WORK_DAYS_PER_WEEK} dias trabajados
                    en esta semana.
                  </p>
                </div>
              )}

              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground">
                  <span>{workedDays} / {totalDays} dias</span>
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

              {user && recentHistory.length > 0 && (
                <div className="pt-2">
                  <h3 className="text-sm font-medium">Historial reciente</h3>
                  <ul className="mt-2 space-y-2">
                    {recentHistory.map((entry) => (
                      <li key={entry.id} className="rounded-lg border p-2 text-xs sm:text-sm">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-medium">
                            {PROGRESS_ACTION_LABELS[entry.action]}
                          </span>
                          <span className="text-muted-foreground">
                            {formatDateTime(entry.createdAt)}
                          </span>
                        </div>
                        <p className="text-muted-foreground">
                          Semana: {entry.week ?? '-'} | Actual: {entry.currentWeek}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {plan.stages?.length ? (
          <section>
            <h2 className="text-xl font-semibold mb-4">Etapas del plan</h2>
            <ol className="relative border-l border-primary/30 space-y-6 pl-6">
              {plan.stages.map((stage) => {
                const active = stage.week === saved.currentWeek;
                const completed = isCompleted(stage.week);
                const editable = isWeekEditable(stage.week);
                const stagePrimaryExerciseId = stage.exerciseIds?.[0];
                const stagePrimaryExercise = stagePrimaryExerciseId
                  ? plan.exercises.find((entry) => entry.id === stagePrimaryExerciseId)
                  : null;
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
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCurrentWeek(stage.week)}
                        disabled={isLoadingProgress}
                      >
                        Ir a esta semana
                      </Button>
                      {stagePrimaryExercise && (
                        <Button asChild size="sm" variant="secondary">
                          <Link href={`/exercises/${stagePrimaryExercise.id}?from=${plan.id}`}>
                            Ver ejercicio
                          </Link>
                        </Button>
                      )}
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

        {plan.exercises?.length ? (
          <section>
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="text-xl font-semibold">Ejercicios del plan</h2>
              <span className="text-sm text-muted-foreground">
                {plan.exercises.length} ejercicios
              </span>
            </div>

            <Carousel opts={{ loop: true, align: 'center' }}>
              <CarouselContent>
                {plan.exercises.map((exercise, index) => (
                  <CarouselItem
                    key={`${plan.id}-ex-${exercise.id ?? 'noid'}-${index}`}
                    className="basis-[350px] sm:basis-[350px] md:basis-[350px] lg:basis-[350px] px-1 sm:px-2"
                  >
                    <Card className="h-full overflow-hidden rounded-lg">
                      <div className="relative w-full aspect-square overflow-hidden">
                        <Image
                          src={exercise.image || '/placeholder.jpg'}
                          alt={exercise.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 160px, (max-width: 768px) 200px, (max-width: 1024px) 240px, 280px"
                        />
                      </div>

                      <CardHeader className="py-2">
                        <CardTitle className="text-sm leading-tight line-clamp-2">
                          {exercise.name}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {exercise.duration ?? exercise.reps ?? '—'}
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="pt-0 pb-2">
                        <p className="text-xs text-muted-foreground line-clamp-3">
                          {exercise.description}
                        </p>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>

              <CarouselPrevious className="left-1 top-1/2 -translate-y-1/2 h-7 w-7" />
              <CarouselNext className="right-1 top-1/2 -translate-y-1/2 h-7 w-7" />
            </Carousel>
          </section>
        ) : null}

        <section className="flex justify-end">
          <Button asChild>
            <Link href="/">Elegir otro plan</Link>
          </Button>
        </section>
      </main>
    </div>
  );
}

function hasAnyProgress(saved: SavedPlan): boolean {
  const hasAnyDayChecked = Object.values(saved.daysByWeek ?? {}).some(
    (days) => Array.isArray(days) && days.some(Boolean)
  );
  return Boolean(saved.startAt || saved.currentWeek > 0 || saved.completedWeeks.length > 0 || hasAnyDayChecked);
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
      return 'Firestore bloqueo el acceso. Revisa las reglas para users/{uid}.';
    case 'failed-precondition':
      return 'Firestore no esta habilitado en este proyecto. Activalo en Firebase Console.';
    case 'unauthenticated':
      return 'La sesion no es valida para escribir en Firestore. Inicia sesion de nuevo.';
    case 'unavailable':
      return 'Firestore esta temporalmente no disponible. Intenta de nuevo en unos minutos.';
    case 'not-found':
      return 'No se encontro la base de datos de Firestore para este proyecto.';
    default:
      return `Error de sincronizacion (${code}). Se guardara localmente por ahora.`;
  }
}
