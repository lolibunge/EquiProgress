'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useParams, notFound, useSearchParams } from 'next/navigation';
import { trainingPlans } from '@/data/training-plans';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  Target,
  ListChecks,
  Info,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { Suspense } from 'react';

// Busca el ejercicio por id y devuelve también el plan dueño.
// Si llega `from`, se prioriza ese plan para evitar mezclar ids repetidos entre planes.
function findExercise(exId: string, preferredPlanId?: string | null) {
  if (preferredPlanId) {
    const preferredPlan = trainingPlans.find((plan) => plan.id === preferredPlanId);
    const preferredExercise = preferredPlan?.exercises.find((e: any) => e.id === exId);
    if (preferredPlan && preferredExercise) {
      return { plan: preferredPlan, ex: preferredExercise };
    }
  }

  for (const plan of trainingPlans) {
    const ex = plan.exercises.find((e: any) => e.id === exId);
    if (ex) return { plan, ex };
  }
  return null;
}

// Busca un ejercicio por id para mostrar su nombre en transitionTo.
// También prioriza el plan actual si se provee.
function getExerciseNameById(exId: string, preferredPlanId?: string | null) {
  if (preferredPlanId) {
    const preferredPlan = trainingPlans.find((plan) => plan.id === preferredPlanId);
    const preferredExercise = preferredPlan?.exercises.find((e: any) => e.id === exId);
    if (preferredExercise) return preferredExercise.name;
  }

  for (const plan of trainingPlans) {
    const ex = plan.exercises.find((e: any) => e.id === exId);
    if (ex) return ex.name;
  }
  return exId;
}

export default function ExerciseDetailPage() {
  return (
    <Suspense fallback={<ExerciseDetailPageLoading />}>
      <ExerciseDetailPageContent />
    </Suspense>
  );
}

