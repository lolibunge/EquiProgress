'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/components/auth-provider';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  PROGRESS_ACTION_LABELS,
  readLocalHistory,
  subscribeHistory,
  type ProgressHistoryEntry,
} from '@/lib/progress-store';
import { USE_FIRESTORE } from '@/lib/firebase';
import { trainingPlans } from '@/data/training-plans';

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const [entries, setEntries] = useState<ProgressHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setEntries([]);
      setLoading(false);
      return;
    }

    const localFallbackEntries = mergeHistoryEntries(
      readLocalHistory(user.uid, 200),
      buildHistoryFromLocalPlanStorage()
    );

    setEntries(localFallbackEntries);
    setLoading(false);

    if (!USE_FIRESTORE) return;

    const unblockTimer = window.setTimeout(() => {
      setLoading(false);
    }, 3000);

    const unsubscribe = subscribeHistory(
      user.uid,
      (cloudEntries) => {
        setEntries((currentEntries) =>
          mergeHistoryEntries(
            cloudEntries,
            currentEntries.length > 0 ? currentEntries : localFallbackEntries
          )
        );
        setLoading(false);
      },
      200,
      () => {
        setLoading(false);
      }
    );

    return () => {
      window.clearTimeout(unblockTimer);
      unsubscribe();
    };
  }, [user]);

  const completedWeeksCount = useMemo(
    () => entries.filter((entry) => entry.action === 'week_completed').length,
    [entries]
  );

  const touchedPlansCount = useMemo(
    () => new Set(entries.map((entry) => entry.planId).filter(Boolean)).size,
    [entries]
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground font-body antialiased">
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <Card>
            <CardHeader>
              <CardTitle>Cargando historial...</CardTitle>
              <CardDescription>Revisando los datos de tu cuenta.</CardDescription>
            </CardHeader>
          </Card>
        </main>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background text-foreground font-body antialiased">
        <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <Card className="max-w-xl mx-auto">
            <CardHeader>
              <CardTitle>Inicio de sesión requerido</CardTitle>
              <CardDescription>
                Los estudiantes necesitan una cuenta para ver su historial de progreso.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild className="w-full">
                <Link href="/login">Ir a iniciar sesión / crear cuenta</Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/">Volver a planes de entrenamiento</Link>
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
          <Link href="/" className="text-sm text-muted-foreground hover:text-primary">
            &larr; Volver
          </Link>
          <h1 className="text-lg font-headline font-semibold">Historial de progreso</h1>
          <div />
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {!USE_FIRESTORE && (
          <Card>
            <CardHeader>
              <CardTitle>Modo local activo</CardTitle>
              <CardDescription>
                El historial se guarda en este dispositivo. En otros dispositivos puede no verse.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Actividad total</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{entries.length}</p>
              <p className="text-sm text-muted-foreground">Eventos registrados</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Semanas completadas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{completedWeeksCount}</p>
              <p className="text-sm text-muted-foreground">Todos los planes combinados</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Planes con actividad</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{touchedPlansCount}</p>
              <p className="text-sm text-muted-foreground">Registros de planes distintos</p>
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle>Línea de tiempo</CardTitle>
            <CardDescription>
              Cada cambio que realiza el estudiante en el progreso de su plan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Cargando línea de tiempo...</p>
            ) : entries.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Todavía no hay historial. Inicia un plan y completa una semana para crear
                registros.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Acción</TableHead>
                    <TableHead>Semana</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{formatDateTime(entry.createdAt)}</TableCell>
                      <TableCell>{entry.planName || entry.planId}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {PROGRESS_ACTION_LABELS[entry.action] ?? entry.action}
                        </Badge>
                      </TableCell>
                      <TableCell>{entry.week ?? '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
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

function buildHistoryFromLocalPlanStorage(): ProgressHistoryEntry[] {
  if (typeof window === 'undefined') return [];

  const entries: ProgressHistoryEntry[] = [];

  for (const plan of trainingPlans) {
    const key = `equi:plan:${plan.id}`;
    const raw = localStorage.getItem(key);
    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw) as {
        startAt?: string | null;
        currentWeek?: number;
        completedWeeks?: unknown[];
        daysByWeek?: Record<string, unknown>;
      };

      const completedWeeks = extractCompletedWeeks(parsed);
      if (completedWeeks.length === 0) continue;

      const startDate = parsed.startAt ? new Date(parsed.startAt) : null;
      const startMs = startDate?.getTime();
      const hasValidStart = Number.isFinite(startMs);

      for (const week of completedWeeks) {
        const estimatedDate = hasValidStart
          ? new Date((startMs as number) + (week - 1) * 7 * 24 * 60 * 60 * 1000)
          : null;

        entries.push({
          id: `local-derived-${plan.id}-week-${week}`,
          planId: plan.id,
          planName: plan.name,
          action: 'week_completed',
          week,
          currentWeek:
            typeof parsed.currentWeek === 'number'
              ? Math.max(0, Math.floor(parsed.currentWeek))
              : 0,
          completedWeeks,
          note: null,
          createdAt: estimatedDate,
        });
      }
    } catch {
      // Ignora datos locales corruptos de un plan y continúa con los demás.
    }
  }

  return entries.sort((a, b) => {
    const aTime = a.createdAt?.getTime() ?? 0;
    const bTime = b.createdAt?.getTime() ?? 0;
    return bTime - aTime;
  });
}

function extractCompletedWeeks(input: {
  completedWeeks?: unknown[];
  daysByWeek?: Record<string, unknown>;
}): number[] {
  const explicit = Array.isArray(input.completedWeeks)
    ? input.completedWeeks
        .map((week) => Number(week))
        .filter((week) => Number.isFinite(week) && week > 0)
    : [];

  if (explicit.length > 0) {
    return [...new Set(explicit)].sort((a, b) => a - b);
  }

  const rawDaysByWeek =
    input.daysByWeek && typeof input.daysByWeek === 'object' ? input.daysByWeek : {};

  const inferred = Object.entries(rawDaysByWeek)
    .map(([rawWeek, rawDays]) => {
      const week = Number(rawWeek);
      if (!Number.isFinite(week) || week <= 0) return null;
      if (!Array.isArray(rawDays)) return null;

      const firstFiveDays = rawDays.slice(0, 5);
      return firstFiveDays.length === 5 && firstFiveDays.every(Boolean) ? week : null;
    })
    .filter((week): week is number => typeof week === 'number');

  return [...new Set(inferred)].sort((a, b) => a - b);
}

function mergeHistoryEntries(
  primary: ProgressHistoryEntry[],
  secondary: ProgressHistoryEntry[]
): ProgressHistoryEntry[] {
  const merged = [...primary];
  const fingerprints = new Set(primary.map(getHistoryFingerprint));

  for (const entry of secondary) {
    const fingerprint = getHistoryFingerprint(entry);
    if (fingerprints.has(fingerprint)) continue;

    fingerprints.add(fingerprint);
    merged.push(entry);
  }

  return merged.sort((a, b) => {
    const aTime = a.createdAt?.getTime() ?? 0;
    const bTime = b.createdAt?.getTime() ?? 0;
    return bTime - aTime;
  });
}

function getHistoryFingerprint(entry: ProgressHistoryEntry): string {
  return [
    entry.planId,
    entry.action,
    entry.week ?? '',
    entry.currentWeek,
    entry.completedWeeks.join(','),
    entry.createdAt?.toISOString() ?? '',
  ].join('|');
}
