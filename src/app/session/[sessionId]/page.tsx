
"use client";

import { useEffect, useState, Suspense, ChangeEvent } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { getSession, getExerciseResults, updateSession, updateExerciseResult, deleteSession } from '@/services/session';
import { getHorseById } from '@/services/horse';
import { getBlockById, getExercise } from '@/services/firestore';
import type { SessionData, ExerciseResult, Horse, TrainingBlock, Exercise, ExerciseResultObservations, SessionUpdateData, ExerciseResultUpdateData } from '@/types/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from '@/components/ui/use-toast';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Timestamp } from 'firebase/firestore';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";


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

// Helper type for editable exercise results
type EditableExerciseResult = Omit<ExerciseResultWithDetails, 'createdAt' | 'updatedAt' | 'id' | 'exerciseId'> & {
  id: string; // Keep original ID for updates
  exerciseId: string;
};


function SessionDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { currentUser } = useAuth();
  const { toast } = useToast();

  const sessionId = params.sessionId as string;
  const horseId = searchParams.get('horseId');

  const [session, setSession] = useState<SessionData | null>(null);
  const [editableOverallNote, setEditableOverallNote] = useState<string>("");
  const [editableDate, setEditableDate] = useState<Date | undefined>(undefined);
  
  const [editableExerciseResults, setEditableExerciseResults] = useState<EditableExerciseResult[]>([]);
  
  const [horse, setHorse] = useState<Horse | null>(null);
  const [block, setBlock] = useState<TrainingBlock | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);


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
        setEditableOverallNote(sessionData.overallNote || "");
        setEditableDate(sessionData.date.toDate());

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
        
        setEditableExerciseResults(resultsWithDetails.map(r => ({
            id: r.id,
            exerciseId: r.exerciseId,
            exerciseDetails: r.exerciseDetails,
            plannedReps: r.plannedReps || r.exerciseDetails?.suggestedReps || "",
            doneReps: r.doneReps,
            rating: r.rating,
            comment: r.comment || "",
            observations: r.observations || {
                nostrils: null, lips: null, ears: null, eyes: null, neck: null,
                back: null, croup: null, limbs: null, tail: null,
                overallBehavior: "", additionalNotes: ""
            }
        })));

      } catch (err) {
        console.error("Error fetching session details:", err);
        setError("Ocurrió un error al cargar los detalles de la sesión.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sessionId, currentUser, horseId]);

  const handleExerciseResultChange = (
    exerciseResultId: string,
    field: keyof Omit<EditableExerciseResult, 'id' | 'exerciseId' | 'exerciseDetails' | 'observations'> | `observations.${keyof ExerciseResultObservations}`,
    value: string | number | null
  ) => {
    setEditableExerciseResults(prev => 
        prev.map(er => {
            if (er.id === exerciseResultId) {
                const updatedEr = { ...er };
                if (String(field).startsWith('observations.')) {
                    const obsField = String(field).split('.')[1] as keyof ExerciseResultObservations;
                    updatedEr.observations = {
                        ...(updatedEr.observations || { overallBehavior: "", additionalNotes: "" }), // ensure observations obj exists
                        [obsField]: value === '' || value === 'N/A' ? null : String(value)
                    };
                } else if (field === 'doneReps' || field === 'rating') {
                    (updatedEr as any)[field] = Number(value);
                } else if (field === 'plannedReps' || field === 'comment') {
                     (updatedEr as any)[field] = String(value);
                }
                return updatedEr;
            }
            return er;
        })
    );
  };


  const handleSaveChanges = async () => {
    if (!currentUser || !horseId || !sessionId || !session) {
      toast({ title: "Error al guardar", description: "Falta información.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      // 1. Update Session Data (date, overallNote)
      const sessionUpdates: SessionUpdateData = {};
      let sessionChanged = false;
      if (editableDate && editableDate.getTime() !== session.date.toDate().getTime()) {
        sessionUpdates.date = Timestamp.fromDate(editableDate);
        sessionChanged = true;
      }
      if (editableOverallNote !== (session.overallNote || "")) {
        sessionUpdates.overallNote = editableOverallNote;
        sessionChanged = true;
      }

      if (sessionChanged) {
        await updateSession(horseId, sessionId, sessionUpdates);
      }

      // 2. Update Exercise Results
      // For simplicity, we'll update all, or you can add a "isDirty" flag
      const batch = writeBatch(db); // Consider using batch if many updates
      for (const er of editableExerciseResults) {
        const originalEr = session.exerciseResults?.find(orig => orig.id === er.id); // Assuming session has exerciseResults populated or re-fetch
        
        // Naive check for changes, ideally more robust
        // For now, let's just update all of them.
        const { id, exerciseId, exerciseDetails, ...dataToUpdate } = er;
        
        const resultUpdateData: ExerciseResultUpdateData = {
            plannedReps: dataToUpdate.plannedReps,
            doneReps: dataToUpdate.doneReps,
            rating: dataToUpdate.rating,
            comment: dataToUpdate.comment,
            observations: dataToUpdate.observations && Object.values(dataToUpdate.observations).some(v => v !== null && v !== undefined && String(v).trim() !== '')
                            ? dataToUpdate.observations
                            : null,
        };
        await updateExerciseResult(horseId, sessionId, er.id, resultUpdateData);
      }
      // await batch.commit(); // If using batch

      toast({
        title: "Cambios Guardados",
        description: "La sesión y los resultados de los ejercicios han sido actualizados.",
      });
      
      // Re-fetch data to reflect changes immediately and correctly
      const updatedSessionData = await getSession(horseId, sessionId);
      if (updatedSessionData) {
        setSession(updatedSessionData);
        setEditableOverallNote(updatedSessionData.overallNote || "");
        setEditableDate(updatedSessionData.date.toDate());
        const resultsData = await getExerciseResults(horseId, sessionId);
        const resultsWithDetails: ExerciseResultWithDetails[] = await Promise.all(
          resultsData.map(async (result) => {
            const exerciseDetails = await getExercise(result.exerciseId);
            return { ...result, exerciseDetails };
          })
        );
        setEditableExerciseResults(resultsWithDetails.map(r => ({
            id: r.id,
            exerciseId: r.exerciseId,
            exerciseDetails: r.exerciseDetails,
            plannedReps: r.plannedReps || r.exerciseDetails?.suggestedReps || "",
            doneReps: r.doneReps,
            rating: r.rating,
            comment: r.comment || "",
            observations: r.observations || {
                nostrils: null, lips: null, ears: null, eyes: null, neck: null,
                back: null, croup: null, limbs: null, tail: null,
                overallBehavior: "", additionalNotes: ""
            }
        })));
      }

    } catch (err) {
      console.error("Error saving session changes:", err);
      toast({ title: "Error al Guardar", description: "Ocurrió un error al guardar los cambios.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSessionConfirmed = async () => {
    if (!currentUser || !horseId || !sessionId) {
      toast({ title: "Error", description: "Falta información para eliminar la sesión.", variant: "destructive" });
      return;
    }
    setIsDeleting(true);
    try {
      await deleteSession(horseId, sessionId);
      toast({ title: "Sesión Eliminada", description: "La sesión ha sido eliminada con éxito." });
      router.push(`/horse-history?horseId=${horseId}`);
    } catch (err) {
      console.error("Error deleting session:", err);
      toast({ title: "Error al Eliminar", description: "Ocurrió un error al eliminar la sesión.", variant: "destructive" });
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
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
            Detalle de la Sesión
          </CardTitle>
          <div className="text-sm text-muted-foreground">
            Caballo: {horse?.name || 'Desconocido'} | Etapa: {block?.title || 'Desconocida'}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
            <div>
                <Label htmlFor="sessionDate" className="text-lg font-semibold mb-1 block">Fecha de la Sesión:</Label>
                 <Popover>
                    <PopoverTrigger asChild>
                        <Button
                        variant={"outline"}
                        className={`w-full justify-start text-left font-normal ${
                            !editableDate && "text-muted-foreground"
                        }`}
                        >
                        <Icons.calendar className="mr-2 h-4 w-4" />
                        {editableDate ? format(editableDate, "PPP", { locale: es }) : <span>Elige una fecha</span>}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                        <Calendar
                        mode="single"
                        selected={editableDate}
                        onSelect={setEditableDate}
                        initialFocus
                        locale={es}
                        />
                    </PopoverContent>
                </Popover>
            </div>

          <div>
            <Label htmlFor="overallNote" className="text-lg font-semibold mb-1 block">Nota General de la Sesión:</Label>
            <Textarea
              id="overallNote"
              value={editableOverallNote}
              onChange={(e) => setEditableOverallNote(e.target.value)}
              placeholder="Escribe tus notas generales aquí..."
              className="min-h-[100px] whitespace-pre-wrap"
            />
          </div>

          {editableExerciseResults.length > 0 ? (
            <div>
              <h3 className="text-xl font-semibold mb-3">Ejercicios Realizados:</h3>
              <div className="space-y-6">
                {editableExerciseResults.map((result, index) => (
                  <Card key={result.id} className="p-4 shadow-md">
                    <h4 className="font-semibold text-lg mb-2">
                      {result.exerciseDetails?.title || 'Ejercicio Desconocido'}
                    </h4>
                    {result.exerciseDetails?.description && <p className="text-sm text-muted-foreground mb-3">{result.exerciseDetails.description}</p>}
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                      <div>
                        <Label htmlFor={`plannedReps-${result.id}`}>Planificado</Label>
                        <Input
                          id={`plannedReps-${result.id}`}
                          value={result.plannedReps || ""}
                          onChange={(e) => handleExerciseResultChange(result.id, 'plannedReps', e.target.value)}
                          placeholder="Ej: 10"
                        />
                      </div>
                       <div>
                        <Label htmlFor={`doneReps-${result.id}`}>Realizado (reps)</Label>
                        <Input
                          id={`doneReps-${result.id}`}
                          type="number"
                          value={result.doneReps}
                          onChange={(e) => handleExerciseResultChange(result.id, 'doneReps', parseInt(e.target.value, 10) || 0)}
                        />
                      </div>
                    </div>

                    <div className="mb-3">
                      <Label htmlFor={`rating-${result.id}`}>Calificación: {result.rating} / 5</Label>
                      <Slider
                        id={`rating-${result.id}`}
                        value={[result.rating]}
                        min={1}
                        max={5}
                        step={1}
                        onValueChange={(value) => handleExerciseResultChange(result.id, 'rating', value[0])}
                        className="mt-1"
                      />
                    </div>
                    
                    <div className="mb-4">
                      <Label htmlFor={`comment-${result.id}`}>Comentario del Ejercicio</Label>
                      <Textarea
                        id={`comment-${result.id}`}
                        value={result.comment}
                        onChange={(e) => handleExerciseResultChange(result.id, 'comment', e.target.value)}
                        placeholder="Notas específicas sobre este ejercicio..."
                        className="min-h-[80px] whitespace-pre-wrap"
                      />
                    </div>

                    <div className="pt-4 border-t">
                        <h5 className="font-semibold text-md mb-3">Observaciones del Ejercicio:</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-3 text-sm">
                          {OBSERVATION_ZONES.map(zone => (
                            <div key={zone.id}>
                              <Label htmlFor={`obs-${result.id}-${zone.id}`}>{zone.label}</Label>
                              <Select
                                value={result.observations?.[zone.id as keyof ExerciseResultObservations] || ''}
                                onValueChange={(value) => handleExerciseResultChange(result.id, `observations.${zone.id as keyof ExerciseResultObservations}`, value === 'N/A' ? 'N/A' : (value || null))}
                              >
                                <SelectTrigger id={`obs-${result.id}-${zone.id}`}>
                                  <SelectValue placeholder="Estado..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {TENSION_STATUS_OPTIONS.map(option => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ))}
                        </div>
                         <div className="mb-3">
                            <Label htmlFor={`obs-behavior-${result.id}`}>Comportamiento General (del ejercicio)</Label>
                            <Textarea
                                id={`obs-behavior-${result.id}`}
                                value={result.observations?.overallBehavior || ''}
                                onChange={(e) => handleExerciseResultChange(result.id, `observations.overallBehavior`, e.target.value)}
                                placeholder="Describe el comportamiento general durante este ejercicio..."
                                className="min-h-[80px] whitespace-pre-wrap"
                            />
                         </div>
                         <div>
                            <Label htmlFor={`obs-notes-${result.id}`}>Notas Adicionales (del ejercicio)</Label>
                             <Textarea
                                id={`obs-notes-${result.id}`}
                                value={result.observations?.additionalNotes || ''}
                                onChange={(e) => handleExerciseResultChange(result.id, `observations.additionalNotes`, e.target.value)}
                                placeholder="Otras notas relevantes sobre este ejercicio..."
                                className="min-h-[80px] whitespace-pre-wrap"
                            />
                         </div>
                      </div>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">No se registraron ejercicios para esta sesión.</p>
          )}

          <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
             <Button onClick={handleSaveChanges} disabled={isSaving || isDeleting}>
              {isSaving ? <Icons.spinner className="mr-2 h-4 w-4 animate-spin" /> : <Icons.save className="mr-2 h-4 w-4" />}
              Guardar Todos los Cambios
            </Button>
            
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isSaving || isDeleting}>
                  <Icons.trash className="mr-2 h-4 w-4" /> Eliminar Sesión
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Estás realmente seguro?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción no se puede deshacer. Esto eliminará permanentemente esta sesión y todos los resultados de ejercicios asociados.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteSessionConfirmed} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                    {isDeleting ? <Icons.spinner className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Sí, eliminar sesión
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button onClick={() => router.back()} variant="outline" disabled={isSaving || isDeleting}>
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
