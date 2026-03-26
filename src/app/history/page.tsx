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
  subscribeHistory,
  type ProgressHistoryEntry,
} from '@/lib/progress-store';
import { USE_FIRESTORE } from '@/lib/firebase';

export default function HistoryPage() {
  const { user, loading: authLoading } = useAuth();
  const [entries, setEntries] = useState<ProgressHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !USE_FIRESTORE) {
      setEntries([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubscribe = subscribeHistory(user.uid, (nextEntries) => {
      setEntries(nextEntries);
      setLoading(false);
    });

    return unsubscribe;
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
              <CardTitle>Inicio de sesion requerido</CardTitle>
              <CardDescription>
                Los estudiantes necesitan una cuenta para ver su historial de progreso.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild className="w-full">
                <Link href="/login">Ir a iniciar sesion / crear cuenta</Link>
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
              <CardTitle>La sincronizacion con Firestore esta desactivada</CardTitle>
              <CardDescription>
                Define `NEXT_PUBLIC_USE_FIRESTORE=true` para que cada estudiante guarde su
                historial en la nube.
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
            <CardTitle>Linea de tiempo</CardTitle>
            <CardDescription>
              Cada cambio que realiza el estudiante en el progreso de su plan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Cargando linea de tiempo...</p>
            ) : entries.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Todavia no hay historial. Inicia un plan y completa una semana para crear
                registros.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Accion</TableHead>
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
