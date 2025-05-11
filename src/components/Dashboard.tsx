
"use client";

import { Timestamp } from "firebase/firestore";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { useState, useEffect, useCallback } from "react";
import type { User } from 'firebase/auth';
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation'; 

import { createSession, addExerciseResult, getSession, getExerciseResults } from "@/services/session";
import { getHorses as fetchHorsesService, getHorseById } from "@/services/horse";
import { getTrainingPlans, getTrainingBlocks, getExercises, getExercise } from "@/services/firestore";
import type { Horse, TrainingPlan, TrainingBlock, Exercise, ExerciseResult, SessionDataInput, ExerciseResultInput, SessionData } from "@/types/firestore";
 
 import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
 import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
 import { Label } from "@/components/ui/label";
 import { Input } from "@/components/ui/input"; 
 import { Textarea } from "@/components/ui/textarea";
 import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
 import { Slider } from "@/components/ui/slider";
 import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import AddHorseForm from "./AddHorseForm";
import AddPlanForm from "./AddPlanForm";
import AddBlockForm from "./AddBlockForm"; // Renamed from AddStageForm to AddBlockForm, as 'block' is the data model term
import AddExerciseForm from "./AddExerciseForm";
import { Icons } from "./icons";

const Dashboard = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();  
  const router = useRouter(); 
  const [isAddHorseDialogOpen, setIsAddHorseDialogOpen] = useState(false);
  const [horses, setHorses] = useState<Horse[]>([]);
  const [isLoadingHorses, setIsLoadingHorses] = useState(true);
  const [selectedHorse, setSelectedHorse] = useState<Horse | null>(null);
  
  const [trainingPlans, setTrainingPlans] = useState<TrainingPlan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<TrainingPlan | null>(null);
  
  const [blocks, setBlocks] = useState<TrainingBlock[]>([]); // 'blocks' for 'etapas'
  const [isLoadingBlocks, setIsLoadingBlocks] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<TrainingBlock | null>(null); // 'selectedBlock' for 'etapa seleccionada'
  
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoadingExercises, setIsLoadingExercises] = useState(false);
  // const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null); // Not currently used for selection, but for listing

  const [date, setDate] = useState<Date | undefined>(new Date());
  
  // State for new session registration
  const [sessionOverallNote, setSessionOverallNote] = useState("");
  const [sessionExerciseResults, setSessionExerciseResults] = useState<Map<string, Omit<ExerciseResultInput, 'exerciseId'>>>(new Map());
  const [isSavingSession, setIsSavingSession] = useState(false);


  const [isCreatePlanDialogOpen, setIsCreatePlanDialogOpen] = useState(false);
  const [isAddBlockDialogOpen, setIsAddBlockDialogOpen] = useState(false); // 'Block' here refers to 'Etapa'
  const [isAddExerciseDialogOpen, setIsAddExerciseDialogOpen] = useState(false);
  const [currentBlockIdForExercise, setCurrentBlockIdForExercise] = useState<string | null>(null);


  const performFetchHorses = useCallback(async (uid: string) => {
    setIsLoadingHorses(true);
    try {
      const userHorses = await fetchHorsesService(uid);
      setHorses(userHorses);
      if (userHorses.length > 0 && !selectedHorse) {
        // Optionally select the first horse if none is selected
        // setSelectedHorse(userHorses[0]);
      } else if (userHorses.length === 0) {
        setSelectedHorse(null); // Clear selected horse if no horses
      }
    } catch (error) {
      console.error("Error fetching horses:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los caballos." });
      setHorses([]); 
    } finally {
      setIsLoadingHorses(false);
    }
  }, [toast, selectedHorse]); 

  useEffect(() => {
    if (currentUser?.uid) {
      performFetchHorses(currentUser.uid);
    } else {
      setHorses([]); 
      setSelectedHorse(null);
      setIsLoadingHorses(false); 
    }
  }, [currentUser?.uid, performFetchHorses]);


  const performFetchPlans = useCallback(async () => {
    setIsLoadingPlans(true);
    try {
      const plans = await getTrainingPlans();
      setTrainingPlans(plans);
    } catch (error) {
      console.error("Error fetching training plans:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los planes de entrenamiento." });
      setTrainingPlans([]);
    } finally {
      setIsLoadingPlans(false);
    }
  }, [toast]);

  useEffect(() => {
    performFetchPlans();
  }, [performFetchPlans]);

  const performFetchBlocks = useCallback(async (planId: string) => {
    if (!planId) {
      setBlocks([]); // Use 'blocks' for 'etapas'
      setSelectedBlock(null); 
      return;
    }
    setIsLoadingBlocks(true);
    try {
      const fetchedBlocks = await getTrainingBlocks(planId);
      setBlocks(fetchedBlocks);
      if (fetchedBlocks.length === 0) {
        setSelectedBlock(null); // Clear selected block if no blocks for this plan
      }
    } catch (error) {
      console.error(`Error fetching blocks for plan ${planId}:`, error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar las etapas para este plan." });
      setBlocks([]);
    } finally {
      setIsLoadingBlocks(false);
    }
  }, [toast]); 

  useEffect(() => {
    if (selectedPlan) {
      performFetchBlocks(selectedPlan.id);
    } else {
      setBlocks([]);
      setSelectedBlock(null); 
      setExercises([]); 
      // setSelectedExercise(null); 
    }
  }, [selectedPlan, performFetchBlocks]);

  // Fetch exercises for all blocks of the selected plan
   const performFetchExercisesForPlan = useCallback(async (planId: string) => {
    if (!planId) {
      setExercises([]);
      return;
    }
    setIsLoadingExercises(true);
    try {
      const planBlocks = await getTrainingBlocks(planId); // Re-fetch or use existing blocks state
      let allExercisesForPlan: Exercise[] = [];
      for (const block of planBlocks) {
        const blockExercises = await getExercises(planId, block.id);
        allExercisesForPlan = [...allExercisesForPlan, ...blockExercises];
      }
      setExercises(allExercisesForPlan);
    } catch (error) {
      console.error(`Error fetching all exercises for plan ${planId}:`, error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar todos los ejercicios del plan." });
      setExercises([]);
    } finally {
      setIsLoadingExercises(false);
    }
  }, [toast]);

  useEffect(() => {
    if (selectedPlan) {
      performFetchExercisesForPlan(selectedPlan.id);
    } else {
      setExercises([]);
    }
  }, [selectedPlan, performFetchExercisesForPlan]);


  const handleHorseAdded = () => {
    setIsAddHorseDialogOpen(false);
    if (currentUser?.uid) performFetchHorses(currentUser.uid); 
  };
  const handleAddHorseCancel = () => setIsAddHorseDialogOpen(false);

  const handlePlanAdded = (newPlanId: string) => {
    setIsCreatePlanDialogOpen(false);
    performFetchPlans().then(() => {
      // After fetching all plans, find the new one and select it
      getTrainingPlans().then(refreshedPlans => { // Assuming getTrainingPlans is up-to-date
        setTrainingPlans(refreshedPlans); // Update local state for dropdown
        const newPlan = refreshedPlans.find(p => p.id === newPlanId);
        if (newPlan) {
          setSelectedPlan(newPlan); // This will trigger fetching its blocks and exercises
        }
      });
    });
  };

  const handleBlockAdded = (newBlockId: string) => { // newBlockId is the ID of the added 'etapa'
    setIsAddBlockDialogOpen(false);
    if (selectedPlan) {
      performFetchBlocks(selectedPlan.id).then(() => {
        // The 'blocks' state will be updated, and UI should reflect this.
        // If needed, find and select the new block, but usually just refreshing the list is enough.
      });
    }
  };

  const handleExerciseAdded = (newExerciseId: string) => {
    setIsAddExerciseDialogOpen(false);
    if (selectedPlan && currentBlockIdForExercise) {
      // Re-fetch exercises for the specific block or the whole plan
      performFetchExercisesForPlan(selectedPlan.id);
    }
    setCurrentBlockIdForExercise(null); // Reset after adding
  };
  
  const openAddExerciseDialog = (blockId: string) => {
    setCurrentBlockIdForExercise(blockId);
    setIsAddExerciseDialogOpen(true);
  };


  const handleSessionExerciseInputChange = (exerciseId: string, field: keyof Omit<ExerciseResultInput, 'exerciseId'>, value: string | number) => {
    setSessionExerciseResults(prev => {
        const newMap = new Map(prev);
        const currentExercise = newMap.get(exerciseId) || { doneReps: 0, rating: 3, comment: "", plannedReps: "" };
        
        if (field === 'doneReps' || field === 'rating') {
            (currentExercise as any)[field] = Number(value); // Use 'any' carefully or improve typing
        } else {
            (currentExercise as any)[field] = String(value);
        }
        newMap.set(exerciseId, currentExercise);
        return newMap;
    });
  };

const handleSaveSessionAndNavigate = async () => {
    if (!currentUser || !date || !selectedHorse || !selectedHorse.id || !selectedBlock || !selectedBlock.id) {
      toast({
        variant: "destructive",
        title: "Error de Validación",
        description: "Por favor, asegúrate de que la fecha, el caballo y la etapa estén seleccionados.",
      });
      return;
    }

    const exercisesInSelectedBlock = exercises.filter(ex => ex.blockId === selectedBlock.id);
    if (exercisesInSelectedBlock.length === 0) {
        toast({
            variant: "destructive",
            title: "Sin Ejercicios",
            description: "La etapa seleccionada no tiene ejercicios. Añade ejercicios antes de registrar una sesión.",
        });
        return;
    }


    setIsSavingSession(true);
    try {
      const sessionInput: SessionDataInput = {
        horseId: selectedHorse.id,
        date: Timestamp.fromDate(date),
        blockId: selectedBlock.id, // Save the ID of the selected 'etapa'
        overallNote: sessionOverallNote,
      };
      
      const sessionId = await createSession(sessionInput);

      if (sessionId) {
        const exerciseResultsToSave: ExerciseResultInput[] = [];
        sessionExerciseResults.forEach((result, exerciseId) => {
            // Ensure we have the original exercise details to get plannedReps if not overridden
            const exerciseDetails = exercises.find(ex => ex.id === exerciseId);
            exerciseResultsToSave.push({
                exerciseId: exerciseId,
                plannedReps: result.plannedReps ?? exerciseDetails?.suggestedReps ?? '', // Fallback to exercise's suggestedReps
                doneReps: result.doneReps,
                rating: result.rating,
                comment: result.comment,
            });
        });

        // Save all exercise results
        if (exerciseResultsToSave.length > 0) {
             for (const resultInput of exerciseResultsToSave) {
                await addExerciseResult(sessionId, resultInput);
            }
        }
        
        toast({ title: "Sesión Guardada", description: "La sesión y los resultados de los ejercicios han sido registrados." });
        // Reset form states
        setSessionOverallNote("");
        setSessionExerciseResults(new Map());
        // setSelectedBlock(null); // Optionally reset selected block

        // Navigate to the session detail page
        router.push(`/session/${sessionId}`); 
      } else {
        toast({ variant: "destructive", title: "Error", description: "No se pudo crear la sesión." });
      }
    } catch (error) {
      console.error("Error saving session:", error);
      let errorMessage = "Ocurrió un error al guardar la sesión.";
      if (error instanceof Error) { // More specific error handling
        errorMessage = error.message;
      }
      toast({ variant: "destructive", title: "Error al Guardar", description: errorMessage });
    } finally {
      setIsSavingSession(false);
    }
  };


  return (
    <div className="container py-10">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">

        {/* Columna Izquierda: Selección Caballo y Detalles/Plan */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Selección de Caballo</CardTitle>
              <CardDescription>Elige un caballo para ver sus detalles o añade uno nuevo.</CardDescription>
            </CardHeader>
            <CardContent>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between">
                    {selectedHorse ? selectedHorse.name : "Seleccionar Caballo"}
                    <Icons.chevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                  <DropdownMenuLabel>Mis Caballos</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {isLoadingHorses ? (
                     <DropdownMenuItem disabled>Cargando caballos...</DropdownMenuItem>
                  ) : horses.length > 0 ? (
                    horses.map((horse) => (
                      <DropdownMenuItem
                        key={horse.id}
                        onSelect={() => setSelectedHorse(horse)}
                      >
                        {horse.name}
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <DropdownMenuItem disabled>No hay caballos registrados</DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => setIsAddHorseDialogOpen(true)}>
                    <Icons.plus className="mr-2 h-4 w-4" />
                    Añadir Caballo Nuevo
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardContent>
          </Card>

          {selectedHorse ? (
            <Card>
              <CardHeader>
                <CardTitle>Detalles de {selectedHorse.name}</CardTitle>
                <CardDescription>Edad: {selectedHorse.age} años, Sexo: {selectedHorse.sex}, Color: {selectedHorse.color}</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="plan" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="plan">Plan</TabsTrigger>
                    <TabsTrigger value="sesiones">Sesiones</TabsTrigger>
                    <TabsTrigger value="observaciones">Observaciones</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="plan">
                    <Card className="my-4">
                      <CardHeader>
                        <CardTitle>Plan de Entrenamiento para {selectedHorse.name}</CardTitle>
                         <div className="flex flex-col sm:flex-row sm:items-center gap-2 mt-2">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="w-full sm:w-auto justify-between">
                                    {selectedPlan ? selectedPlan.title : "Seleccionar Plan"}
                                    <Icons.chevronDown className="ml-2 h-4 w-4" />
                                </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                                <DropdownMenuLabel>Planes Disponibles</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {isLoadingPlans ? (
                                    <DropdownMenuItem disabled>Cargando planes...</DropdownMenuItem>
                                ) : trainingPlans.length > 0 ? (
                                    trainingPlans.map((plan) => (
                                    <DropdownMenuItem
                                        key={plan.id}
                                        onSelect={() => setSelectedPlan(plan)}
                                    >
                                        {plan.title} {plan.template && "(Plantilla)"}
                                    </DropdownMenuItem>
                                    ))
                                ) : (
                                    <DropdownMenuItem disabled>No hay planes disponibles</DropdownMenuItem>
                                )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                            <Button onClick={() => setIsCreatePlanDialogOpen(true)} className="w-full sm:w-auto">
                                <Icons.plus className="mr-2 h-4 w-4" /> Crear Plan Nuevo
                            </Button>
                        </div>
                        {selectedPlan && <CardDescription className="mt-2">Plan activo: {selectedPlan.title}</CardDescription>}
                      </CardHeader>
                      <CardContent>
                        {selectedPlan ? (
                           <>
                            {isLoadingBlocks ? <p>Cargando etapas...</p> : blocks.length > 0 ? (
                               <Accordion type="multiple" className="w-full">
                                {blocks.map((block) => ( // 'block' here represents an 'etapa'
                                  <AccordionItem value={block.id} key={block.id}>
                                    <AccordionTrigger>
                                      {block.title}
                                      {block.notes && <span className="text-sm text-muted-foreground ml-2">- {block.notes}</span>}
                                      {block.duration && <span className="text-sm text-muted-foreground ml-2">- Duración: {block.duration}</span>}
                                    </AccordionTrigger>
                                    <AccordionContent>
                                      {isLoadingExercises && !exercises.some(ex => ex.blockId === block.id && ex.planId === selectedPlan.id) ? <p>Cargando ejercicios...</p> : exercises.filter(ex => ex.blockId === block.id && ex.planId === selectedPlan.id).length > 0 ? (
                                        <ul className="list-disc pl-5 space-y-1 text-sm">
                                          {exercises
                                            .filter(ex => ex.blockId === block.id && ex.planId === selectedPlan.id)
                                            .map(exercise => (
                                              <li key={exercise.id}>
                                                <span className="font-medium">{exercise.title}</span>
                                                {exercise.suggestedReps && ` (Reps: ${exercise.suggestedReps})`}
                                                {exercise.description && <p className="text-xs text-muted-foreground pl-2">- Desc: {exercise.description}</p>}
                                                {exercise.objective && <p className="text-xs text-muted-foreground pl-2">- Obj: {exercise.objective}</p>}
                                                </li>
                                          ))}
                                        </ul>
                                      ) : (
                                        <p className="text-sm text-muted-foreground">No hay ejercicios en esta etapa.</p>
                                      )}
                                      <Button size="sm" variant="outline" className="mt-2" onClick={() => openAddExerciseDialog(block.id)}>
                                        <Icons.plus className="mr-2 h-4 w-4" /> Añadir Ejercicio a esta Etapa
                                      </Button>
                                    </AccordionContent>
                                  </AccordionItem>
                                ))}
                              </Accordion>
                            ) : (
                              <p className="text-sm text-muted-foreground">Este plan no tiene etapas definidas.</p>
                            )}
                            <div className="flex flex-wrap justify-end mt-4 gap-2">
                                <Button onClick={() => setIsAddBlockDialogOpen(true)} disabled={!selectedPlan || isLoadingBlocks}>
                                    <Icons.plus className="mr-2 h-4 w-4" /> Añadir Etapa {/* Changed from 'Añadir Bloque' to 'Añadir Etapa' */}
                                </Button>
                                <Button variant="outline" disabled={!selectedPlan}>Editar Plan</Button>
                                <Button variant="outline" disabled={!selectedPlan}>Clonar Plan</Button>
                            </div>
                           </>
                        ) : (
                          <p className="text-sm text-muted-foreground">Selecciona o crea un plan de entrenamiento para ver sus detalles y gestionarlo.</p>
                        )}
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="sesiones">
                     <Card className="my-4">
                      <CardHeader>
                        <CardTitle>Registrar Nueva Sesión</CardTitle>
                        <CardDescription>Para {selectedHorse.name} en {date ? date.toLocaleDateString("es-ES") : 'fecha no seleccionada'}</CardDescription>
                      </CardHeader>
                      <CardContent className="grid gap-4">
                        {/* Dropdown to select a Block (Etapa) for the session */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="w-full justify-start" disabled={!selectedPlan || blocks.length === 0}>
                              {/* Check if selectedBlock is valid within current blocks */}
                              {(selectedBlock && blocks.some(b => b.id === selectedBlock.id)) ? selectedBlock.title : "Seleccionar Etapa"}
                              <Icons.chevronDown className="ml-auto h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                            <DropdownMenuLabel>Etapas del Plan Actual</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {isLoadingBlocks ? (
                                <DropdownMenuItem disabled>Cargando etapas...</DropdownMenuItem>
                            ) : blocks.length > 0 ? (
                              blocks.map((block) => ( // 'block' is an 'etapa'
                                  <DropdownMenuItem key={block.id} onSelect={() => {
                                    setSelectedBlock(block);
                                    setSessionExerciseResults(new Map()); // Reset results when block changes
                                  }}>
                                      {block.title}
                                      {block.notes && <span className="text-xs text-muted-foreground ml-1">({block.notes})</span>}
                                  </DropdownMenuItem>
                              ))
                              ) : (
                              <DropdownMenuItem disabled>No hay etapas en el plan seleccionado</DropdownMenuItem>
                              )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        
                        {selectedBlock && (
                            <>
                            <Label htmlFor="session-overall-note">Notas Generales de la Sesión</Label>
                            <Textarea 
                                id="session-overall-note"
                                placeholder="Comentarios generales sobre la sesión, estado del caballo, etc."
                                value={sessionOverallNote}
                                onChange={(e) => setSessionOverallNote(e.target.value)}
                            />

                            {/* List exercises of the selected block for session input */}
                            {isLoadingExercises && exercises.filter(ex => ex.blockId === selectedBlock.id && ex.planId === selectedPlan?.id).length === 0 ? (
                                <p>Cargando ejercicios...</p>
                            ) : exercises.filter(ex => ex.blockId === selectedBlock.id && ex.planId === selectedPlan?.id).length > 0 ? (
                                exercises.filter(ex => ex.blockId === selectedBlock.id && ex.planId === selectedPlan?.id).map(exercise => {
                                    const currentResult = sessionExerciseResults.get(exercise.id) || { doneReps: 0, rating: 3, comment: "", plannedReps: exercise.suggestedReps ?? "" };
                                    return (
                                        <Card key={exercise.id} className="p-4">
                                            <Label className="font-semibold">{exercise.title}</Label>
                                            {exercise.description && <p className="text-xs text-muted-foreground mt-1 mb-2">{exercise.description}</p>}
                                            
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                                                <div>
                                                    <Label htmlFor={`plannedReps-${exercise.id}`}>Repeticiones Planificadas</Label>
                                                    <Input 
                                                        id={`plannedReps-${exercise.id}`}
                                                        type="text"
                                                        placeholder="Ej: 10 o 'Hasta lograr X'"
                                                        value={currentResult.plannedReps}
                                                        onChange={(e) => handleSessionExerciseInputChange(exercise.id, 'plannedReps', e.target.value)}
                                                    />
                                                </div>
                                                <div>
                                                    <Label htmlFor={`doneReps-${exercise.id}`}>Repeticiones Realizadas</Label>
                                                    <Input 
                                                        id={`doneReps-${exercise.id}`}
                                                        type="number"
                                                        placeholder="Ej: 8"
                                                        value={String(currentResult.doneReps)} // Ensure value is string for input
                                                        onChange={(e) => handleSessionExerciseInputChange(exercise.id, 'doneReps', e.target.value)}
                                                    />
                                                </div>
                                            </div>
                                            
                                            <div className="mt-3">
                                                <Label htmlFor={`rating-${exercise.id}`}>Calificación (1-5): {currentResult.rating}</Label>
                                                <Slider
                                                    id={`rating-${exercise.id}`}
                                                    defaultValue={[currentResult.rating]}
                                                    min={1}
                                                    max={5}
                                                    step={1}
                                                    className="mt-1"
                                                    onValueChange={(value) => handleSessionExerciseInputChange(exercise.id, 'rating', value[0])}
                                                />
                                            </div>
                                            <div className="mt-3">
                                                <Label htmlFor={`comment-${exercise.id}`}>Comentarios del Ejercicio</Label>
                                                <Textarea 
                                                    id={`comment-${exercise.id}`}
                                                    placeholder="Notas específicas sobre este ejercicio..."
                                                    value={currentResult.comment}
                                                    onChange={(e) => handleSessionExerciseInputChange(exercise.id, 'comment', e.target.value)}
                                                />
                                            </div>
                                        </Card>
                                    )
                                })
                            ) : (
                                <p className="text-sm text-muted-foreground">No hay ejercicios en esta etapa para registrar.</p>
                            )}
                            </>
                        )}
                        
                        <div className="flex justify-end mt-2">
                          <Button 
                            onClick={handleSaveSessionAndNavigate}
                            disabled={isSavingSession || !date || !selectedHorse || !selectedBlock || (selectedBlock && exercises.filter(ex => ex.blockId === selectedBlock.id && ex.planId === selectedPlan?.id).length === 0) }
                          >
                            {isSavingSession && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                            Guardar Sesión e Ir a Detalles
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="observaciones">
                    <Card className="my-4">
                      <CardHeader>
                        <CardTitle>Observaciones de Tensión</CardTitle>
                        <CardDescription>Para {selectedHorse.name}</CardDescription>
                      </CardHeader>
                      <CardContent className="grid gap-4">
                        <Label className="text-sm font-medium">Checklist de zonas (próximamente)</Label>
                        <Label htmlFor="tension-notes" className="text-sm font-medium">Notas Adicionales</Label>
                        <Input id="tension-notes" type="text" placeholder="Añade notas sobre tensión, comportamiento, etc." />
                        <Button variant="outline">Añadir Foto (próximamente)</Button>
                        <div className="flex justify-end mt-2">
                          <Button>Guardar Observación</Button>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64 text-center">
                <Icons.logo className="w-16 h-16 mb-4 text-muted-foreground" data-ai-hint="horse head" /> 
                <p className="text-muted-foreground">Selecciona un caballo para ver sus detalles o registra uno nuevo usando el menú desplegable de arriba.</p>
              </CardContent>
            </Card>
          )}
        </div>
        
        {/* Columna Derecha: Calendario */}
        <Card className="col-span-1 md:col-span-1">
          <CardHeader>
            <CardTitle>Calendario</CardTitle>
            <CardDescription>
              Resumen de sesiones y eventos.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border shadow"
            />
            {date ? (
              <p className="text-center text-sm font-medium">
                Fecha seleccionada: {date.toLocaleDateString("es-ES", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            ) : (
              <p className="text-center text-sm text-muted-foreground">
                Selecciona una fecha.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs for adding entities */}
      <Dialog open={isAddHorseDialogOpen} onOpenChange={setIsAddHorseDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Añadir Nuevo Caballo</DialogTitle>
            <DialogDescription>
              Completa los detalles para registrar un nuevo caballo.
            </DialogDescription>
          </DialogHeader>
          <AddHorseForm 
            onSuccess={handleHorseAdded} 
            onCancel={handleAddHorseCancel} 
          />
        </DialogContent>
      </Dialog>

      <Dialog open={isCreatePlanDialogOpen} onOpenChange={setIsCreatePlanDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Plan de Entrenamiento</DialogTitle>
            <DialogDescription>Define un nuevo plan para tus caballos.</DialogDescription>
          </DialogHeader>
          <AddPlanForm onSuccess={handlePlanAdded} onCancel={() => setIsCreatePlanDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={isAddBlockDialogOpen} onOpenChange={setIsAddBlockDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Añadir Nueva Etapa al Plan</DialogTitle> {/* Changed "Bloque" to "Etapa" */}
            <DialogDescription>Añade una etapa a "{selectedPlan?.title}".</DialogDescription>
          </DialogHeader>
          {selectedPlan && (
            <AddBlockForm 
              planId={selectedPlan.id} 
              onSuccess={handleBlockAdded} 
              onCancel={() => setIsAddBlockDialogOpen(false)} 
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isAddExerciseDialogOpen} onOpenChange={setIsAddExerciseDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Añadir Nuevo Ejercicio a la Etapa</DialogTitle>
            <DialogDescription>
              Añade un ejercicio a la etapa "{blocks.find(b => b.id === currentBlockIdForExercise)?.title}" del plan "{selectedPlan?.title}".
            </DialogDescription>
          </DialogHeader>
          {selectedPlan && currentBlockIdForExercise && (
            <AddExerciseForm 
              planId={selectedPlan.id} 
              blockId={currentBlockIdForExercise} 
              onSuccess={handleExerciseAdded} 
              onCancel={() => {
                setIsAddExerciseDialogOpen(false);
                setCurrentBlockIdForExercise(null); // Clear current block ID on cancel
              }} 
            />
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default Dashboard;

    