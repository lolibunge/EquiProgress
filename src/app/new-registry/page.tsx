'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

import {
  createEmptyExerciseLog,
  createEmptyTrainingSession,
  deleteLocalTrainingSession,
  readLocalTrainingSessions,
  saveLocalTrainingSession,
  type ExerciseSessionLog,
  type RegistryRating,
  type TrainingSessionRegistry,
} from '@/lib/session-registry-store';

const RATING_OPTIONS: RegistryRating[] = [1, 2, 3, 4, 5];

const ratingLabels: Record<RegistryRating, string> = {
  1: 'Muy bajo',
  2: 'Bajo',
  3: 'Medio',
  4: 'Bueno',
  5: 'Muy bueno',
};

export default function NewRegistryPage() {
  const { toast } = useToast();

  const [session, setSession] = useState<TrainingSessionRegistry | null>(null);
  const [savedSessions, setSavedSessions] = useState<TrainingSessionRegistry[]>([]);

  useEffect(() => {
    setSession(createEmptyTrainingSession());
    setSavedSessions(readLocalTrainingSessions());
  }, []);

  const canSave = useMemo(() => {
    return Boolean(session?.horseName.trim());
  }, [session?.horseName]);

  function updateSessionField<K extends keyof TrainingSessionRegistry>(
    field: K,
    value: TrainingSessionRegistry[K]
  ) {
    setSession((currentSession) => {
      if (!currentSession) return currentSession;

      return {
        ...currentSession,
        [field]: value,
      };
    });
  }

  function updateExerciseField<K extends keyof ExerciseSessionLog>(
    exerciseId: string,
    field: K,
    value: ExerciseSessionLog[K]
  ) {
    setSession((currentSession) => {
      if (!currentSession) return currentSession;

      return {
        ...currentSession,
        exercises: currentSession.exercises.map((exercise) =>
          exercise.id === exerciseId
            ? {
                ...exercise,
                [field]: value,
              }
            : exercise
        ),
      };
    });
  }

  function addExercise() {
    setSession((currentSession) => {
      if (!currentSession) return currentSession;

      return {
        ...currentSession,
        exercises: [...currentSession.exercises, createEmptyExerciseLog()],
      };
    });
  }

  function removeExercise(exerciseId: string) {
    setSession((currentSession) => {
      if (!currentSession) return currentSession;

      if (currentSession.exercises.length === 1) {
        return currentSession;
      }

      return {
        ...currentSession,
        exercises: currentSession.exercises.filter((exercise) => exercise.id !== exerciseId),
      };
    });
  }

  function handleSaveSession() {
    if (!session) return;

    if (!canSave) {
      toast({
        title: 'Falta el nombre del caballo',
        description: 'Agregá el nombre del caballo antes de guardar la sesión.',
        variant: 'destructive',
      });
      return;
    }

    const savedSession = saveLocalTrainingSession(session);

    setSavedSessions(readLocalTrainingSessions());
    setSession(createEmptyTrainingSession());

    toast({
      title: 'Sesión guardada',
      description: `Se guardó el registro de ${savedSession.horseName}.`,
    });
  }

  function handleDeleteSession(sessionId: string) {
    deleteLocalTrainingSession(sessionId);
    setSavedSessions(readLocalTrainingSessions());

    toast({
      title: 'Registro eliminado',
      description: 'La sesión fue eliminada del historial local.',
    });
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background text-foreground font-body antialiased flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Cargando diario de entrenamiento...</p>
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

          <h1 className="text-lg font-headline font-semibold">Diario de entrenamiento</h1>

          <div />
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <section className="max-w-3xl">
          <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">
            Nueva modalidad
          </p>

          <h2 className="mt-2 text-3xl font-headline font-bold">
            Registrar una sesión de trabajo
          </h2>

          <p className="mt-3 text-muted-foreground">
            Esta pantalla permite guardar no solo si se hizo la práctica, sino también cómo
            respondió el caballo, qué percibiste y qué conviene repetir la próxima vez.
          </p>
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-6">
          <section className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Datos generales</CardTitle>
                <CardDescription>
                  Primero registramos el contexto de la sesión.
                </CardDescription>
              </CardHeader>

              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="horseName">Caballo</Label>
                  <Input
                    id="horseName"
                    value={session.horseName}
                    onChange={(event) => updateSessionField('horseName', event.target.value)}
                    placeholder="Ej: Perla"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">Fecha</Label>
                  <Input
                    id="date"
                    type="date"
                    value={session.date}
                    onChange={(event) => updateSessionField('date', event.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sessionTitle">Título de la sesión</Label>
                  <Input
                    id="sessionTitle"
                    value={session.sessionTitle}
                    onChange={(event) => updateSessionField('sessionTitle', event.target.value)}
                    placeholder="Ej: Desensibilización con stick"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="durationMinutes">Duración en minutos</Label>
                  <Input
                    id="durationMinutes"
                    type="number"
                    min={0}
                    value={session.durationMinutes ?? ''}
                    onChange={(event) =>
                      updateSessionField(
                        'durationMinutes',
                        event.target.value ? Number(event.target.value) : null
                      )
                    }
                    placeholder="Ej: 35"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Estado inicial</CardTitle>
                <CardDescription>
                  Antes de evaluar ejercicios, registrá cómo empezaron caballo y alumno.
                </CardDescription>
              </CardHeader>

              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="horseInitialState">¿Cómo estaba el caballo al empezar?</Label>
                  <Textarea
                    id="horseInitialState"
                    value={session.horseInitialState}
                    onChange={(event) =>
                      updateSessionField('horseInitialState', event.target.value)
                    }
                    placeholder="Ej: Entró atento pero algo tenso, movía la cabeza y le costaba quedarse quieto."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="studentInitialState">¿Cómo estabas vos?</Label>
                  <Textarea
                    id="studentInitialState"
                    value={session.studentInitialState}
                    onChange={(event) =>
                      updateSessionField('studentInitialState', event.target.value)
                    }
                    placeholder="Ej: Me sentí tranquila, pero al principio dudé con los tiempos."
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Evaluación general</CardTitle>
                <CardDescription>
                  Puntajes simples del 1 al 5 para medir la sesión.
                </CardDescription>
              </CardHeader>

              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <RatingSelect
                  label="Conexión"
                  value={session.connectionRating}
                  onChange={(value) => updateSessionField('connectionRating', value)}
                />

                <RatingSelect
                  label="Relajación"
                  value={session.relaxationRating}
                  onChange={(value) => updateSessionField('relaxationRating', value)}
                />

                <RatingSelect
                  label="Claridad del alumno"
                  value={session.clarityRating}
                  onChange={(value) => updateSessionField('clarityRating', value)}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Ejercicios trabajados</CardTitle>
                  <CardDescription>
                    Registrá qué pasó en cada ejercicio, no solo si salió o no salió.
                  </CardDescription>
                </div>

                <Button type="button" variant="outline" onClick={addExercise}>
                  <Plus className="mr-2 h-4 w-4" />
                  Agregar ejercicio
                </Button>
              </CardHeader>

              <CardContent className="space-y-4">
                {session.exercises.map((exercise, index) => (
                  <Card key={exercise.id} className="border-primary/15">
                    <CardHeader className="flex flex-row items-start justify-between gap-4">
                      <div>
                        <CardTitle className="text-base">Ejercicio {index + 1}</CardTitle>
                        <CardDescription>
                          Evaluación puntual de este ejercicio.
                        </CardDescription>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeExercise(exercise.id)}
                        disabled={session.exercises.length === 1}
                        aria-label="Eliminar ejercicio"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor={`exercise-name-${exercise.id}`}>Nombre del ejercicio</Label>
                        <Input
                          id={`exercise-name-${exercise.id}`}
                          value={exercise.exerciseName}
                          onChange={(event) =>
                            updateExerciseField(exercise.id, 'exerciseName', event.target.value)
                          }
                          placeholder="Ej: Stick & string, cabestro, mover grupa..."
                        />
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <RatingSelect
                          label="Respuesta"
                          value={exercise.responseRating}
                          onChange={(value) =>
                            updateExerciseField(exercise.id, 'responseRating', value)
                          }
                        />

                        <RatingSelect
                          label="Relajación"
                          value={exercise.relaxationRating}
                          onChange={(value) =>
                            updateExerciseField(exercise.id, 'relaxationRating', value)
                          }
                        />

                        <RatingSelect
                          label="Comprensión"
                          value={exercise.understandingRating}
                          onChange={(value) =>
                            updateExerciseField(exercise.id, 'understandingRating', value)
                          }
                        />

                        <RatingSelect
                          label="Tensión"
                          value={exercise.tensionRating}
                          onChange={(value) =>
                            updateExerciseField(exercise.id, 'tensionRating', value)
                          }
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`repeat-${exercise.id}`}
                          checked={exercise.shouldRepeat}
                          onCheckedChange={(checked) =>
                            updateExerciseField(exercise.id, 'shouldRepeat', checked === true)
                          }
                        />

                        <Label htmlFor={`repeat-${exercise.id}`}>
                          Repetir este ejercicio la próxima sesión
                        </Label>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`exercise-notes-${exercise.id}`}>
                          Notas del ejercicio
                        </Label>
                        <Textarea
                          id={`exercise-notes-${exercise.id}`}
                          value={exercise.notes}
                          onChange={(event) =>
                            updateExerciseField(exercise.id, 'notes', event.target.value)
                          }
                          placeholder="Ej: Al principio se movía, pero cuando bajé la intensidad pudo quedarse quieta."
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Cierre de la sesión</CardTitle>
                <CardDescription>
                  Este bloque ayuda a darle continuidad al próximo entrenamiento.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="generalNotes">Resumen del día</Label>
                  <Textarea
                    id="generalNotes"
                    value={session.generalNotes}
                    onChange={(event) => updateSessionField('generalNotes', event.target.value)}
                    placeholder="Ej: Fue una sesión buena. Empezó con tensión, pero terminó más conectada y receptiva."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="nextStep">Próximo paso</Label>
                  <Textarea
                    id="nextStep"
                    value={session.nextStep}
                    onChange={(event) => updateSessionField('nextStep', event.target.value)}
                    placeholder="Ej: Repetir desensibilización en la grupa antes de pasar a sensibilización en movimiento."
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button type="button" onClick={handleSaveSession} disabled={!canSave}>
                    Guardar sesión
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setSession(createEmptyTrainingSession())}
                  >
                    Limpiar formulario
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>

          <aside className="space-y-4">
            <Card className="xl:sticky xl:top-24">
              <CardHeader>
                <CardTitle>Registros guardados</CardTitle>
                <CardDescription>
                  Por ahora se guardan en este dispositivo usando localStorage.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3">
                {savedSessions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Todavía no hay sesiones guardadas.
                  </p>
                ) : (
                  savedSessions.map((savedSession) => (
                    <div
                      key={savedSession.id}
                      className="rounded-lg border border-border p-3 space-y-2"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold">{savedSession.horseName}</p>
                          <p className="text-xs text-muted-foreground">
                            {savedSession.date}
                            {savedSession.sessionTitle
                              ? ` · ${savedSession.sessionTitle}`
                              : ''}
                          </p>
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteSession(savedSession.id)}
                          aria-label="Eliminar registro"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div className="rounded-md bg-muted p-2">
                          <p className="font-bold">{savedSession.connectionRating}/5</p>
                          <p className="text-muted-foreground">Conexión</p>
                        </div>

                        <div className="rounded-md bg-muted p-2">
                          <p className="font-bold">{savedSession.relaxationRating}/5</p>
                          <p className="text-muted-foreground">Relajación</p>
                        </div>

                        <div className="rounded-md bg-muted p-2">
                          <p className="font-bold">{savedSession.clarityRating}/5</p>
                          <p className="text-muted-foreground">Claridad</p>
                        </div>
                      </div>

                      {savedSession.generalNotes ? (
                        <p className="line-clamp-3 text-sm text-muted-foreground">
                          {savedSession.generalNotes}
                        </p>
                      ) : null}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  );
}

type RatingSelectProps = {
  label: string;
  value: RegistryRating;
  onChange: (value: RegistryRating) => void;
};

function RatingSelect({ label, value, onChange }: RatingSelectProps) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>

      <Select
        value={String(value)}
        onValueChange={(nextValue) => onChange(Number(nextValue) as RegistryRating)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Elegir puntaje" />
        </SelectTrigger>

        <SelectContent>
          {RATING_OPTIONS.map((rating) => (
            <SelectItem key={rating} value={String(rating)}>
              {rating} - {ratingLabels[rating]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}