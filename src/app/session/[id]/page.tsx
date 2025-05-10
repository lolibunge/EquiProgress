
// src/app/session/[id]/page.tsx
"use client";

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Timestamp, serverTimestamp } from 'firebase/firestore';

import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Icons } from '@/components/icons';
import { useToast } from "@/hooks/use-toast";

import type { Horse, SessionData, ExerciseResult, Exercise } from '@/types/firestore';
import { getHorseById } from '@/services/horse';
import { getSession, getExerciseResults, updateSession, updateExerciseResult } from '@/services/session';
import { getExercise } from '@/services/firestore';

const SessionDetailPage = () => {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  const sessionId = params.id as string;
  const horseId = searchParams.get('horseId');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [horse, setHorse] = useState<Horse | null>(null);
  const [session, setSession] = useState<SessionData | null>(null);
  const [exerciseResult, setExerciseResult] = useState<ExerciseResult | null>(null);
  const [exercise, setExercise] = useState<Exercise | null>(null);

  // Form state
  const [overallSessionNotes, setOverallSessionNotes] = useState('');
  const [repsDone, setRepsDone] = useState('');
  const [exerciseRating, setExerciseRating] = useState(3);
  const [exerciseComment, setExerciseComment] = useState('');

  const fetchData = useCallback(async () => {
    if (!horseId || !sessionId) {
      toast({ variant: "destructive", title: "Error", description: "Falta ID de caballo o sesión." });
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [fetchedHorse, fetchedSession, fetchedExerciseResults] = await Promise.all([
        getHorseById(horseId),
        getSession(horseId, sessionId),
        getExerciseResults(horseId, sessionId),
      ]);

      setHorse(fetchedHorse);
      setSession(fetchedSession);

      if (fetchedSession) {
        setOverallSessionNotes(fetchedSession.overallNote || '');
      }

      if (fetchedExerciseResults && fetchedExerciseResults.length > 0) {
        const firstExerciseResult = fetchedExerciseResults[0];
        setExerciseResult(firstExerciseResult);
        setRepsDone(firstExerciseResult.doneReps.toString());
        setExerciseRating(firstExerciseResult.rating);
        setExerciseComment(firstExerciseResult.comment || '');

        if (firstExerciseResult.exerciseId) {
          const fetchedExercise = await getExercise(firstExerciseResult.exerciseId);
          setExercise(fetchedExercise);
        }
      }
    } catch (error) {
      console.error("Error fetching session details:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los detalles de la sesión." });
    } finally {
      setLoading(false);
    }
  }, [horseId, sessionId, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async () => {
    if (!horseId || !sessionId || !session || !exerciseResult || !exerciseResult.id) {
      toast({ variant: "destructive", title: "Error", description: "Datos incompletos para guardar." });
      return;
    }
    setSaving(true);
    try {
      const repsDoneNumber = parseInt(repsDone, 10);
      if (isNaN(repsDoneNumber)) {
        toast({ variant: "destructive", title: "Error de Validación", description: "Las repeticiones realizadas deben ser un número."});
        setSaving(false);
        return;
      }

      await updateSession(horseId, sessionId, {
        overallNote: overallSessionNotes,
        updatedAt: serverTimestamp() as Timestamp,
      });

      await updateExerciseResult(horseId, sessionId, exerciseResult.id, {
        doneReps: repsDoneNumber,
        rating: exerciseRating,
        comment: exerciseComment,
        updatedAt: serverTimestamp() as Timestamp,
      });

      toast({ title: "Éxito", description: "Detalles de la sesión guardados correctamente." });
      fetchData(); // Re-fetch data to show updated values
    } catch (error) {
      console.error("Error saving session details:", error);
      toast({ variant: "destructive", title: "Error al Guardar", description: "No se pudieron guardar los cambios." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 flex justify-center items-center min-h-[calc(100vh-4rem)]">
        <Icons.spinner className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!horseId || !sessionId || !session) {
    return (
      <div className="container mx-auto p-4 flex justify-center items-center min-h-[calc(100vh-4rem)]">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>No se pudo cargar la información de la sesión. Verifica que los IDs sean correctos.</p>
            <Button asChild className="mt-4 w-full">
              <Link href="/">Volver al Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 py-10">
      <Card className="w-full max-w-2xl mx-auto shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl">Detalle de la Sesión</CardTitle>
          <CardDescription>
            Caballo: <span className="font-semibold">{horse?.name || 'N/A'}</span> | Fecha: <span className="font-semibold">{session.date.toDate().toLocaleDateString('es-ES')}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="overallSessionNotes" className="text-base font-medium">Notas Generales de la Sesión</Label>
            <Textarea
              id="overallSessionNotes"
              placeholder="Comentarios generales sobre la sesión, comportamiento del caballo, etc."
              value={overallSessionNotes}
              onChange={(e) => setOverallSessionNotes(e.target.value)}
              className="mt-1 min-h-[100px]"
              disabled={saving}
            />
          </div>

          {exercise && exerciseResult ? (
            <Card className="p-4 bg-muted/30">
              <CardHeader className="p-0 pb-2">
                <CardTitle className="text-xl">Ejercicio: {exercise.title}</CardTitle>
                {exercise.suggestedReps && (
                  <CardDescription>Repeticiones sugeridas: {exercise.suggestedReps}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="p-0 space-y-4">
                <div>
                  <Label htmlFor="repsDone">Repeticiones Realizadas</Label>
                  <Input
                    id="repsDone"
                    type="number"
                    placeholder="Ej: 8"
                    value={repsDone}
                    onChange={(e) => setRepsDone(e.target.value)}
                    className="mt-1"
                    disabled={saving}
                  />
                </div>
                <div>
                  <Label htmlFor="exerciseRating">Calificación del Ejercicio (1-5): {exerciseRating}</Label>
                  <Slider
                    id="exerciseRating"
                    min={1}
                    max={5}
                    step={1}
                    value={[exerciseRating]}
                    onValueChange={(value) => setExerciseRating(value[0])}
                    className="mt-2"
                    disabled={saving}
                  />
                </div>
                <div>
                  <Label htmlFor="exerciseComment">Comentarios del Ejercicio</Label>
                  <Textarea
                    id="exerciseComment"
                    placeholder="Notas específicas sobre este ejercicio..."
                    value={exerciseComment}
                    onChange={(e) => setExerciseComment(e.target.value)}
                    className="mt-1"
                    disabled={saving}
                  />
                </div>
              </CardContent>
            </Card>
          ) : (
            <p className="text-muted-foreground">No hay detalles de ejercicio para esta sesión inicial o no se pudieron cargar.</p>
          )}
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-6">
           <Button variant="outline" onClick={() => router.push('/')} disabled={saving}>
            Volver al Dashboard
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? <Icons.spinner className="mr-2 h-4 w-4 animate-spin" /> : <Icons.save className="mr-2 h-4 w-4" />}
            Guardar Cambios
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default SessionDetailPage;
