
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
import { useRouter } from 'next/navigation'; // Added for router.push

import { createSession, addExerciseResult } from "@/services/session"; 
import { getHorses as fetchHorsesService } from "@/services/horse";
import { getTrainingPlans, getTrainingBlocks, getExercises } from "@/services/firestore";
import type { Horse, TrainingPlan, TrainingBlock, Exercise, ExerciseResult, SessionData as SessionServiceData } from "@/types/firestore"; 
 
 import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
 import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
 import { Label } from "@/components/ui/label";
 import { Input } from "@/components/ui/input"; 
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
import AddBlockForm from "./AddBlockForm";
import AddExerciseForm from "./AddExerciseForm";
import { Icons } from "./icons";

const Dashboard = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();  
  const router = useRouter(); // Initialized router
  const [isAddHorseDialogOpen, setIsAddHorseDialogOpen] = useState(false);
  const [horses, setHorses] = useState<Horse[]>([]);
  const [isLoadingHorses, setIsLoadingHorses] = useState(true);
  const [selectedHorse, setSelectedHorse] = useState<Horse | null>(null);
  
  const [trainingPlans, setTrainingPlans] = useState<TrainingPlan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<TrainingPlan | null>(null);
  
  const [blocks, setBlocks] = useState<TrainingBlock[]>([]);
  const [isLoadingBlocks, setIsLoadingBlocks] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<TrainingBlock | null>(null); // For session registration
  
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoadingExercises, setIsLoadingExercises] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null); // For session registration

  const [date, setDate] = useState<Date | undefined>(new Date());
  const [rating, setRating] = useState<number>(3); 

  // Dialog states for plan/block/exercise creation
  const [isCreatePlanDialogOpen, setIsCreatePlanDialogOpen] = useState(false);
  const [isAddBlockDialogOpen, setIsAddBlockDialogOpen] = useState(false);
  const [isAddExerciseDialogOpen, setIsAddExerciseDialogOpen] = useState(false);
  const [currentBlockIdForExercise, setCurrentBlockIdForExercise] = useState<string | null>(null);


  const performFetchHorses = useCallback(async (uid: string) => {
    setIsLoadingHorses(true);
    try {
      const userHorses = await fetchHorsesService(uid);
      setHorses(userHorses);
      if (userHorses.length > 0 && !selectedHorse) {
        // Do not auto-select, let user choose.
        // setSelectedHorse(userHorses[0]);
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
      setIsLoadingHorses(false); 
    }
  }, [currentUser?.uid, performFetchHorses]);


  const performFetchPlans = useCallback(async () => {
    setIsLoadingPlans(true);
    try {
      const plans = await getTrainingPlans();
      setTrainingPlans(plans);
      // Don't auto-select a plan initially, let user pick from dropdown
      // if (plans.length > 0 && !selectedPlan) setSelectedPlan(plans[0]);
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
      setBlocks([]);
      setSelectedBlock(null); // For session registration
      return;
    }
    setIsLoadingBlocks(true);
    try {
      const fetchedBlocks = await getTrainingBlocks(planId);
      setBlocks(fetchedBlocks);
      if (fetchedBlocks.length > 0 && !selectedBlock) {
        // setSelectedBlock(fetchedBlocks[0]); // Auto-select for session part
      } else if (fetchedBlocks.length === 0) {
        setSelectedBlock(null);
      }
    } catch (error) {
      console.error(`Error fetching blocks for plan ${planId}:`, error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los bloques para este plan." });
      setBlocks([]);
    } finally {
      setIsLoadingBlocks(false);
    }
  }, [toast, selectedBlock]); // selectedBlock for session part

  useEffect(() => {
    if (selectedPlan) {
      performFetchBlocks(selectedPlan.id);
    } else {
      setBlocks([]);
      setSelectedBlock(null); // For session registration
      setExercises([]); // Clear exercises if no plan selected
      setSelectedExercise(null); // For session registration
    }
  }, [selectedPlan, performFetchBlocks]);

  const performFetchExercises = useCallback(async (planId: string, blockId: string) => {
     if (!planId || !blockId) {
      setExercises([]);
      setSelectedExercise(null); // For session registration
      return;
    }
    setIsLoadingExercises(true);
    try { 
      const fetchedExercises = await getExercises(planId, blockId);
      setExercises(prevExercises => {
        // Filter out exercises from the current blockId before adding new ones
        const otherBlockExercises = prevExercises.filter(ex => ex.blockId !== blockId);
        return [...otherBlockExercises, ...fetchedExercises];
      });
      // Auto-select for session part (if needed, currently driven by dropdown)
      // if (fetchedExercises.length > 0 && !selectedExercise && selectedBlock?.id === blockId) {
      //   setSelectedExercise(fetchedExercises[0]);
      // }
    } catch (error) {
       console.error(`Error fetching exercises for plan ${planId} and block ${blockId}:`, error);
        toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los ejercicios para este bloque." });
        // Don't clear all exercises, only for this block perhaps, or handle error differently
    } finally {
      setIsLoadingExercises(false);
    }
  }, [toast]); // Removed selectedExercise, selectedBlock dependencies to avoid re-fetching unless plan/block changes

  // Fetch exercises when a block is expanded in the accordion (or all at once if preferred)
  // For now, fetching all exercises for the selectedPlan's blocks
   useEffect(() => {
    if (selectedPlan && blocks.length > 0) {
      setIsLoadingExercises(true);
      Promise.all(
        blocks.map(block => getExercises(selectedPlan.id, block.id))
      ).then(results => {
        setExercises(results.flat());
      }).catch(error => {
        console.error("Error fetching all exercises for plan:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar todos los ejercicios del plan."});
      }).finally(() => {
        setIsLoadingExercises(false);
      });
    } else {
      setExercises([]);
    }
  }, [selectedPlan, blocks, toast]);


  // Handlers for closing dialogs and refreshing data
  const handleHorseAdded = () => {
    setIsAddHorseDialogOpen(false);
    if (currentUser?.uid) performFetchHorses(currentUser.uid); 
  };
  const handleAddHorseCancel = () => setIsAddHorseDialogOpen(false);

  const handlePlanAdded = (newPlanId: string) => {
    setIsCreatePlanDialogOpen(false);
    performFetchPlans().then(() => {
      // Re-fetch plans and then find the new one to select it
      getTrainingPlans().then(refreshedPlans => {
        setTrainingPlans(refreshedPlans); // Update state with all plans
        const newPlan = refreshedPlans.find(p => p.id === newPlanId);
        if (newPlan) {
          setSelectedPlan(newPlan);
        } else if (refreshedPlans.length > 0) {
          // Fallback if new plan isn't immediately found or if ID was somehow wrong
          setSelectedPlan(refreshedPlans[0]);
        }
      });
    });
  };

  const handleBlockAdded = (newBlockId: string) => {
    setIsAddBlockDialogOpen(false);
    if (selectedPlan) performFetchBlocks(selectedPlan.id); // Refresh block list for current plan
  };

  const handleExerciseAdded = (newExerciseId: string) => {
    setIsAddExerciseDialogOpen(false);
    if (selectedPlan && currentBlockIdForExercise) {
      performFetchExercises(selectedPlan.id, currentBlockIdForExercise); // Refresh exercises for the specific block
    }
    setCurrentBlockIdForExercise(null);
  };
  
  const openAddExerciseDialog = (blockId: string) => {
    setCurrentBlockIdForExercise(blockId);
    setIsAddExerciseDialogOpen(true);
  };


  const handleSaveSession = async () => {
    if (!date || !selectedHorse || !selectedHorse.id || !selectedBlock || !selectedExercise) {
      toast({variant: "destructive", title: "Error de Validación", description:"Por favor, asegúrate de que la fecha, el caballo, el bloque y el ejercicio estén seleccionados."});
      return;
    }

    try {
      const sessionData: SessionServiceData = {
        date: Timestamp.fromDate(date),
        blockId: selectedBlock.id, 
        overallNote: "", 
      };

      const sessionId = await createSession(selectedHorse.id, sessionData);

      if (sessionId) {
        const exerciseResult: Omit<ExerciseResult, 'id'> = { // Using Omit type
          exerciseId: selectedExercise.id, 
          plannedReps: selectedExercise.suggestedReps ?? '', 
          doneReps: 0, 
          rating: rating,
          comment: "", 
        };
        await addExerciseResult(selectedHorse.id, sessionId, exerciseResult);
        toast({ title: "Sesión Guardada", description: "La sesión y el primer ejercicio han sido registrados." });
        router.push(`/session/${sessionId}`); // Changed to router.push
      } else {
        toast({ variant: "destructive", title: "Error", description: "No se pudo crear la sesión." });
      }
    } catch (error) {
      console.error("Error saving session:", error);
      let errorMessage = "Ocurrió un error al guardar la sesión.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast({ variant: "destructive", title: "Error al Guardar", description: errorMessage });
    }
  };


  return (
    <div className="container py-10">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">

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
                            {isLoadingBlocks ? <p>Cargando bloques...</p> : blocks.length > 0 ? (
                               <Accordion type="multiple" className="w-full">
                                {blocks.map((block) => (
                                  <AccordionItem value={block.id} key={block.id}>
                                    <AccordionTrigger>
                                      {block.title}
                                      {block.notes && <span className="text-sm text-muted-foreground ml-2">- {block.notes}</span>}
                                      {block.duration && <span className="text-sm text-muted-foreground ml-2">- Duración: {block.duration}</span>}
                                    </AccordionTrigger>
                                    <AccordionContent>
                                      {isLoadingExercises && !exercises.some(ex => ex.blockId === block.id) ? <p>Cargando ejercicios...</p> : exercises.filter(ex => ex.blockId === block.id).length > 0 ? (
                                        <ul className="list-disc pl-5 space-y-1 text-sm">
                                          {exercises
                                            .filter(ex => ex.blockId === block.id)
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
                                        <p className="text-sm text-muted-foreground">No hay ejercicios en este bloque.</p>
                                      )}
                                      <Button size="sm" variant="outline" className="mt-2" onClick={() => openAddExerciseDialog(block.id)}>
                                        <Icons.plus className="mr-2 h-4 w-4" /> Añadir Ejercicio a este Bloque
                                      </Button>
                                    </AccordionContent>
                                  </AccordionItem>
                                ))}
                              </Accordion>
                            ) : (
                              <p className="text-sm text-muted-foreground">Este plan no tiene bloques definidos.</p>
                            )}
                            <div className="flex flex-wrap justify-end mt-4 gap-2">
                                <Button onClick={() => setIsAddBlockDialogOpen(true)} disabled={!selectedPlan || isLoadingBlocks}>
                                    <Icons.plus className="mr-2 h-4 w-4" /> Añadir Bloque
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
                        <CardDescription>Para {selectedHorse.name}</CardDescription>
                      </CardHeader>
                      <CardContent className="grid gap-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="w-full justify-start" disabled={!selectedPlan || blocks.length === 0}>
                              {(selectedBlock && blocks.some(b => b.id === selectedBlock.id)) ? selectedBlock.title : "Seleccionar Bloque"}
                              <Icons.chevronDown className="ml-auto h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                            <DropdownMenuLabel>Bloques del Plan Actual</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {isLoadingBlocks ? (
                                <DropdownMenuItem disabled>Cargando bloques...</DropdownMenuItem>
                            ) : blocks.length > 0 ? (
                              blocks.map((block) => (
                                  <DropdownMenuItem key={block.id} onSelect={() => {
                                    setSelectedBlock(block);
                                    setSelectedExercise(null); // Reset exercise when block changes
                                  }}>
                                      {block.title}
                                      {block.notes && <span className="text-xs text-muted-foreground ml-1">({block.notes})</span>}
                                  </DropdownMenuItem>
                              ))
                              ) : (
                              <DropdownMenuItem disabled>No hay bloques en el plan seleccionado</DropdownMenuItem>
                              )}
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="w-full justify-start" disabled={!selectedBlock || isLoadingExercises}>
                              {(selectedExercise && exercises.some(e => e.id === selectedExercise.id && e.blockId === selectedBlock?.id)) ? selectedExercise.title : "Seleccionar Ejercicio"}
                              <Icons.chevronDown className="ml-auto h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                            <DropdownMenuLabel>Ejercicios del Bloque</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                             {isLoadingExercises && exercises.filter(ex => ex.blockId === selectedBlock?.id).length === 0 ? (
                                <DropdownMenuItem disabled>Cargando ejercicios...</DropdownMenuItem>
                            ) : exercises.filter(ex => ex.blockId === selectedBlock?.id).length > 0 ? (
                              exercises.filter(ex => ex.blockId === selectedBlock?.id).map((exercise) => (
                                  <DropdownMenuItem key={exercise.id} onSelect={() => setSelectedExercise(exercise)}>
                                      {exercise.title}
                                  </DropdownMenuItem>
                              ))
                              ) : (
                              <DropdownMenuItem disabled>No hay ejercicios en este bloque</DropdownMenuItem>
                              )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        
                        <div>
                          <Label className="text-sm font-medium">Repeticiones sugeridas: {selectedExercise?.suggestedReps ?? 'N/A'}</Label>
                        </div>
                        <div>
                          <Label htmlFor="rating-slider" className="text-sm font-medium">Calificación de la Sesión (1-5): {rating}</Label>
                          <Slider
                            id="rating-slider"
                            defaultValue={[3]}
                            min={1}
                            max={5}
                            step={1}
                            className="mt-2"
                            onValueChange={(value) => setRating(value[0])} 
                          />
                        </div>
                        <div className="flex justify-end mt-2">
                          <Button 
                            onClick={handleSaveSession}
                            disabled={!date || !selectedHorse || !selectedBlock || !selectedExercise}
                          >
                            Guardar Sesión
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
            <DialogTitle>Añadir Nuevo Bloque al Plan</DialogTitle>
            <DialogDescription>Añade un bloque a "{selectedPlan?.title}".</DialogDescription>
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
            <DialogTitle>Añadir Nuevo Ejercicio al Bloque</DialogTitle>
            <DialogDescription>
              Añade un ejercicio al bloque "{blocks.find(b => b.id === currentBlockIdForExercise)?.title}" del plan "{selectedPlan?.title}".
            </DialogDescription>
          </DialogHeader>
          {selectedPlan && currentBlockIdForExercise && (
            <AddExerciseForm 
              planId={selectedPlan.id} 
              blockId={currentBlockIdForExercise} 
              onSuccess={handleExerciseAdded} 
              onCancel={() => {
                setIsAddExerciseDialogOpen(false);
                setCurrentBlockIdForExercise(null);
              }} 
            />
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default Dashboard;
