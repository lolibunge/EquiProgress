
"use client";

import { useEffect, useState, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { getSession, getExerciseResults, updateExerciseResultObservations } from '@/services/session'; // Added update function
import { getHorseById } from '@/services/horse';
import { getBlockById, getExercise } from '@/services/firestore';
import type { SessionData, ExerciseResult, Horse, TrainingBlock, Exercise, ExerciseResultObservations } from '@/types/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from '@/components/ui/use-toast';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea'; // For editable notes
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'; // For selects


const TENSION_STATUS_OPTIONS = [
  { value: '🟢', label: '🟢 Relajado' },
  { value: '🟡', label: '🟡 Neutral/Tenso' },
  { value: '🔴', label: '🔴 Muy Tenso/Dolor' },
  { value: 'N/A', label: 'N/A (No aplica)' },
];

const OBSERVATION_ZONES = [
  { id: 'nostrils', label: 'Ollares' },
  { id: 'lips', label: 'Labios' },
  { id: 'ears', label: 'Orejas' },
  { id: 'eyes', label: 'Ojos' },
  { id: 'neck', label: 'Cuello' },
  { id: 'back', label: 'Dorso' },
  { id: 'croup', label: 'Grupa' },
  { id: 'limbs', label: 'Miembros' },
  { id: 'tail', label: 'Cola' },
] as const;


interface ExerciseResultWithDetails extends ExerciseResult {
  exerciseDetails?: Exercise | null;
}

function SessionDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const sessionId = params.sessionId as string;
  const horseId = searchParams.get('horseId');


  const [session, setSession] = useState<SessionData | null>(null);
  const [exerciseResults, setExerciseResults] = useState<ExerciseResultWithDetails[]>([]);
  const [horse, setHorse] = useState<Horse | null>(null);
  const [block, setBlock] = useState<TrainingBlock | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!sessionId || !horseId || !currentUser) {
      setLoading(false);
      if (!currentUser) setError("Debes iniciar sesión para ver esta página.");
      else if (!horseId) setError("Falta el ID del caballo.");
      else setError("Falta el ID de la sesión.");
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const sessionData = await getSession(horseId, sessionId);
        if (!sessionData) {
          setError("Sesión no encontrada.");
          setLoading(false);
          return;
        }
        setSession(sessionData);

        const horseData = await getHorseById(sessionData.horseId);
        setHorse(horseData);

        if (sessionData.blockId) {
          const blockData = await getBlockById(sessionData.blockId);
          setBlock(blockData);
        }

        const resultsData = await getExerciseResults(horseId, sessionId);
        const resultsWithDetails: ExerciseResultWithDetails[] = await Promise.all(
          resultsData.map(async (result) => {
            const exerciseDetails = await getExercise(result.exerciseId);
            return { ...result, exerciseDetails };
          })
        );
        setExerciseResults(resultsWithDetails);

      } catch (err) {
        console.error("Error fetching session details:", err);
        setError("Ocurrió un error al cargar los detalles de la sesión.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sessionId, currentUser, horseId]);

  const handleObservationChange = (
    resultId: string,
    field: keyof ExerciseResultObservations,
    value: string | null
  ) => {
    setExerciseResults(prevResults =>
      prevResults.map(result => {
        if (result.id === resultId) {
          return {
            ...result,
            observations: {
              ...(result.observations || {}), // Ensure observations is initialized
              [field]: value,
            } as ExerciseResultObservations, // Cast to ensure type safety
          };
        }
        return result;
      })
    );
  };


  const handleSaveSession = async () => {
    if (!currentUser || !horseId || !sessionId || exerciseResults.length === 0) {
      toast({
        title: "Error al guardar",
        description: "Falta información de usuario, sesión o resultados de ejercicios.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      for (const result of exerciseResults) {
        if (result.observations && Object.keys(result.observations).length > 0) {
            await updateExerciseResultObservations(horseId, sessionId, result.id, result.observations);
        }
      }
      toast({
        title: "Cambios guardados",
        description: "Las observaciones de la sesión han sido actualizadas con éxito.",
      });
    } catch (err) {
      console.error("Error saving session observations:", err);
      toast({ title: "Error al guardar", description: "Ocurrió un error al guardar las observaciones de la sesión.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] w-full items-center justify-center">
        <Icons.spinner className="h-10 w-10 animate-spin" />
        <p className="ml-2">Cargando detalles de la sesión...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-10 text-center">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={() => router.back()} className="mt-4">
          <Icons.arrowRight className="mr-2 h-4 w-4 rotate-180" /> Volver
        </Button>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container py-10 text-center">
        <p>No se encontró la sesión.</p>
        <Button onClick={() => router.back()} className="mt-4">
           <Icons.arrowRight className="mr-2 h-4 w-4 rotate-180" /> Volver
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl">
            Detalle de la Sesión del {format(session.date.toDate(), "PPP", { locale: es })}
          </CardTitle>
          <CardDescription>
            Caballo: {horse?.name || 'Desconocido'} | Etapa: {block?.title || 'Desconocida'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {session.overallNote && (
            <div>
              <h3 className="text-lg font-semibold mb-1">Nota General de la Sesión:</h3>
              <p className="text-muted-foreground whitespace-pre-wrap">{session.overallNote}</p>
            </div>
          )}

          {exerciseResults.length > 0 ? (
            <div>
              <h3 className="text-lg font-semibold mb-2">Ejercicios Realizados:</h3>
              <div className="space-y-4">
                {exerciseResults.map((result) => (
                  <Card key={result.id} className="p-4">
                    <h4 className="font-semibold text-md mb-1">
                      {result.exerciseDetails?.title || 'Ejercicio Desconocido'}
                    </h4>
                    {result.exerciseDetails?.description && <p className="text-sm text-muted-foreground mb-2">{result.exerciseDetails.description}</p>}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <p><strong>Planificado:</strong> {result.plannedReps || result.exerciseDetails?.suggestedReps || 'N/A'}</p>
                      <p><strong>Realizado:</strong> {result.doneReps} reps</p>
                      <p><strong>Calificación:</strong> {result.rating} / 5</p>
                    </div>
                    {result.comment && (
                      <div className="mt-2">
                        <p className="text-sm"><strong>Comentario:</strong></p>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{result.comment}</p>
                      </div>
                    )}

                    {result.observations && (
                       <div className="mt-4 pt-4 border-t">
                        <h5 className="font-semibold text-md mb-2">Observaciones del Ejercicio:</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                          {OBSERVATION_ZONES.map(zone => {
                            const obsValue = result.observations?.[zone.id as keyof ExerciseResultObservations];
                            return obsValue ? (
                              <div key={zone.id}>
                                <Label htmlFor={`display-obs-${result.id}-${zone.id}`}>{zone.label}:</Label>
                                <p id={`display-obs-${result.id}-${zone.id}`} className="text-muted-foreground">
                                  {TENSION_STATUS_OPTIONS.find(opt => opt.value === obsValue)?.label || obsValue}
                                </p>
                              </div>
                            ) : null;
                          })}
                        </div>
                         {result.observations.overallBehavior && (
                            <div className="mt-3">
                                <Label htmlFor={`display-obs-behavior-${result.id}`}>Comportamiento General:</Label>
                                <p id={`display-obs-behavior-${result.id}`} className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {result.observations.overallBehavior}
                                </p>
                            </div>
                         )}
                         {result.observations.additionalNotes && (
                            <div className="mt-3">
                                <Label htmlFor={`display-obs-notes-${result.id}`}>Notas Adicionales:</Label>
                                <p id={`display-obs-notes-${result.id}`} className="text-sm text-muted-foreground whitespace-pre-wrap">
                                {result.observations.additionalNotes}
                                </p>
                            </div>
                         )}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">No se registraron ejercicios para esta sesión.</p>
          )}

          <div className="mt-8 flex justify-center">
             <Button onClick={handleSaveSession} disabled={isSaving} className="mr-4">
              {isSaving ? <Icons.spinner className="mr-2 h-4 w-4 animate-spin" /> : null}
              Guardar Cambios en Observaciones (si aplica)
            </Button>
            <Button onClick={() => router.back()} variant="outline">
              <Icons.arrowRight className="mr-2 h-4 w-4 rotate-180" /> Volver
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


export default function SessionDetailPage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-screen items-center justify-center"><Icons.spinner className="h-12 w-12 animate-spin" /></div>}>
      <SessionDetailContent />
    </Suspense>
  );
}
