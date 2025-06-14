
"use client";

import { useEffect, useState, Suspense, ChangeEvent } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { getSession, getExerciseResults, updateSession, updateExerciseResult, deleteSession } from '@/services/session';
import { getHorseById } from '@/services/horse';
import { getBlockById, getMasterExerciseById as getDayCardDetails, getPlanById } from '@/services/firestore'; // Renamed for clarity
import type { SessionData, ExerciseResult, Horse, TrainingBlock, MasterExercise, ExerciseResultObservations, SessionUpdateData, ExerciseResultUpdateData, TrainingPlan } from '@/types/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';

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


// This will now typically hold a single result, representing the "Day Card"
interface ExerciseResultWithDayCardDetails extends ExerciseResult {
  dayCardDetails?: MasterExercise | null; // Details of the MasterExercise that represents the Day
}

// Helper type for editable exercise results (Day Card result)
type EditableDayCardResult = Omit<ExerciseResultWithDayCardDetails, 'createdAt' | 'updatedAt' | 'id' | 'exerciseId' | 'observations'> & {
  id: string;
  exerciseId: string; // ID of the Day Card (MasterExercise)
  observations: Omit<ExerciseResultObservations, 'overallBehavior'>;
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

  // Will usually contain one item: the result for the "Day Card"
  const [editableDayCardResults, setEditableDayCardResults] = useState<EditableDayCardResult[]>([]);

  const [horse, setHorse] = useState<Horse | null>(null);
  const [block, setBlock] = useState<TrainingBlock | null>(null); // Week
  const [plan, setPlan] = useState<TrainingPlan | null>(null); // Training Plan
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

        if (sessionData.blockId) { // blockId is Week ID
          const blockData = await getBlockById(sessionData.blockId);
          setBlock(blockData);
          if (blockData && blockData.planId) {
            const planData = await getPlanById(blockData.planId);
            setPlan(planData);
          }
        }

        const resultsData = await getExerciseResults(horseId, sessionId); // Should be one result for the Day Card
        const resultsWithDetails: ExerciseResultWithDayCardDetails[] = await Promise.all(
          resultsData.map(async (result) => {
            const dayCardDetails = await getDayCardDetails(result.exerciseId); // Fetch details of the MasterExercise (Day Card)
            return { ...result, dayCardDetails };
          })
        );

        setEditableDayCardResults(resultsWithDetails.map(r => ({
            id: r.id,
            exerciseId: r.exerciseId,
            dayCardDetails: r.dayCardDetails,
            plannedReps: r.plannedReps || r.dayCardDetails?.suggestedReps || "",
            doneReps: r.doneReps,
            rating: r.rating,
            observations: r.observations ?
                {
                    nostrils: r.observations.nostrils,
                    lips: r.observations.lips,
                    ears: r.observations.ears,
                    eyes: r.observations.eyes,
                    neck: r.observations.neck,
                    back: r.observations.back,
                    croup: r.observations.croup,
                    limbs: r.observations.limbs,
                    tail: r.observations.tail,
                    additionalNotes: r.observations.additionalNotes || ""
                }
                : {
                nostrils: null, lips: null, ears: null, eyes: null, neck: null,
                back: null, croup: null, limbs: null, tail: null,
                additionalNotes: ""
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

  const handleDayCardResultChange = (
    exerciseResultId: string, // This is the ID of the ExerciseResult document
    field: keyof Omit<EditableDayCardResult, 'id' | 'exerciseId' | 'dayCardDetails' | 'observations'> | `observations.${keyof Omit<ExerciseResultObservations, 'overallBehavior'>}`,
    value: string | number | null
  ) => {
    setEditableDayCardResults(prev =>
        prev.map(er => {
            if (er.id === exerciseResultId) {
                const updatedEr = { ...er };
                if (String(field).startsWith('observations.')) {
                    const obsField = String(field).split('.')[1] as keyof Omit<ExerciseResultObservations, 'overallBehavior'>;
                    updatedEr.observations = {
                        ...(updatedEr.observations || { /* Default structure */ }),
                        [obsField]: value === '' || value === 'N/A' ? null : String(value)
                    };
                } else if (field === 'doneReps' || field === 'rating') {
                    (updatedEr as any)[field] = Number(value);
                } else if (field === 'plannedReps') {
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
      // selectedDayExerciseId and Title are part of SessionData, not updated here usually unless a specific UI for it is made

      if (sessionChanged) {
        await updateSession(horseId, sessionId, sessionUpdates);
      }

      // Update the single Day Card result
      for (const er of editableDayCardResults) {
        const { id, exerciseId, dayCardDetails, createdAt, updatedAt, ...dataToUpdateNoComment } = er;

        const resultUpdateData: ExerciseResultUpdateData = {
            plannedReps: dataToUpdateNoComment.plannedReps,
            doneReps: dataToUpdateNoComment.doneReps,
            rating: dataToUpdateNoComment.rating,
            observations: dataToUpdateNoComment.observations && Object.values(dataToUpdateNoComment.observations).some(v => v !== null && v !== undefined && String(v).trim() !== '')
                            ? dataToUpdateNoComment.observations
                            : null,
        };
        await updateExerciseResult(horseId, sessionId, er.id, resultUpdateData);
      }

      toast({
        title: "Cambios Guardados",
        description: "La sesión y los detalles del día han sido actualizados.",
      });

      // Re-fetch data to reflect changes
      const updatedSessionData = await getSession(horseId, sessionId);
      if (updatedSessionData) {
        setSession(updatedSessionData);
        setEditableOverallNote(updatedSessionData.overallNote || "");
        setEditableDate(updatedSessionData.date.toDate());
        const resultsData = await getExerciseResults(horseId, sessionId);
        const resultsWithDetails: ExerciseResultWithDayCardDetails[] = await Promise.all(
          resultsData.map(async (result) => {
            const dayCardDetails = await getDayCardDetails(result.exerciseId);
            return { ...result, dayCardDetails };
          })
        );
        setEditableDayCardResults(resultsWithDetails.map(r => ({
            id: r.id,
            exerciseId: r.exerciseId,
            dayCardDetails: r.dayCardDetails,
            plannedReps: r.plannedReps || r.dayCardDetails?.suggestedReps || "",
            doneReps: r.doneReps,
            rating: r.rating,
             observations: r.observations ?
                {
                    nostrils: r.observations.nostrils,
                    lips: r.observations.lips,
                    ears: r.observations.ears,
                    eyes: r.observations.eyes,
                    neck: r.observations.neck,
                    back: r.observations.back,
                    croup: r.observations.croup,
                    limbs: r.observations.limbs,
                    tail: r.observations.tail,
                    additionalNotes: r.observations.additionalNotes || ""
                }
                : {
                nostrils: null, lips: null, ears: null, eyes: null, neck: null,
                back: null, croup: null, limbs: null, tail: null,
                additionalNotes: ""
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
      <div className="container mx-auto py-6 sm:py-10 text-center">
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
      <div className="container mx-auto py-6 sm:py-10 text-center">
        <p>No se encontró la sesión.</p>
        <Button onClick={() => router.back()} className="mt-4">
           <Icons.arrowRight className="mr-2 h-4 w-4 rotate-180" /> Volver
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 sm:py-10">
      <Card className="w-full max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl">
            Detalle de la Sesión
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Plan: {plan?.title || 'Desconocido'} | Semana: {block?.title || 'Desconocida'} | Caballo: {horse?.name || 'Desconocido'} 
          </CardDescription>
           {session.selectedDayExerciseTitle && (
             <p className="text-lg font-semibold text-primary mt-1">Día: {session.selectedDayExerciseTitle}</p>
           )}
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
            <Label htmlFor="overallNote" className="text-lg font-semibold mb-1 block">Nota General de la Sesión (para este día):</Label>
            <Textarea
              id="overallNote"
              value={editableOverallNote}
              onChange={(e) => setEditableOverallNote(e.target.value)}
              placeholder="Escribe tus notas generales aquí..."
              className="min-h-[100px] whitespace-pre-wrap"
            />
          </div>

          {editableDayCardResults.length > 0 ? (
            <div>
              <h3 className="text-xl font-semibold mb-3">Detalles del Día Realizado:</h3>
              <div className="space-y-6">
                {editableDayCardResults.map((result, index) => ( // Should be only one result
                  <Card key={result.id} className="p-4 shadow-md">
                    <h4 className="font-semibold text-lg mb-2">
                      {result.dayCardDetails?.title || 'Día Desconocido'}
                    </h4>
                    {result.dayCardDetails?.description && <p className="text-sm text-muted-foreground mb-1 whitespace-pre-wrap">{result.dayCardDetails.description}</p>}
                    {result.dayCardDetails?.objective && <p className="text-sm text-muted-foreground mb-3 whitespace-pre-wrap"><strong>Objetivo del día:</strong> {result.dayCardDetails.objective}</p>}


                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                      <div>
                        <Label htmlFor={`plannedReps-${result.id}`}>Planificado</Label>
                        <Input
                          id={`plannedReps-${result.id}`}
                          value={result.plannedReps || ""}
                          onChange={(e) => handleDayCardResultChange(result.id, 'plannedReps', e.target.value)}
                          placeholder="Ej: 1 sesión, 45 min"
                        />
                      </div>
                       <div>
                        <Label htmlFor={`doneReps-${result.id}`}>Realizado (0=No, 1=Sí)</Label>
                        <Input
                          id={`doneReps-${result.id}`}
                          type="number"
                          min="0" max="1" step="1"
                          value={result.doneReps}
                          onChange={(e) => handleDayCardResultChange(result.id, 'doneReps', parseInt(e.target.value, 10) || 0)}
                        />
                      </div>
                    </div>

                    <div className="mb-3">
                      <Label htmlFor={`rating-${result.id}`}>Calificación del Día: {result.rating} / 10</Label>
                      <Slider
                        id={`rating-${result.id}`}
                        value={[result.rating]}
                        min={0}
                        max={10}
                        step={1}
                        onValueChange={(value) => handleDayCardResultChange(result.id, 'rating', value[0])}
                        className="mt-1"
                      />
                    </div>

                    <div className="pt-4 border-t">
                        <h5 className="font-semibold text-md mb-3">Observaciones Específicas del Día:</h5>
                        <div className="mb-3">
                            <Label htmlFor={`obs-notes-${result.id}`}>Notas Adicionales</Label>
                             <Textarea
                                id={`obs-notes-${result.id}`}
                                value={result.observations?.additionalNotes || ''}
                                onChange={(e) => handleDayCardResultChange(result.id, `observations.additionalNotes`, e.target.value)}
                                placeholder="Otras notas relevantes sobre el entrenamiento de hoy..."
                                className="min-h-[80px] whitespace-pre-wrap"
                            />
                         </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-3 text-sm">
                          {OBSERVATION_ZONES.map(zone => (
                            <div key={zone.id}>
                              <Label htmlFor={`obs-${result.id}-${zone.id}`}>{zone.label}</Label>
                              <Select
                                value={result.observations?.[zone.id as keyof Omit<ExerciseResultObservations, 'overallBehavior'>] || ''}
                                onValueChange={(value) => handleDayCardResultChange(result.id, `observations.${zone.id as keyof Omit<ExerciseResultObservations, 'overallBehavior'>}`, value === 'N/A' ? 'N/A' : (value || null))}
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
                      </div>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">No se registraron detalles para el día de esta sesión.</p>
          )}

          <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
             <Button onClick={handleSaveChanges} disabled={isSaving || isDeleting} className="w-full sm:w-auto">
              {isSaving ? <Icons.spinner className="mr-2 h-4 w-4 animate-spin" /> : <Icons.save className="mr-2 h-4 w-4" />}
              Guardar Cambios
            </Button>

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isSaving || isDeleting} className="w-full sm:w-auto">
                  <Icons.trash className="mr-2 h-4 w-4" /> Eliminar Sesión
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Estás realmente seguro?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción no se puede deshacer. Esto eliminará permanentemente esta sesión y todos los detalles del día asociados.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteSessionConfirmed} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                    {isDeleting ? <Icons.spinner className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Sí, eliminar sesión
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <Button onClick={() => router.back()} variant="outline" disabled={isSaving || isDeleting} className="w-full sm:w-auto">
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


    
