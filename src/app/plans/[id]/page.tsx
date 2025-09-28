// app/plans/[id]/page.tsx
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { notFound, useParams } from 'next/navigation';
import { trainingPlans } from '@/data/training-plans';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { useEffect, useMemo, useState } from 'react';

type SavedPlan = {
  startAt?: string | null;
  currentWeek: number; // 0 = not started, 1..weeks in progress
  completedWeeks: number[]; // e.g., [1,2,3]
};

export default function PlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const plan = trainingPlans.find((p) => p.id === id);
  if (!plan) notFound();

  // ─────────────────────────────────────────────────────────────
  // Progress (by weeks) persisted in localStorage
  // ─────────────────────────────────────────────────────────────
  const STORAGE_KEY = `equi:plan:${plan.id}`;

  const [saved, setSaved] = useState<SavedPlan>({
    startAt: null,
    currentWeek: 0,
    completedWeeks: [],
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as SavedPlan;
        setSaved({
          startAt: parsed.startAt ?? null,
          currentWeek: parsed.currentWeek ?? 0,
          completedWeeks: Array.isArray(parsed.completedWeeks)
            ? parsed.completedWeeks
            : [],
        });
      }
    } catch {
      // ignore
    }
  }, [STORAGE_KEY]);

  function persist(next: SavedPlan) {
    setSaved(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  function startPlan() {
    persist({
      startAt: new Date().toISOString(),
      currentWeek: 1,
      completedWeeks: [],
    });
  }

  function resetPlan() {
    persist({ startAt: null, currentWeek: 0, completedWeeks: [] });
  }

  const isCompleted = (w: number) => saved.completedWeeks.includes(w);

  function setCurrentWeek(w: number) {
    const clamped = Math.max(1, Math.min(plan.weeks, w));
    persist({ ...saved, currentWeek: clamped });
  }

  function markWeekDone(w: number) {
    if (isCompleted(w)) return;
    const completedWeeks = [...new Set([...saved.completedWeeks, w])].sort(
      (a, b) => a - b
    );
    let currentWeek = saved.currentWeek;
    if (w === saved.currentWeek && saved.currentWeek < plan.weeks) {
      currentWeek = saved.currentWeek + 1; // auto-advance
    }
    persist({ ...saved, completedWeeks, currentWeek });
  }

  function unmarkWeek(w: number) {
    const completedWeeks = saved.completedWeeks.filter((x) => x !== w);
    persist({ ...saved, completedWeeks });
  }

  function completeCurrentWeek() {
    if (saved.currentWeek <= 0) return;
    markWeekDone(saved.currentWeek);
  }

  const weeksCompleted = saved.completedWeeks.length;
  const progressPct = Math.round((weeksCompleted / plan.weeks) * 100);

  // ====== Progreso por días (auto + manual) ======
  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const totalDays = Math.max(1, plan.weeks * 7);
  const startedDate = saved.startAt ? new Date(saved.startAt) : null;

  const actualDaysElapsed = useMemo(() => {
    if (!startedDate) return 0;
    const diffMs = now - startedDate.getTime();
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1); // día 1 cuenta
  }, [now, startedDate]);

  // días “manuales” según semanas completadas
  const manualDaysElapsed = weeksCompleted * 7;

  // usamos el mayor de ambos, limitado al total
  const daysElapsed = Math.min(totalDays, Math.max(actualDaysElapsed, manualDaysElapsed));
  const daysRemaining = Math.max(0, totalDays - daysElapsed);
  const dayProgressPct = Math.round((daysElapsed / totalDays) * 100);

  // (opcional) auto-sincronizar semana actual a partir de los días (reales o manuales)
  useEffect(() => {
    if (!saved.startAt) return;
    const autoWeek = Math.min(
      plan.weeks,
      Math.max(1, Math.ceil(daysElapsed / 7))
    );
    if (saved.currentWeek < autoWeek) {
      persist({ ...saved, currentWeek: autoWeek });
    }
  }, [daysElapsed, saved, plan.weeks]);

  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

  // ETA: si el progreso manual > real, estimamos desde “hoy”; si no, desde startAt
  const etaDate = useMemo(() => {
    if (!saved.startAt) return null;
    const baseMs =
      manualDaysElapsed > actualDaysElapsed
        ? now // progreso manual “trae” la fecha fin hacia hoy
        : startedDate!.getTime();
    const end = new Date(baseMs + (daysRemaining > 0 ? (daysRemaining - 1) * 86400000 : 0));
    return end;
  }, [saved.startAt, manualDaysElapsed, actualDaysElapsed, daysRemaining, now]);

  // ─────────────────────────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-foreground font-body antialiased">
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b border-primary/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-primary"
          >
            &larr; Volver
          </Link>
          <h1 className="text-lg font-headline font-semibold">{plan.name}</h1>
          <div />
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
        {/* HERO */}
        {plan.image && (
          <div className="relative w-full aspect-[1/1] overflow-hidden rounded-2xl">
            <Image
              src={plan.image}
              alt={`Imagen de ${plan.name}`}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          </div>
        )}

        {/* OVERVIEW */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Descripción general</CardTitle>
              <CardDescription>{plan.duration}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed">
                {plan.description}
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

        {/* PROGRESO / SEMANAS */}
        <section>
          <Card>
            <CardHeader className="space-y-3 sm:space-y-0 sm:flex sm:items-start sm:justify-between">
              <div className="min-w-0">
                <CardTitle>Progreso del plan</CardTitle>
                <CardDescription>
                  {saved.startAt
                    ? `Iniciado el ${fmt(new Date(saved.startAt))}`
                    : 'Aún no iniciado'}
                </CardDescription>
              </div>

              {/* Botones: columna en mobile, fila en sm+ */}
              {!saved.startAt || saved.currentWeek === 0 ? (
                <Button className="w-full sm:w-auto" onClick={startPlan}>
                  Iniciar plan
                </Button>
              ) : (
                <div className="flex w-full sm:w-auto flex-col sm:flex-row gap-2 sm:gap-2 min-w-0">
                  <div className="flex w-full gap-2 min-w-0">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentWeek(saved.currentWeek - 1)}
                      disabled={saved.currentWeek <= 1}
                      className="flex-1 sm:flex-none whitespace-normal text-center"
                    >
                      Semana anterior
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setCurrentWeek(saved.currentWeek + 1)}
                      disabled={saved.currentWeek >= plan.weeks}
                      className="flex-1 sm:flex-none whitespace-normal text-center"
                    >
                      Siguiente semana
                    </Button>
                  </div>

                  <div className="flex w-full gap-2 min-w-0">
                    <Button
                      onClick={completeCurrentWeek}
                      className="flex-1 sm:flex-none whitespace-normal text-center"
                    >
                      {/* En móvil podés abreviar el texto para evitar desborde */}
                      <span className="sm:hidden">Completar</span>
                      <span className="hidden sm:inline">Completar semana {saved.currentWeek}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={resetPlan}
                      className="flex-1 sm:flex-none whitespace-normal text-center"
                    >
                      Reiniciar
                    </Button>
                  </div>
                </div>
              )}
            </CardHeader>

            <CardContent className="space-y-3">
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

              {etaDate && (
                <p className="text-xs text-muted-foreground">
                  Fin estimado: {fmt(etaDate)}
                </p>
              )}

              {saved.currentWeek > 0 && (
                <p className="text-xs text-muted-foreground">
                  Semana actual: <strong>{saved.currentWeek}</strong> de{' '}
                  {plan.weeks}
                </p>
              )}

              {/* Progreso por días */}
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground">
                    <span>{daysElapsed} / {totalDays} días</span>
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

            </CardContent>
          </Card>
        </section>

        {/* TIMELINE / ETAPAS POR SEMANA */}
        {plan.stages?.length ? (
          <section>
            <h2 className="text-xl font-semibold mb-4">Etapas del plan</h2>
            <ol className="relative border-l border-primary/30 space-y-6 pl-6">
              {plan.stages.map((stage) => {
                const active = stage.week === saved.currentWeek;
                const completed = isCompleted(stage.week);
                return (
                  <li key={`${plan.id}-timeline-${stage.week}`} className="ml-2">
                    <div
                      className={`absolute -left-[9px] mt-1 h-4 w-4 rounded-full ${
                        completed ? 'bg-primary' : 'bg-muted'
                      }`}
                    />
                    <div className="flex items-center gap-2">
                      <Badge variant={active ? 'default' : 'secondary'}>
                        Semana {stage.week}
                      </Badge>
                      {stage.title && (
                        <span className="font-medium">{stage.title}</span>
                      )}
                      {completed && (
                        <span className="text-xs text-muted-foreground">
                          (Completada)
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex items-center gap-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCurrentWeek(stage.week)}
                      >
                        Ir a esta semana
                      </Button>
                      <label className="flex items-center gap-2 text-sm text-muted-foreground select-none cursor-pointer">
                        <input
                          type="checkbox"
                          checked={completed}
                          onChange={(e) =>
                            e.target.checked
                              ? markWeekDone(stage.week)
                              : unmarkWeek(stage.week)
                          }
                        />
                        Marcar completada
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

        {/* CARRUSEL DE EJERCICIOS */}
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
                {plan.exercises.map((ex, index) => (
                  <CarouselItem
                    key={`${plan.id}-ex-${ex.id ?? 'noid'}-${index}`}
                    className="basis-[350px] sm:basis-[350px] md:basis-[350px] lg:basis-[350px] px-1 sm:px-2"
                  >
                    <Card className="h-full overflow-hidden rounded-lg">
                      <div className="relative w-full aspect-square overflow-hidden">
                        <Image
                          src={ex.image || '/placeholder.jpg'}
                          alt={ex.name}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 160px, (max-width: 768px) 200px, (max-width: 1024px) 240px, 280px"
                        />
                      </div>

                      <CardHeader className="py-2">
                        <CardTitle className="text-sm leading-tight line-clamp-2">
                          {ex.name}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          {ex.duration ?? ex.reps ?? '—'}
                        </CardDescription>
                      </CardHeader>

                      <CardContent className="pt-0 pb-2">
                        <p className="text-xs text-muted-foreground line-clamp-3">
                          {ex.description}
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

        {/* STACK SEMANA A SEMANA */}
        {plan.stages?.length ? (
          <section className="space-y-4">
            <h2 className="text-xl font-semibold">Detalle semana a semana</h2>
            <div className="grid gap-4">
              {plan.stages.map((stage) => (
                <Card key={`${plan.id}-stack-${stage.week}`}>
                  <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <Badge variant={stage.week === saved.currentWeek ? 'default' : 'secondary'}>
                        Semana {stage.week}
                      </Badge>
                      {stage.title && <span className="font-medium">{stage.title}</span>}
                    </div>
                    {/* si querés, mantené un botón para fijar semana actual */}
                    {/* <Button size="sm" variant="outline" onClick={() => setCurrentWeek(stage.week)}>Marcar como semana actual</Button> */}
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">{stage.description}</p>

                    {stage.exerciseIds?.length ? (
                      <ul className="grid gap-3">
                        {stage.exerciseIds.map((eid) => {
                          const ex = plan.exercises.find((e) => e.id === eid);
                          if (!ex) return null;
                          return (
                            <li key={eid} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                              <div className="min-w-0">
                                <p className="font-medium text-sm truncate">{ex.name}</p>
                                <p className="text-xs text-muted-foreground line-clamp-2">{ex.description}</p>
                              </div>
                              <Button asChild size="sm" className="shrink-0">
                                <Link href={`/exercises/${ex.id}?from=${plan.id}`}>Ver ejercicio</Link>
                              </Button>
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ) : null}

        {/* CTA */}
        <section className="flex justify-end">
          <Button asChild>
            <Link href="/">Elegir otro plan</Link>
          </Button>
        </section>
      </main>
    </div>
  );
}
