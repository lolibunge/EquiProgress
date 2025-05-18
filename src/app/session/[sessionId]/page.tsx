
"use client";

import { useEffect, useState, Suspense } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { getSession, getExerciseResults } from '@/services/session';
import { getHorseById } from '@/services/horse';
import { getBlockById, getExercise } from '@/services/firestore'; // Assuming getExercise exists
import type { SessionData, ExerciseResult, Horse, TrainingBlock, Exercise } from '@/types/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from '@/components/ui/use-toast';
import { Label } from '@/components/ui/label';

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

  const handleSaveSession = async () => {
    if (!currentUser || !horseId || !sessionId) {
      toast({
        title: "Error al guardar",
        description: "Falta información de usuario o sesión.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      // Here you will implement the logic to update exerciseResults in Firestore
      // This will involve iterating through the exerciseResults state and calling an update function
      // on your Firestore service for each ExerciseResult document that has changes.
      console.log("Saving session data:", exerciseResults); // Placeholder for actual save logic

      toast({
        title: "Cambios guardados",
        description: "La sesión ha sido actualizada con éxito.",
      });
    } catch (err) {
      console.error("Error saving session:", err);
      toast({ title: "Error al guardar", description: "Ocurrió un error al guardar la sesión.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveSession = async () => {
    if (!currentUser || !horseId || !sessionId) {
      toast({
        title: "Error al guardar",
        description: "Falta información de usuario o sesión.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      // Here you will implement the logic to update exerciseResults in Firestore
      // This will involve iterating through the exerciseResults state and calling an update function
      // on your Firestore service for each ExerciseResult document that has changes.
      console.log("Saving session data:", exerciseResults); // Placeholder for actual save logic

      toast({
        title: "Cambios guardados",
        description: "La sesión ha sido actualizada con éxito.",
      });
    } catch (err) {
      console.error("Error saving session:", err);
      toast({ title: "Error al guardar", description: "Ocurrió un error al guardar la sesión.", variant: "destructive" });
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

                    {/* New section for exercise-specific observations */}
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <h5 className="font-semibold text-md mb-2">Observaciones del Ejercicio:</h5>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <Label htmlFor={`ears-${result.id}`}>Orejas:</Label>
                          <input
                            id={`ears-${result.id}`}
                            type="text"
                            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
                            value={result.observations?.ears || ''}
                            onChange={(e) => {
                              const updatedResults = exerciseResults.map(item =>
                                item.id === result.id
                                  ? {
                                      ...item,
                                      observations: {
                                        ...(item.observations || {}),
                                        ears: e.target.value
                                      }
                                    }
                                  : item
                              );
                              setExerciseResults(updatedResults);
                            }}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`eyes-${result.id}`}>Ojos:</Label>
                          <input
                            id={`eyes-${result.id}`}
                            type="text"
                            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
                            value={result.observations?.eyes || ''}
                            onChange={(e) => {
                              const updatedResults = exerciseResults.map(item =>
                                item.id === result.id
                                  ? {
                                      ...item,
                                      observations: {
                                        ...(item.observations || {}),
                                        eyes: e.target.value
                                      }
                                    }
                                  : item
                              );
                              setExerciseResults(updatedResults);
                            }}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`neck-${result.id}`}>Cuello:</Label>
                          <input
                            id={`neck-${result.id}`}
                            type="text"
                            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
                            value={result.observations?.neck || ''}
                            onChange={(e) => {
                              const updatedResults = exerciseResults.map(item =>
                                item.id === result.id
                                  ? {
                                      ...item,
                                      observations: {
                                        ...(item.observations || {}),
                                        neck: e.target.value
                                      }
                                    }
                                  : item
                              );
                              setExerciseResults(updatedResults);
                            }}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`withers-${result.id}`}>Cruz:</Label>
                          <input
                            id={`withers-${result.id}`}
                            type="text"
                            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
                            value={result.observations?.withers || ''}
                            onChange={(e) => {
                              const updatedResults = exerciseResults.map(item =>
                                item.id === result.id
                                  ? {
                                      ...item,
                                      observations: {
                                        ...(item.observations || {}),
                                        withers: e.target.value
                                      }
                                    }
                                  : item
                              );
                              setExerciseResults(updatedResults);
                            }}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`back-${result.id}`}>Dorso:</Label>
                          <input
                            id={`back-${result.id}`}
                            type="text"
                            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
                            value={result.observations?.back || ''}
                            onChange={(e) => {
                              const updatedResults = exerciseResults.map(item =>
                                item.id === result.id
                                  ? {
                                      ...item,
                                      observations: {
                                        ...(item.observations || {}),
                                        back: e.target.value
                                      }
                                    }
                                  : item
                              );
                              setExerciseResults(updatedResults);
                            }}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`loins-${result.id}`}>Riñones:</Label>
                          <input
                            id={`loins-${result.id}`}
                            type="text"
                            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
                            value={result.observations?.loins || ''}
                            onChange={(e) => {
                              const updatedResults = exerciseResults.map(item =>
                                item.id === result.id
                                  ? {
                                      ...item,
                                      observations: {
                                        ...(item.observations || {}),
                                        loins: e.target.value
                                      }
                                    }
                                  : item
                              );
                              setExerciseResults(updatedResults);
                            }}
                          />
                        </div>
                         <div>
                          <Label htmlFor={`croup-${result.id}`}>Grupa:</Label>
                          <input
                            id={`croup-${result.id}`}
                            type="text"
                            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
                            value={result.observations?.croup || ''}
                            onChange={(e) => {
                              const updatedResults = exerciseResults.map(item =>
                                item.id === result.id
                                  ? {
                                      ...item,
                                      observations: {
                                        ...(item.observations || {}),
                                        croup: e.target.value
                                      }
                                    }
                                  : item
                              );
                              setExerciseResults(updatedResults);
                            }}
                          />
                        </div>
                        <div>
                          <Label htmlFor={`legs-${result.id}`}>Patas/Manos:</Label>
                          <input
                            id={`legs-${result.id}`}
                            type="text"
                            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
                            value={result.observations?.legs || ''}
                            onChange={(e) => {
                              const updatedResults = exerciseResults.map(item =>
                                item.id === result.id
                                  ? {
                                      ...item,
                                      observations: {
                                        ...(item.observations || {}),
                                        legs: e.target.value
                                      }
                                    }
                                  : item
                              );
                              setExerciseResults(updatedResults);
                            }}
                          />
                        </div>
                         <div>
                          <Label htmlFor={`hooves-${result.id}`}>Cascos:</Label>
                          <input
                            id={`hooves-${result.id}`}
                            type="text"
                            className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700"
                            value={result.observations?.hooves || ''}
                            onChange={(e) => {
                              const updatedResults = exerciseResults.map(item =>
                                item.id === result.id
                                  ? {
                                      ...item,
                                      observations: {
                                        ...(item.observations || {}),
                                        hooves: e.target.value
                                      }
                                    }
                                  : item
                              );
                              setExerciseResults(updatedResults);
                            }}
                          />
                        </div>
                      </div>
                      <div className="mt-4">
                        <Label htmlFor={`overallBehavior-${result.id}`}>Comportamiento General:</Label>
                        <textarea
                          id={`overallBehavior-${result.id}`}
                          className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 min-h-[80px]"
                          value={result.observations?.overallBehavior || ''}
                           onChange={(e) => {
                              const updatedResults = exerciseResults.map(item =>
                                item.id === result.id
                                  ? {
                                      ...item,
                                      observations: {
                                        ...(item.observations || {}),
                                        overallBehavior: e.target.value
                                      }
                                    }
                                  : item
                              );
                              setExerciseResults(updatedResults);
                            }}
                        ></textarea>
                      </div>
                       <div className="mt-4">
                        <Label htmlFor={`additionalNotes-${result.id}`}>Notas Adicionales:</Label>
                        <textarea
                          id={`additionalNotes-${result.id}`}
                          className="w-full p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700 min-h-[80px]"
                          value={result.observations?.additionalNotes || ''}
                           onChange={(e) => {
                              const updatedResults = exerciseResults.map(item =>
                                item.id === result.id
                                  ? {
                                      ...item,
                                      observations: {
                                        ...(item.observations || {}),
                                        additionalNotes: e.target.value
                                      }
                                    }
                                  : item
                              );
                              setExerciseResults(updatedResults);
                            }}
                        ></textarea>
                      </div>
                    </div>
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
              Guardar Cambios
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
