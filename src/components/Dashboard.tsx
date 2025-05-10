
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
 import { Input } from "@/components/ui/input"; // Keep for other potential uses
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
import { Icons } from "./icons";

const Dashboard = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();  
  const [isAddHorseDialogOpen, setIsAddHorseDialogOpen] = useState(false);
  const [horses, setHorses] = useState<Horse[]>([]);
  const [isLoadingHorses, setIsLoadingHorses] = useState(true);
  const [selectedHorse, setSelectedHorse] = useState<Horse | null>(null);
  
  const [trainingPlans, setTrainingPlans] = useState<TrainingPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<TrainingPlan | null>(null);
  const [blocks, setBlocks] = useState<TrainingBlock[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<TrainingBlock | null>(null);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null); 

  const [date, setDate] = useState<Date | undefined>(new Date());
  const [rating, setRating] = useState<number>(3); 

  const performFetchHorses = useCallback(async (uid: string) => {
    setIsLoadingHorses(true);
    try {
      const userHorses = await fetchHorsesService(uid);
      setHorses(userHorses);
      if (userHorses.length > 0 && !selectedHorse) {
        // setSelectedHorse(userHorses[0]); // Auto-select first horse if none selected
      } else if (userHorses.length === 0) {
        setSelectedHorse(null); // No horses, clear selection
      }
    } catch (error) {
      console.error("Error fetching horses:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los caballos." });
      setHorses([]); 
    } finally {
      setIsLoadingHorses(false);
    }
  }, [toast, selectedHorse]); // Added selectedHorse to dependencies to re-evaluate selection

  useEffect(() => {
    if (currentUser?.uid) {
      performFetchHorses(currentUser.uid);
    } else {
      setHorses([]); 
      setIsLoadingHorses(false); 
    }
  }, [currentUser?.uid, performFetchHorses]);

  useEffect(() => {
    if (horses.length > 0) {
      if (!selectedHorse || !horses.some(h => h.id === selectedHorse.id)) {
         // Don't auto-select, let user choose or handle "no selection" state
         // setSelectedHorse(horses[0]); 
      } else {
        const updatedSelectedHorse = horses.find(h => h.id === selectedHorse.id);
        if (updatedSelectedHorse && JSON.stringify(updatedSelectedHorse) !== JSON.stringify(selectedHorse)) {
          setSelectedHorse(updatedSelectedHorse);
        }
      }
    } else {
      setSelectedHorse(null); 
    }
  }, [horses, selectedHorse]);

  const handleHorseAdded = () => {
    setIsAddHorseDialogOpen(false);
    if (currentUser?.uid) {
      performFetchHorses(currentUser.uid); 
    }
  };

  const handleAddHorseCancel = () => {
    setIsAddHorseDialogOpen(false);
  };

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const plans = await getTrainingPlans();
        setTrainingPlans(plans);
        if (plans.length > 0) {
          setSelectedPlan(plans[0]);
        }
      } catch (error) {
        console.error("Error fetching training plans:", error);
        toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los planes de entrenamiento." });
      }
    };
    fetchPlans();
  }, [toast]);

  useEffect(() => {
    const fetchBlocks = async () => {
      if (selectedPlan) {
        try {
          const fetchedBlocks = await getTrainingBlocks(selectedPlan.id);
          setBlocks(fetchedBlocks);
          if (fetchedBlocks.length > 0) {
            setSelectedBlock(fetchedBlocks[0]);
          } else {
            setSelectedBlock(null); 
            setExercises([]); // Clear exercises if no blocks
            setSelectedExercise(null);
          }
        } catch (error) {
          console.error(`Error fetching blocks for plan ${selectedPlan.id}:`, error);
          toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los bloques para este plan." });
          setBlocks([]); 
          setSelectedBlock(null);
        }
      } else {
        setBlocks([]); 
        setSelectedBlock(null);
      }
    };
    fetchBlocks();
  }, [selectedPlan, toast]);

   useEffect(() => {
    const fetchExercises = async () => {
      if (selectedPlan && selectedBlock) {
        try { 
          const fetchedExercises = await getExercises(selectedPlan.id, selectedBlock.id);
          setExercises(fetchedExercises);
           if (fetchedExercises.length > 0) {
            setSelectedExercise(fetchedExercises[0]);
          } else {
            setSelectedExercise(null); 
          }
        } catch (error) {
           console.error(`Error fetching exercises for plan ${selectedPlan.id} and block ${selectedBlock.id}:`, error);
            toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los ejercicios para este bloque." });
            setExercises([]); 
            setSelectedExercise(null);
        }
      } else {
        setExercises([]); 
        setSelectedExercise(null);
      }
    };
    fetchExercises();
  }, [selectedPlan, selectedBlock, toast]);

  const handleSaveSession = async () => {
    if (!date || !selectedHorse || !selectedHorse.id || !selectedBlock || !selectedExercise) {
      toast({variant: "destructive", title: "Error de Validación", description:"Por favor, asegúrate de que la fecha, el caballo, el bloque y el ejercicio estén seleccionados."});
      return;
    }

    try {
      const sessionData: SessionServiceData = {
        date: Timestamp.fromDate(date),
        blockId: selectedBlock.id, // Use selectedBlock.id (which should be TrainingBlock.id)
        overallNote: "", // Placeholder for now
      };

      const sessionId = await createSession(selectedHorse.id, sessionData);

      if (sessionId) {
        const exerciseResult: ExerciseResult = {
          exerciseId: selectedExercise.id, // Use selectedExercise.id (which should be Exercise.id)
          plannedReps: selectedExercise.suggestedReps?.toString() ?? '0', // Ensure it's a string
          doneReps: 0, // Placeholder
          rating: rating,
          comment: "", // Placeholder
        };
        await addExerciseResult(selectedHorse.id, sessionId, exerciseResult);
        toast({ title: "Sesión Guardada", description: "La sesión y el primer ejercicio han sido registrados." });
        // router.push(`/session/${sessionId}`); // Use Next.js router for navigation
        window.location.href = `/session/${sessionId}`; // Temporary redirect
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

        {/* Caballos y Detalles/Acciones */}
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
                        <CardTitle>Plan de Entrenamiento</CardTitle>
                        <CardDescription>Plan actual para {selectedHorse.name}.</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {trainingPlans.length > 0 && selectedPlan ? (
                           <Tabs defaultValue={selectedPlan.id} onValueChange={(planId) => setSelectedPlan(trainingPlans.find(p => p.id === planId) || null)}>
                            <TabsList className="mb-4">
                              {trainingPlans.map((plan) => (
                                <TabsTrigger key={plan.id} value={plan.id}>
                                  {plan.title}
                                </TabsTrigger>
                              ))}
                            </TabsList>
                            {blocks.length > 0 ? (
                               <Accordion type="multiple" collapsible className="w-full">
                                {blocks.map((block) => (
                                  <AccordionItem value={block.id} key={block.id}>
                                    <AccordionTrigger>{block.title}</AccordionTrigger>
                                    <AccordionContent>
                                      { exercises.filter(ex => ex.blockId === block.id).length > 0 ? (
                                        <ul className="list-disc pl-5 space-y-1">
                                          {exercises
                                            .filter(ex => ex.blockId === block.id)
                                            .map(exercise => (
                                              <li key={exercise.id}>{exercise.title} (Reps: {exercise.suggestedReps || 'N/A'})</li>
                                          ))}
                                        </ul>
                                      ) : (
                                        <p className="text-sm text-muted-foreground">No hay ejercicios en este bloque.</p>
                                      )}
                                    </AccordionContent>
                                  </AccordionItem>
                                ))}
                              </Accordion>
                            ) : (
                              <p className="text-sm text-muted-foreground">Este plan no tiene bloques definidos.</p>
                            )}
                          </Tabs>
                        ) : (
                          <p className="text-sm text-muted-foreground">No hay planes de entrenamiento disponibles.</p>
                        )}
                        <div className="flex justify-end mt-4 space-x-2">
                          <Button variant="outline">Editar Plan</Button>
                          <Button variant="outline">Clonar Plan</Button>
                          <Button>Añadir Ejercicio</Button>
                        </div>
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
                            <Button variant="outline" className="w-full justify-start">
                              {selectedBlock ? selectedBlock.title : "Seleccionar Bloque"}
                              <Icons.chevronDown className="ml-auto h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                            <DropdownMenuLabel>Bloques del Plan</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {blocks.length > 0 ? (
                              blocks.map((block) => (
                                  <DropdownMenuItem key={block.id} onSelect={() => setSelectedBlock(block)}>
                                      {block.title}
                                  </DropdownMenuItem>
                              ))
                              ) : (
                              <DropdownMenuItem disabled>No hay bloques disponibles</DropdownMenuItem>
                              )}
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="w-full justify-start" disabled={!selectedBlock}>
                              {selectedExercise ? selectedExercise.title : "Seleccionar Ejercicio"}
                              <Icons.chevronDown className="ml-auto h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                            <DropdownMenuLabel>Ejercicios del Bloque</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {exercises.filter(ex => ex.blockId === selectedBlock?.id).length > 0 ? (
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
                <Icons.logo className="w-16 h-16 mb-4 text-muted-foreground" /> 
                <p className="text-muted-foreground">Selecciona un caballo para ver sus detalles o registra uno nuevo usando el menú desplegable de arriba.</p>
              </CardContent>
            </Card>
          )}
        </div>
        
        {/* Calendar Card */}
        <Card className="col-span-1 md:col-span-1"> {/* Adjusted to take full column on md */}
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

      {/* Add Horse Dialog */}
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
    </div>
  );
};

export default Dashboard;

    