
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
import { getTrainingPlans, getTrainingBlocks, getExercises, getExercise, debugGetBlocksForPlan } from "@/services/firestore";
import type { Horse, TrainingPlan, TrainingBlock, Exercise, ExerciseResult, SessionDataInput, ExerciseResultInput, SessionData, Observation, ObservationInput } from "@/types/firestore";
import { addObservation, getObservationsByHorseId } from "@/services/observation";
import HorseHistory from "@/components/HorseHistory"; 

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
import AddBlockForm from "./AddBlockForm";
import AddExerciseForm from "./AddExerciseForm";
import { Icons } from "./icons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


const TENSION_STATUS_OPTIONS = [
  { value: '🟢', label: '🟢 Relajado' },
  { value: '🟡', label: '🟡 Neutral/Tenso' },
  { value: '🔴', label: '🔴 Muy Tenso/Dolor' },
  { value: 'N/A', label: 'N/A (No aplica)' },
];

const OBSERVATION_ZONES = [
  { id: 'ears', label: 'Orejas' },
  { id: 'eyes', label: 'Ojos' },
  { id: 'neck', label: 'Cuello' },
  { id: 'withers', label: 'Cruz' },
  { id: 'back', label: 'Dorso' },
  { id: 'loins', label: 'Riñones' },
  { id: 'croup', label: 'Grupa' },
  { id: 'legs', label: 'Patas/Manos' },
  { id: 'hooves', label: 'Cascos' },
] as const;


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

  const [blocks, setBlocks] = useState<TrainingBlock[]>([]);
  const [isLoadingBlocks, setIsLoadingBlocks] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<TrainingBlock | null>(null);

  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoadingExercises, setIsLoadingExercises] = useState(false);

  const [date, setDate] = useState<Date | undefined>(new Date());

  const [sessionOverallNote, setSessionOverallNote] = useState("");
  const [sessionExerciseResults, setSessionExerciseResults] = useState<Map<string, Omit<ExerciseResultInput, 'exerciseId' | 'observations'>>>(new Map());
  const [isSavingSession, setIsSavingSession] = useState(false);

  const [observationData, setObservationData] = useState<Partial<ObservationInput>>({});
  const [isSavingObservation, setIsSavingObservation] = useState(false);
  const [horseObservations, setHorseObservations] = useState<Observation[]>([]);
  const [isLoadingObservations, setIsLoadingObservations] = useState(false);


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
        // setSelectedHorse(userHorses[0]); // Auto-select first horse removed
      } else if (userHorses.length === 0) {
        setSelectedHorse(null);
      }
    } catch (error) {
      console.error("[Dashboard] Error fetching horses:", error);
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
      console.log("[Dashboard] Training plans fetched:", JSON.parse(JSON.stringify(plans)));
    } catch (error) {
      console.error("[Dashboard] Error fetching training plans:", error);
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
      setSelectedBlock(null);
      return;
    }
    setIsLoadingBlocks(true);
    setExercises([]); // Clear exercises when blocks are about to be fetched for a new plan
    try {
      console.log(`[Dashboard] Calling getTrainingBlocks for planId: ${planId}`);
      const fetchedBlocks = await getTrainingBlocks(planId);
      console.log(`[Dashboard] Blocks fetched by getTrainingBlocks for planId ${planId}:`, JSON.parse(JSON.stringify(fetchedBlocks)));
      setBlocks(fetchedBlocks);
      if (fetchedBlocks.length === 0) {
        setSelectedBlock(null);
        console.log(`[Dashboard] No blocks were found for planId ${planId} by getTrainingBlocks. Setting selectedBlock to null.`);
      } else {
        console.log(`[Dashboard] ${fetchedBlocks.length} blocks found for planId ${planId}.`);
      }
    } catch (error) {
      console.error(`[Dashboard] Error fetching blocks for plan ${planId}:`, error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar las etapas para este plan." });
      setBlocks([]);
    } finally {
      setIsLoadingBlocks(false);
    }
  }, [toast]);

  const performFetchExercisesForPlan = useCallback(async (planId: string, currentPlanBlocks: TrainingBlock[]) => {
    console.log(`[Dashboard] performFetchExercisesForPlan called for planId: ${planId}`);
    if (!planId) {
        setExercises([]);
        console.log(`[Dashboard] No planId provided for exercise fetch. Clearing exercises.`);
        return;
    }
    if (currentPlanBlocks.length === 0) {
        setExercises([]);
        console.log(`[Dashboard] No blocks provided for planId ${planId} during exercise fetch. Clearing exercises.`);
        return;
    }

    setIsLoadingExercises(true);
    console.log(`[Dashboard] Starting to fetch exercises for plan: ${planId} using ${currentPlanBlocks.length} blocks.`);
    try {
      let allExercisesForPlan: Exercise[] = [];
      for (const block of currentPlanBlocks) {
        console.log(`[Dashboard] Processing block for exercises: planId "${planId}", blockId: "${block.id}" (Etapa: "${block.title}")`);
        const blockExercises = await getExercises(planId, block.id);
        console.log(`[Dashboard] ---> Found ${blockExercises.length} exercises for blockId: "${block.id}" (Etapa: "${block.title}")`);
        if (blockExercises.length > 0) {
          console.log(`[Dashboard]      Exercises found:`, JSON.parse(JSON.stringify(blockExercises.map(e => ({ title: e.title, id: e.id, planId: e.planId, blockId: e.blockId, order: e.order })))));
        }
        allExercisesForPlan = [...allExercisesForPlan, ...blockExercises];
      }
      setExercises(allExercisesForPlan);
      console.log(`[Dashboard] Total exercises set for plan ${planId}: ${allExercisesForPlan.length}. If this is 0, check individual block/exercise fetches above.`);
    } catch (error) {
      console.error(`[Dashboard] Error fetching all exercises for plan ${planId}:`, error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar todos los ejercicios del plan." });
      setExercises([]);
    } finally {
      setIsLoadingExercises(false);
    }
  }, [toast]);

  useEffect(() => {
    if (selectedPlan) {
      performFetchBlocks(selectedPlan.id);
    } else {
      setBlocks([]);
      setSelectedBlock(null);
      setExercises([]);
    }
  }, [selectedPlan, performFetchBlocks]);

  useEffect(() => {
    if (selectedPlan && !isLoadingBlocks) { // Only run if selectedPlan is set and blocks are done loading
      if (blocks.length > 0) {
        console.log(`[Dashboard] useEffect[selectedPlan, blocks, isLoadingBlocks] - Fetching exercises for plan ${selectedPlan.id} as blocks are loaded.`);
        performFetchExercisesForPlan(selectedPlan.id, blocks);
      } else {
        console.log(`[Dashboard] useEffect[selectedPlan, blocks, isLoadingBlocks] - Plan ${selectedPlan.id} selected, blocks loaded, but no blocks found. Clearing exercises.`);
        setExercises([]); // Clear exercises if no blocks were found for the selected plan
      }
    }
  }, [selectedPlan, blocks, isLoadingBlocks, performFetchExercisesForPlan]);


  const performFetchObservations = useCallback(async (horseId: string) => {
    if (!horseId) {
      setHorseObservations([]);
      return;
    }
    setIsLoadingObservations(true);
    try {
      const observations = await getObservationsByHorseId(horseId);
      setHorseObservations(observations);
    } catch (error) {
      console.error(`[Dashboard] Error fetching observations for horse ${horseId}:`, error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar las observaciones." });
      setHorseObservations([]);
    } finally {
      setIsLoadingObservations(false);
    }
  }, [toast]);

  useEffect(() => {
    if (selectedHorse) {
      performFetchObservations(selectedHorse.id);
    } else {
      setHorseObservations([]);
    }
  }, [selectedHorse, performFetchObservations]);


  const handleHorseAdded = () => {
    setIsAddHorseDialogOpen(false);
    if (currentUser?.uid) performFetchHorses(currentUser.uid);
  };
  const handleAddHorseCancel = () => setIsAddHorseDialogOpen(false);

  const handlePlanAdded = (newPlanId: string) => {
    setIsCreatePlanDialogOpen(false);
    performFetchPlans().then(() => { 
      getTrainingPlans().then(refreshedPlans => { 
        setTrainingPlans(refreshedPlans);
        const newPlan = refreshedPlans.find(p => p.id === newPlanId);
        if (newPlan) {
          setSelectedPlan(newPlan); 
          console.log('[Dashboard] New plan added and selected:', JSON.parse(JSON.stringify(newPlan)));
        }
      });
    });
  };

  const handleBlockAdded = (newBlockId: string) => {
    setIsAddBlockDialogOpen(false);
    if (selectedPlan) {
      performFetchBlocks(selectedPlan.id); 
    }
  };

  const handleExerciseAdded = (newExerciseId: string) => {
    setIsAddExerciseDialogOpen(false);
    if (selectedPlan && currentBlockIdForExercise && blocks.length > 0) {
      performFetchExercisesForPlan(selectedPlan.id, blocks);
    }
    setCurrentBlockIdForExercise(null); 
  };

  const openAddExerciseDialog = (blockId: string) => {
    setCurrentBlockIdForExercise(blockId);
    setIsAddExerciseDialogOpen(true);
  };


  const handleSessionExerciseInputChange = (exerciseId: string, field: keyof Omit<ExerciseResultInput, 'exerciseId' | 'observations'>, value: string | number) => {
    setSessionExerciseResults(prev => {
        const newMap = new Map(prev);
        const currentExercise = newMap.get(exerciseId) || { doneReps: 0, rating: 3, comment: "", plannedReps: "" };

        if (field === 'doneReps' || field === 'rating') {
            (currentExercise as any)[field] = Number(value);
        } else {
            (currentExercise as any)[field] = String(value);
        }
        newMap.set(exerciseId, currentExercise);
        return newMap;
    });
  };

const handleSaveSessionAndNavigate = async () => {
    if (!currentUser || !date || !selectedHorse || !selectedHorse.id ) {
      toast({
        variant: "destructive",
        title: "Error de Validación",
        description: "Por favor, asegúrate de que la fecha y el caballo estén seleccionados.",
      });
      return;
    }
     if (!selectedPlan) {
        toast({
            variant: "destructive",
            title: "Error de Validación",
            description: "Por favor, selecciona un plan de entrenamiento.",
        });
        return;
    }
    if (!selectedBlock || !selectedBlock.id) {
        toast({
            variant: "destructive",
            title: "Error de Validación",
            description: "Por favor, selecciona una etapa.",
        });
        return;
    }


    const exercisesInSelectedBlock = exercises.filter(ex => ex.blockId === selectedBlock?.id && selectedPlan && ex.planId === selectedPlan.id);
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
        blockId: selectedBlock.id, 
        overallNote: sessionOverallNote,
      };

      const sessionId = await createSession(sessionInput);

      if (sessionId) {
        const exerciseResultsToSave: ExerciseResultInput[] = [];

        exercisesInSelectedBlock.forEach(exercise => {
            const resultData = sessionExerciseResults.get(exercise.id);
            const plannedRepsValue = resultData?.plannedReps ?? exercise?.suggestedReps ?? '';
            const doneRepsValue = resultData?.doneReps ?? 0;

            exerciseResultsToSave.push({
                exerciseId: exercise.id,
                plannedReps: String(plannedRepsValue), 
                doneReps: Number(doneRepsValue),       
                rating: resultData?.rating ?? 3, 
                comment: resultData?.comment ?? "",
            });
        });


        if (exerciseResultsToSave.length > 0) {
             for (const resultInput of exerciseResultsToSave) {
                await addExerciseResult(selectedHorse.id, sessionId, resultInput);
            }
        }

        toast({ title: "Sesión Guardada", description: "La sesión y los resultados de los ejercicios han sido registrados." });
        setSessionOverallNote("");
        setSessionExerciseResults(new Map());

        router.push(`/session/${sessionId}?horseId=${selectedHorse.id}`);
      } else {
        toast({ variant: "destructive", title: "Error", description: "No se pudo crear la sesión." });
      }
    } catch (error) {
      console.error("[Dashboard] Error saving session:", error);
      let errorMessage = "Ocurrió un error al guardar la sesión.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast({ variant: "destructive", title: "Error al Guardar", description: errorMessage });
    } finally {
      setIsSavingSession(false);
    }
  };

  const handleObservationInputChange = (field: typeof OBSERVATION_ZONES[number]['id'] | 'overallBehavior' | 'additionalNotes' | 'photoUrl', value: string) => {
    setObservationData(prev => ({ ...prev, [field]: value }));
  };


  const handleSaveObservation = async () => {
    if (!currentUser || !date || !selectedHorse || !selectedHorse.id) {
      toast({
        variant: "destructive",
        title: "Error de Validación",
        description: "Por favor, asegúrate de que la fecha y el caballo estén seleccionados.",
      });
      return;
    }

    setIsSavingObservation(true);
    try {
      const fullObservationData: ObservationInput = {
        date: Timestamp.fromDate(date),
        ears: observationData.ears === '' ? null : observationData.ears ?? null,
        eyes: observationData.eyes === '' ? null : observationData.eyes ?? null,
        neck: observationData.neck === '' ? null : observationData.neck ?? null,
        withers: observationData.withers === '' ? null : observationData.withers ?? null,
        back: observationData.back === '' ? null : observationData.back ?? null,
        loins: observationData.loins === '' ? null : observationData.loins ?? null,
        croup: observationData.croup === '' ? null : observationData.croup ?? null,
        legs: observationData.legs === '' ? null : observationData.legs ?? null,
        hooves: observationData.hooves === '' ? null : observationData.hooves ?? null,
        overallBehavior: observationData.overallBehavior === '' ? null : observationData.overallBehavior ?? null,
        additionalNotes: observationData.additionalNotes === '' ? null : observationData.additionalNotes ?? null,
        photoUrl: observationData.photoUrl === '' ? null : observationData.photoUrl ?? null,
      };

      await addObservation(selectedHorse.id, fullObservationData);
      toast({ title: "Observación Guardada", description: "La observación ha sido registrada exitosamente." });
      setObservationData({}); 
      if (selectedHorse) performFetchObservations(selectedHorse.id); 
    } catch (error) {
      console.error("[Dashboard] Error saving observation:", error);
      let errorMessage = "Ocurrió un error al guardar la observación.";
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      toast({ variant: "destructive", title: "Error al Guardar", description: errorMessage });
    } finally {
      setIsSavingObservation(false);
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
                   <TabsList className="grid w-full grid-cols-4"> 
                    <TabsTrigger value="plan">Plan</TabsTrigger>
                    <TabsTrigger value="sesiones">Sesiones</TabsTrigger>
                    <TabsTrigger value="observaciones">Observaciones</TabsTrigger>
                    <TabsTrigger value="historial">Historial</TabsTrigger> 
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
                                        onSelect={() => {
                                            console.log('[Dashboard] Plan selected in UI:', JSON.parse(JSON.stringify(plan)));
                                            setSelectedPlan(plan);
                                        }}
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
                                {blocks.map((block) => ( 
                                  <AccordionItem value={block.id} key={block.id}>
                                    <AccordionTrigger>
                                      {block.title}
                                      {block.notes && <span className="text-sm text-muted-foreground ml-2">- {block.notes}</span>}
                                      {block.duration && <span className="text-sm text-muted-foreground ml-2">- Duración: {block.duration}</span>}
                                    </AccordionTrigger>
                                    <AccordionContent>
                                      {block.goal && (
                                        <p className="text-sm text-primary font-semibold mb-2">
                                          Meta: <span className="font-normal text-muted-foreground">{block.goal}</span>
                                        </p>
                                      )}
                                     {isLoadingExercises ? (
                                        <p>Cargando ejercicios...</p>
                                      ) : exercises.filter(ex => ex.blockId === block.id && selectedPlan && ex.planId === selectedPlan.id).length > 0 ? (
                                        <ul className="list-disc pl-5 space-y-1 text-sm">
                                          {exercises
                                            .filter(ex => ex.blockId === block.id && selectedPlan && ex.planId === selectedPlan.id)
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
                                        <p className="text-sm text-muted-foreground">
                                            No se encontraron ejercicios para la etapa "{block.title}" (ID: {block.id}) en el plan "{selectedPlan?.title}" (ID: {selectedPlan?.id}).
                                            Verifica que los ejercicios en Firestore tengan el `planId` y `blockId` correctos.
                                        </p>
                                      )}
                                      <Button size="sm" variant="outline" className="mt-2" onClick={() => openAddExerciseDialog(block.id)}>
                                        <Icons.plus className="mr-2 h-4 w-4" /> Añadir Ejercicio a esta Etapa
                                      </Button>
                                    </AccordionContent>
                                  </AccordionItem>
                                ))}
                              </Accordion>
                            ) : (
                              <p className="text-sm text-muted-foreground">Este plan no tiene etapas definidas. (Plan ID: {selectedPlan.id})</p>
                            )}
                            <div className="flex flex-wrap justify-end mt-4 gap-2">
                                <Button onClick={() => setIsAddBlockDialogOpen(true)} disabled={!selectedPlan || isLoadingBlocks}>
                                    <Icons.plus className="mr-2 h-4 w-4" /> Añadir Etapa
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
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="w-full justify-start" disabled={!selectedPlan || blocks.length === 0}>
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
                              blocks.map((block) => ( 
                                  <DropdownMenuItem key={block.id} onSelect={() => {
                                    setSelectedBlock(block); 
                                    setSessionExerciseResults(new Map());
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

                            {isLoadingExercises && exercises.filter(ex => ex.blockId === selectedBlock.id && selectedPlan && ex.planId === selectedPlan.id).length === 0 ? (
                                <p>Cargando ejercicios...</p>
                            ) : exercises.filter(ex => ex.blockId === selectedBlock.id && selectedPlan && ex.planId === selectedPlan.id).length > 0 ? (
                                exercises.filter(ex => ex.blockId === selectedBlock.id && selectedPlan && ex.planId === selectedPlan.id).map(exercise => {
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
                                                        value={currentResult.plannedReps ?? ''}
                                                        onChange={(e) => handleSessionExerciseInputChange(exercise.id, 'plannedReps', e.target.value)}
                                                    />
                                                </div>
                                                <div>
                                                    <Label htmlFor={`doneReps-${exercise.id}`}>Repeticiones Realizadas</Label>
                                                    <Input
                                                        id={`doneReps-${exercise.id}`}
                                                        type="number"
                                                        placeholder="Ej: 8"
                                                        value={String(currentResult.doneReps)}
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
                            disabled={isSavingSession || !date || !selectedHorse || !selectedBlock || (selectedBlock && selectedPlan && exercises.filter(ex => ex.blockId === selectedBlock.id && ex.planId === selectedPlan.id).length === 0) }
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
                      <CardTitle>Registrar Observación de Tensión</CardTitle>
                      <CardDescription>
                        Para {selectedHorse.name} en {date ? date.toLocaleDateString("es-ES") : 'fecha no seleccionada'}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {OBSERVATION_ZONES.map(zone => (
                          <div key={zone.id} className="space-y-1">
                            <Label htmlFor={`obs-${zone.id}`}>{zone.label}</Label>
                            <Select
                              value={observationData[zone.id] || ''}
                              onValueChange={(value) => handleObservationInputChange(zone.id, value)}
                            >
                              <SelectTrigger id={`obs-${zone.id}`}>
                                <SelectValue placeholder={`Estado de ${zone.label.toLowerCase()}`} />
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

                      <div className="space-y-1">
                        <Label htmlFor="obs-overallBehavior">Comportamiento General</Label>
                        <Textarea
                          id="obs-overallBehavior"
                          placeholder="Describe el comportamiento general del caballo..."
                          value={observationData.overallBehavior || ''}
                          onChange={(e) => handleObservationInputChange('overallBehavior', e.target.value)}
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="obs-additionalNotes">Notas Adicionales</Label>
                        <Textarea
                          id="obs-additionalNotes"
                          placeholder="Añade cualquier otra observación relevante..."
                          value={observationData.additionalNotes || ''}
                          onChange={(e) => handleObservationInputChange('additionalNotes', e.target.value)}
                        />
                      </div>

                      <Button variant="outline" disabled>Añadir Foto (próximamente)</Button>

                      <div className="flex justify-end mt-2">
                        <Button onClick={handleSaveObservation} disabled={isSavingObservation || !selectedHorse || !date}>
                          {isSavingObservation && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                          Guardar Observación
                        </Button>
                      </div>

                      {isLoadingObservations && <p>Cargando observaciones anteriores...</p>}
                      {!isLoadingObservations && horseObservations.length > 0 && (
                        <div className="mt-6 space-y-4">
                          <h4 className="text-md font-semibold">Observaciones Anteriores:</h4>
                          {horseObservations.slice(0, 3).map(obs => (
                            <Card key={obs.id} className="p-3 text-sm">
                              <p className="font-medium">{obs.date.toDate().toLocaleDateString("es-ES")}</p>
                              <ul className="list-disc list-inside text-muted-foreground">
                                {OBSERVATION_ZONES.map(zone => {
                                   const status = obs[zone.id as keyof Observation];
                                   return status ? <li key={zone.id}>{zone.label}: {status}</li> : null;
                                })}
                                {obs.overallBehavior && <li>Comportamiento: {obs.overallBehavior}</li>}
                                {obs.additionalNotes && <li>Notas: {obs.additionalNotes}</li>}
                              </ul>
                            </Card>
                          ))}
                        </div>
                      )}

                    </CardContent>
                  </Card>
                  </TabsContent>
                   <TabsContent value="historial">
                     <HorseHistory />
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
            <DialogTitle>Añadir Nueva Etapa al Plan</DialogTitle>
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


    