function ExerciseDetailPageContent() {
  const { id } = useParams<{ id: string }>();
  const search = useSearchParams();
  const fromPlanId = search.get('from');

  const found = findExercise(id, fromPlanId);
  if (!found) notFound();

  const { plan, ex } = found as any;
  const sourcePlan = fromPlanId
    ? trainingPlans.find((candidate) => candidate.id === fromPlanId) ?? plan
    : plan;
  const sourcePlanId = sourcePlan.id;

  // Compatibilidad hacia atrás
  const headline =
    ex.objective ??
    ex.longDescription ??
    ex.description ??
    '';

  const focus: string = ex.focus ?? '';

  const steps: string[] =
    ex.method ??
    ex.steps ??
    [];

  const tips: string[] =
    ex.cues ??
    ex.tips ??
    [];

  const prereq: string[] = ex.prerequisites ?? [];
  const safety: string[] = ex.safety ?? [];
  const progress: { label: string; details?: string }[] = ex.progressSigns ?? [];
  const advance: string[] = ex.advanceCriteria ?? [];
  const gear: string[] = ex.gear ?? [];
  const commonMistakes: string[] = ex.commonMistakes ?? [];
  const instructorTips: string[] = ex.instructorTips ?? [];
  const transitionTo: string[] = ex.transitionTo ?? [];

  const duration = ex.duration ?? '';
  const reps = ex.reps ?? '';

  return (
    <div className="min-h-screen bg-background text-foreground font-body antialiased">
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b border-primary/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link
            href={sourcePlanId ? `/plans/${sourcePlanId}` : '/'}
            className="text-sm text-muted-foreground hover:text-primary"
          >
            &larr; {sourcePlanId ? 'Volver al plan' : 'Volver'}
          </Link>
          <h1 className="text-lg font-headline font-semibold">{ex.name}</h1>
          <div />
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {ex.image && (
          <div className="relative w-full aspect-square sm:aspect-[16/9] overflow-hidden rounded-2xl">
            <Image
              src={ex.image}
              alt={ex.name}
              fill
              sizes="100vw"
              className="object-cover"
            />
          </div>
        )}

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Descripción</CardTitle>
              <CardDescription>{duration || reps || '—'}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {(duration || reps || gear.length > 0) && (
                <div className="flex flex-wrap items-center gap-2">
                  {duration && (
                    <Badge variant="secondary" className="rounded-2xl px-3 py-1 text-xs">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3.5" />
                        {duration}
                      </span>
                    </Badge>
                  )}

                  {reps && (
                    <Badge variant="secondary" className="rounded-2xl px-3 py-1 text-xs">
                      <span className="inline-flex items-center gap-1">
                        <ListChecks className="size-3.5" />
                        {reps}
                      </span>
                    </Badge>
                  )}

                  {gear.map((g: string, i: number) => (
                    <Badge key={i} variant="secondary" className="rounded-2xl px-3 py-1 text-xs">
                      {g}
                    </Badge>
                  ))}
                </div>
              )}

              {headline && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
                    <Target className="size-4" aria-hidden />
                    <span>Objetivo</span>
                  </div>
                  <p className="text-muted-foreground">{headline}</p>
                </div>
              )}

              {focus && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
                    <Target className="size-4" aria-hidden />
                    <span>Enfoque</span>
                  </div>
                  <p className="text-muted-foreground">{focus}</p>
                </div>
              )}

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
                  <ListChecks className="size-4" aria-hidden />
                  <span>Cómo se hace</span>
                </div>
                {steps.length > 0 ? (
                  <ol className="list-decimal pl-5 space-y-1 text-sm text-muted-foreground">
                    {steps.map((s: string, i: number) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin pasos definidos aún.</p>
                )}
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
                    <Info className="size-4" aria-hidden />
                    <span>Ayudas / Cues</span>
                  </div>
                  {tips.length > 0 ? (
                    <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                      {tips.map((t: string, i: number) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">—</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
                    <Info className="size-4" aria-hidden />
                    <span>Prerrequisitos</span>
                  </div>
                  {prereq.length > 0 ? (
                    <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                      {prereq.map((p: string, i: number) => (
                        <li key={i}>{p}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground">—</p>
                  )}
                </div>
              </div>

              {safety.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
                    <AlertTriangle className="size-4" aria-hidden />
                    <span>Seguridad</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                    {safety.map((s: string, i: number) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {commonMistakes.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
                    <AlertTriangle className="size-4" aria-hidden />
                    <span>Errores comunes</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                    {commonMistakes.map((m: string, i: number) => (
                      <li key={i}>{m}</li>
                    ))}
                  </ul>
                </div>
              )}

              {instructorTips.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
                    <Info className="size-4" aria-hidden />
                    <span>Tips del instructor</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                    {instructorTips.map((tip: string, i: number) => (
                      <li key={i}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}

              {progress.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
                    <Check className="size-4" aria-hidden />
                    <span>Señales de progreso</span>
                  </div>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {progress.map((s: any, i: number) => (
                      <li key={i} className="flex items-start gap-2 rounded-xl border p-3 text-sm">
                        <Check className="mt-0.5 size-4" aria-hidden />
                        <div>
                          <div className="font-medium">{s.label}</div>
                          {s.details ? (
                            <div className="text-muted-foreground">{s.details}</div>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {advance.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
                    <Check className="size-4" aria-hidden />
                    <span>Criterios para avanzar</span>
                  </div>
                  <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                    {advance.map((a: string, i: number) => (
                      <li key={i}>{a}</li>
                    ))}
                  </ul>
                </div>
              )}

              {transitionTo.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
                    <Check className="size-4" aria-hidden />
                    <span>Sigue con</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {transitionTo.map((nextId: string) => (
                      <Link
                        key={nextId}
                        href={`/exercises/${nextId}?from=${sourcePlanId}`}
                      >
                        <Badge
                          variant="secondary"
                          className="rounded-2xl px-3 py-1 text-xs hover:bg-primary/10 cursor-pointer"
                        >
                          {getExerciseNameById(nextId, sourcePlanId)}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Pertenece al plan</CardTitle>
              <CardDescription>{sourcePlan.duration}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">{sourcePlan.name}</p>
              <Button asChild className="w-full">
                <Link href={`/plans/${sourcePlanId}`}>Volver al plan</Link>
              </Button>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}

function ExerciseDetailPageLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground font-body antialiased">
      <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-sm border-b border-primary/20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="text-sm text-muted-foreground hover:text-primary">
            &larr; Volver
          </Link>
          <h1 className="text-lg font-headline font-semibold">Cargando ejercicio...</h1>
          <div />
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Cargando ejercicio...</CardTitle>
            <CardDescription>Estamos preparando los detalles.</CardDescription>
          </CardHeader>
        </Card>
      </main>
    </div>
  );
}
