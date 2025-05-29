
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
import { useState, useEffect, useCallback, ReactNode } from "react";
import type { User } from 'firebase/auth';
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';

import { createSession, addExerciseResult, getSession, getExerciseResults, updateExerciseResult } from "@/services/session";
import { getHorses as fetchHorsesService, getHorseById } from "@/services/horse";
import { getTrainingPlans, getTrainingBlocks, getExercises, getExercise, debugGetBlocksForPlan, getBlockById, deleteTrainingPlan, updateExercisesOrder, deleteTrainingBlock, updateTrainingBlock, deleteExercise, updateExercise, updateBlocksOrder } from "@/services/firestore";
import type { Horse, TrainingPlan, TrainingBlock, Exercise, ExerciseResult, SessionDataInput, ExerciseResultInput, SessionData, ExerciseResultObservations } from "@/types/firestore";
import HorseHistory from "./HorseHistory";

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
import AddHorseForm from "./AddHorseForm";
import AddPlanForm from "./AddPlanForm";
import AddBlockForm from "./AddBlockForm";
import AddExerciseForm from "./AddExerciseForm";
import EditBlockForm from "./EditBlockForm";
import EditExerciseForm from "./EditExerciseForm";
import { Icons } from "./icons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  UniqueIdentifier,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';


const TENSION_STATUS_OPTIONS = [
  { value: '🟢', label: '🟢 Relajado' },
  { value: '🟡', label: '🟡 Neutral/Tenso' },
  { value: '🔴', label: '🔴 Muy Tenso/Dolor' },
  { value: 'N/A', label: 'N/A (No aplica)' },
];

const OBSERVATION_ZONES = [
  { id: 'ollaries', label: 'Ollares' },
  { id: 'labios', label: 'Labios' },
  { id: 'orejas', label: 'Orejas' },
  { id: 'ojos', label: 'Ojos' },
  { id: 'cuello', label: 'Cuello' },
  { id: 'dorso', label: 'Dorso' },
  { id: 'grupa', label: 'Grupa' },
  { id: 'miembros', label: 'Miembros' },
  { id: 'cola', label: 'Cola' },
] as const;


type SessionExerciseResultState = Omit<ExerciseResultInput, 'exerciseId' | 'observations'> & {
    observations: Omit<ExerciseResultObservations, 'comment'>;
};


interface SortableExerciseItemProps {
  exercise: Exercise;
  onEdit: (exercise: Exercise) => void;
}

function SortableExerciseItem({ exercise, onEdit }: SortableExerciseItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: exercise.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex items-center justify-between group p-2 rounded-md hover:bg-accent/50 bg-card border mb-1"
    >
      <div>
        <span className="font-medium">{exercise.title}</span>
        {exercise.suggestedReps && ` (Reps: ${exercise.suggestedReps})`}
        {exercise.description && <p className="text-xs text-muted-foreground pl-2">- Desc: {exercise.description}</p>}
        {exercise.objective && <p className="text-xs text-muted-foreground pl-2">- Obj: {exercise.objective}</p>}
      </div>
       <Button
        asChild
        variant="ghost"
        size="icon"
        className="ml-2 h-7 w-7 opacity-0 group-hover:opacity-100 flex-shrink-0"
        onClick={(e) => {
            e.stopPropagation();
            onEdit(exercise);
        }}
       >
        <span>
            <Icons.edit className="h-4 w-4" />
            <span className="sr-only">Editar Ejercicio</span>
        </span>
      </Button>
    </li>
  );
}

interface SortableBlockAccordionItemProps {
  block: TrainingBlock;
  children: ReactNode;
  onEditBlock: (block: TrainingBlock) => void;
}

function SortableBlockAccordionItem({ block, children, onEditBlock }: SortableBlockAccordionItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <AccordionItem
      value={block.id}
      ref={setNodeRef}
      style={style}
      className="bg-card border mb-1 rounded-md shadow-sm"
    >
       <div className="flex items-center justify-between w-full group text-left">
        <AccordionTrigger {...attributes} {...listeners} className="flex-grow p-4 hover:no-underline">
            <span className="flex-grow">
              {block.title}
              {block.notes && <span className="block sm:inline text-xs text-muted-foreground ml-0 sm:ml-2">- {block.notes}</span>}
              {block.duration && <span className="block sm:inline text-xs text-muted-foreground ml-0 sm:ml-2">- Duración: {block.duration}</span>}
              {block.goal && <span className="block sm:inline text-xs text-muted-foreground ml-0 sm:ml-2">- Meta: {block.goal}</span>}
            </span>
        </AccordionTrigger>
        <Button
            asChild
            variant="ghost"
            size="icon"
            className="ml-2 mr-2 h-7 w-7 flex-shrink-0 opacity-0 group-hover:opacity-100"
            onClick={(e) => {
                e.stopPropagation();
                onEditBlock(block);
            }}
        >
            <span>
            <Icons.edit className="h-4 w-4" />
            <span className="sr-only">Editar Etapa</span>
            </span>
        </Button>
      </div>
      {children}
    </AccordionItem>
  );
}


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
  const [sessionExerciseResults, setSessionExerciseResults] = useState<Map<string, SessionExerciseResultState>>(new Map());
  const [isSavingSession, setIsSavingSession] = useState(false);


  const [isCreatePlanDialogOpen, setIsCreatePlanDialogOpen] = useState(false);
  const [isAddBlockDialogOpen, setIsAddBlockDialogOpen] = useState(false);
  const [isAddExerciseDialogOpen, setIsAddExerciseDialogOpen] = useState(false);
  const [currentBlockIdForExercise, setCurrentBlockIdForExercise] = useState<string | null>(null);

  const [isEditBlockDialogOpen, setIsEditBlockDialogOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<TrainingBlock | null>(null);
  const [isEditExerciseDialogOpen, setIsEditExerciseDialogOpen] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [isDeletePlanDialogOpen, setIsDeletePlanDialogOpen] = useState(false);
  const [isDeletingPlan, setIsDeletingPlan] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
      setExercises([]);
      console.log("[Dashboard] performFetchBlocks: No planId provided. Cleared blocks and exercises.");
      return;
    }
    setIsLoadingBlocks(true);
    setExercises([]);
    try {
      console.log(`[Dashboard] performFetchBlocks: Attempting to fetch trainingBlocks with planId: "${planId}"`);
      const fetchedBlocks = await getTrainingBlocks(planId);
      console.log(`[Dashboard] Blocks fetched by getTrainingBlocks for planId ${planId}:`, JSON.parse(JSON.stringify(fetchedBlocks.map(b => ({id: b.id, title: b.title, planId: b.planId, order: b.order})))));


      // const sortedBlocks = fetchedBlocks.sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity)); // Already sorted by service
      setBlocks(fetchedBlocks); // Assuming getTrainingBlocks returns them sorted
      console.log('[Dashboard] Blocks received and set in state:', JSON.parse(JSON.stringify(fetchedBlocks.map(b => ({id: b.id, title: b.title, order: b.order})))));


      if (fetchedBlocks.length === 0) {
        setSelectedBlock(null);
        console.log(`[Dashboard] No blocks were found for planId ${planId}. Setting selectedBlock to null.`);
      } else {
        console.log(`[Dashboard] ${fetchedBlocks.length} blocks found for planId ${planId}.`);

        performFetchExercisesForPlan(planId, fetchedBlocks);
      }
    } catch (error) {
      console.error(`[Dashboard] Error fetching blocks for plan ${planId}:`, error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar las etapas para este plan." });
      setBlocks([]);
      setSelectedBlock(null);
    } finally {
      setIsLoadingBlocks(false);
    }
  }, [toast, performFetchExercisesForPlan]);


  const performFetchExercisesForPlan = useCallback(async (planId: string, currentPlanBlocks: TrainingBlock[]) => {
    console.log(`[Dashboard] performFetchExercisesForPlan called for planId: ${planId} with ${currentPlanBlocks.length} blocks.`);
    if (!planId || currentPlanBlocks.length === 0) {
        setExercises([]);
        console.log(`[Dashboard] No planId or no blocks provided for exercise fetch. Clearing exercises for plan ${planId}.`);
        return;
    }
    setIsLoadingExercises(true);
    try {
      let allExercisesForPlan: Exercise[] = [];
      console.log(`[Dashboard] Plan blocks for exercise fetch (planId ${planId}):`, JSON.parse(JSON.stringify(currentPlanBlocks.map(b => ({id: b.id, title: b.title, order: b.order})))));
      for (const block of currentPlanBlocks) {
        console.log(`[Dashboard] Processing block for exercises: planId "${planId}", blockId: "${block.id}" (Etapa: "${block.title}")`);
        const blockExercises = await getExercises(planId, block.id); // Already sorted by service
        console.log(`[Dashboard] ---> Found ${blockExercises.length} exercises for blockId: "${block.id}" (Etapa: "${block.title}")`);
        if (blockExercises.length > 0) {
          console.log(`[Dashboard]      Exercises found:`, JSON.parse(JSON.stringify(blockExercises.map(e => ({ title: e.title, id: e.id, planId: e.planId, blockId: e.blockId, order: e.order })))));
        }
        allExercisesForPlan = [...allExercisesForPlan, ...blockExercises];
      }

      // Sort all exercises based on block order first, then exercise order within block
      const sortedAllExercises = allExercisesForPlan.sort((a, b) => {
        const blockAOrder = currentPlanBlocks.find(bl => bl.id === a.blockId)?.order ?? Infinity;
        const blockBOrder = currentPlanBlocks.find(bl => bl.id === b.blockId)?.order ?? Infinity;
        if (blockAOrder !== blockBOrder) {
          return blockAOrder - blockBOrder;
        }
        return (a.order ?? Infinity) - (b.order ?? Infinity);
      });
      setExercises(sortedAllExercises);
      console.log(`[Dashboard] Total exercises set for plan ${planId}: ${sortedAllExercises.length}.`);
    } catch (error) {
      console.error(`[Dashboard] Error fetching all exercises for plan ${planId}:`, error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar todos los ejercicios del plan." });
      setExercises([]);
    } finally {
      setIsLoadingExercises(false);
    }
  }, [toast]);


 useEffect(() => {
    if (selectedPlan?.id) {
      console.log(`[Dashboard] useEffect[selectedPlan]: Plan selected, ID: ${selectedPlan.id}. Fetching blocks.`);
      performFetchBlocks(selectedPlan.id);
    } else {
      console.log("[Dashboard] useEffect[selectedPlan]: No plan selected. Clearing blocks, selectedBlock, and exercises.");
      setBlocks([]);
      setSelectedBlock(null);
      setExercises([]);
    }
  }, [selectedPlan, performFetchBlocks]);


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

  const handlePlanDeleted = () => {
    setIsDeletePlanDialogOpen(false);
    setSelectedPlan(null);
    setBlocks([]);
    setExercises([]);
    performFetchPlans();
  };

  const handleDeleteSelectedPlan = async () => {
    if (!selectedPlan) return;
    setIsDeletingPlan(true);
    try {
      await deleteTrainingPlan(selectedPlan.id);
      toast({
        title: "Plan Eliminado",
        description: `El plan "${selectedPlan.title}" y todo su contenido han sido eliminados.`,
      });
      handlePlanDeleted();
    } catch (error) {
      console.error("Error deleting plan:", error);
      toast({
        variant: "destructive",
        title: "Error al Eliminar Plan",
        description: "Ocurrió un error al eliminar el plan.",
      });
    } finally {
      setIsDeletingPlan(false);
      setIsDeletePlanDialogOpen(false);
    }
  };


  const handleBlockAdded = () => {
    setIsAddBlockDialogOpen(false);
    if (selectedPlan) {
      performFetchBlocks(selectedPlan.id);
    }
  };

  const handleBlockUpdated = () => {
    setIsEditBlockDialogOpen(false);
    setEditingBlock(null);
    if (selectedPlan) {
      performFetchBlocks(selectedPlan.id);
    }
  };

  const handleExerciseAdded = () => {
    setIsAddExerciseDialogOpen(false);
    if (selectedPlan && currentBlockIdForExercise && blocks.length > 0) {
       performFetchExercisesForPlan(selectedPlan.id, blocks);
    }
    setCurrentBlockIdForExercise(null);
  };

  const handleExerciseUpdated = () => {
    setIsEditExerciseDialogOpen(false);
    setEditingExercise(null);
    if (selectedPlan && blocks.length > 0) {
      performFetchExercisesForPlan(selectedPlan.id, blocks);
    }
  };


  const openAddExerciseDialog = (blockId: string) => {
    setCurrentBlockIdForExercise(blockId);
    setIsAddExerciseDialogOpen(true);
  };

  const openEditBlockDialog = (block: TrainingBlock) => {
    setEditingBlock(block);
    setIsEditBlockDialogOpen(true);
  };

  const openEditExerciseDialog = (exercise: Exercise) => {
    setEditingExercise(exercise);
    setIsEditExerciseDialogOpen(true);
  };


  const handleSessionExerciseInputChange = (
    exerciseId: string,
    field: keyof Omit<SessionExerciseResultState, 'observations'> | `observations.${keyof Omit<ExerciseResultObservations, 'comment'>}`,
    value: string | number | null
  ) => {
    setSessionExerciseResults(prev => {
        const newMap = new Map(prev);
        const exerciseDetails = exercises.find(ex => ex.id === exerciseId);
        let currentExerciseData = newMap.get(exerciseId) || {
            plannedReps: exerciseDetails?.suggestedReps ?? "",
            doneReps: 0,
            rating: 3,
            observations: {
              ollaries: null, labios: null, orejas: null, ojos: null, cuello: null,
              dorso: null, grupa: null, miembros: null, cola: null,
              additionalNotes: ""
            }
        };

        if (String(field).startsWith('observations.')) {
            const obsField = String(field).split('.')[1] as keyof Omit<ExerciseResultObservations, 'comment'>;
             if (!currentExerciseData.observations) {
                currentExerciseData.observations = {
                    ollaries: null, labios: null, orejas: null, ojos: null, cuello: null,
                    dorso: null, grupa: null, miembros: null, cola: null,
                    additionalNotes: ""
                };
            }
            currentExerciseData = {
                ...currentExerciseData,
                observations: {
                    ...currentExerciseData.observations,
                    [obsField]: value === '' || value === 'N/A' ? null : String(value)
                }
            };
        } else if (field === 'doneReps' || field === 'rating') {
            (currentExerciseData as any)[field] = Number(value);
        } else if (field === 'plannedReps') {
            (currentExerciseData as any)[field] = String(value);
        }
        newMap.set(exerciseId, currentExerciseData);
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
            const ratingValue = resultData?.rating ?? 3;

            let observationsToSave: Omit<ExerciseResultObservations, 'comment'> | null = null;
             if (resultData?.observations) {
                const tempObs: Partial<Omit<ExerciseResultObservations, 'comment'>> = {};
                let hasValidObservation = false;
                (Object.keys(resultData.observations) as Array<keyof Omit<ExerciseResultObservations, 'comment'>>).forEach(key => {
                    const obsVal = resultData.observations![key];
                    if (obsVal !== undefined && obsVal !== null && String(obsVal).trim() !== '') {
                        (tempObs as any)[key] = obsVal;
                        hasValidObservation = true;
                    } else {
                        (tempObs as any)[key] = null;
                    }
                });
                if (hasValidObservation) {
                    observationsToSave = tempObs as Omit<ExerciseResultObservations, 'comment'>;
                }
            }


            exerciseResultsToSave.push({
                exerciseId: exercise.id,
                plannedReps: String(plannedRepsValue),
                doneReps: Number(doneRepsValue),
                rating: Number(ratingValue),
                observations: observationsToSave,
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

  const handleDragEndExercises = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active && over && active.id !== over.id) {
      const activeExercise = exercises.find(ex => ex.id === active.id);
      if (!activeExercise || !selectedPlan) return;

      const blockIdOfDraggedItem = activeExercise.blockId;
      if (!blockIdOfDraggedItem) {
        console.error("Dragged exercise does not have a blockId. Cannot reorder.");
        toast({variant: "destructive", title: "Error", description: "No se pudo determinar la etapa del ejercicio."});
        return;
      }

      setExercises((prevExercises) => {
        const exercisesInBlock = prevExercises.filter(ex => ex.blockId === blockIdOfDraggedItem);
        const oldIndex = exercisesInBlock.findIndex((ex) => ex.id === active.id);
        const newIndex = exercisesInBlock.findIndex((ex) => ex.id === over.id);

        if (oldIndex === -1 || newIndex === -1) return prevExercises;

        const reorderedExercisesInBlock = arrayMove(exercisesInBlock, oldIndex, newIndex);

        const updatedExercisesForDb = reorderedExercisesInBlock.map((ex, index) => ({
          ...ex,
          order: index,
        }));

        const dbPayload = updatedExercisesForDb.map(ex => ({ id: ex.id, order: ex.order as number }));
        if (selectedPlan?.id && blockIdOfDraggedItem) {
            updateExercisesOrder(selectedPlan.id, blockIdOfDraggedItem, dbPayload)
            .then(() => {
                toast({ title: "Orden de ejercicios actualizado", description: "El nuevo orden ha sido guardado." });
            })
            .catch(err => {
                console.error("Error updating exercises order in DB:", err);
                toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el nuevo orden." });
                if (selectedPlan?.id && blocks.length > 0) performFetchExercisesForPlan(selectedPlan.id, blocks);
            });
        }

        const otherBlocksExercises = prevExercises.filter(ex => ex.blockId !== blockIdOfDraggedItem);
        const newFullExerciseList = [...otherBlocksExercises, ...updatedExercisesForDb].sort((a, b) => {
          const blockAOrder = blocks.find(bl => bl.id === a.blockId)?.order ?? Infinity;
          const blockBOrder = blocks.find(bl => bl.id === b.blockId)?.order ?? Infinity;
          if (blockAOrder !== blockBOrder) {
            return blockAOrder - blockBOrder;
          }
          return (a.order ?? Infinity) - (b.order ?? Infinity);
        });
        return newFullExerciseList;
      });
    }
  };

  const handleDragEndBlocks = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active && over && active.id !== over.id && selectedPlan) {
      setBlocks((prevBlocks) => {
        const oldIndex = prevBlocks.findIndex(b => b.id === active.id);
        const newIndex = prevBlocks.findIndex(b => b.id === over.id);

        if (oldIndex === -1 || newIndex === -1) return prevBlocks;

        const reorderedBlocks = arrayMove(prevBlocks, oldIndex, newIndex);

        const updatedBlocksForDb = reorderedBlocks.map((block, index) => ({
          ...block,
          order: index,
        }));

        const dbPayload = updatedBlocksForDb.map(b => ({ id: b.id, order: b.order as number }));

        updateBlocksOrder(selectedPlan.id, dbPayload)
          .then(() => {
            toast({ title: "Orden de etapas actualizado", description: "El nuevo orden de etapas ha sido guardado." });
            // After successfully saving, re-fetch exercises to ensure their order reflects the new block order
             performFetchExercisesForPlan(selectedPlan.id, updatedBlocksForDb);
          })
          .catch(err => {
            console.error("Error updating blocks order in DB:", err);
            toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el nuevo orden de etapas." });
            if (selectedPlan?.id) performFetchBlocks(selectedPlan.id);
          });

        return updatedBlocksForDb;
      });
    }
  };


  return (
    <div className="container mx-auto py-10">
      <div className="mx-[10px] md:mx-0 grid grid-cols-1 md:grid-cols-3 gap-6 items-start">

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
                   <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="plan">Plan</TabsTrigger>
                    <TabsTrigger value="sesiones">Sesiones</TabsTrigger>
                  </TabsList>

                  <TabsContent value="plan">
                    <Card className="my-4">
                      <CardHeader>
                        <CardTitle>Plan de Entrenamiento para {selectedHorse.name}</CardTitle>
                         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-2">
                           <div className="flex flex-col sm:flex-row sm:items-center gap-2">
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
                                                setSelectedBlock(null);
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
                            {selectedPlan && (
                                <AlertDialog open={isDeletePlanDialogOpen} onOpenChange={setIsDeletePlanDialogOpen}>
                                <AlertDialogTrigger asChild>
                                    <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() => setIsDeletePlanDialogOpen(true)}
                                    className="w-full sm:w-auto"
                                    disabled={!selectedPlan || isDeletingPlan}
                                    >
                                    <Icons.trash className="mr-2 h-4 w-4" />
                                    Eliminar Plan Seleccionado
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>¿Estás realmente seguro?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Esta acción no se puede deshacer. Esto eliminará permanentemente el plan &quot;{selectedPlan?.title}&quot;
                                        y todas sus etapas y ejercicios asociados.
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogCancel disabled={isDeletingPlan}>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleDeleteSelectedPlan} disabled={isDeletingPlan} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                                        {isDeletingPlan && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                                        Sí, eliminar plan
                                    </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                                </AlertDialog>
                            )}
                        </div>
                        {selectedPlan && <CardDescription className="mt-2">Plan activo: {selectedPlan.title}</CardDescription>}
                      </CardHeader>
                      <CardContent>
                      {selectedPlan ? (
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndBlocks}>
                            <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                                <Accordion type="single" collapsible className="w-full space-y-2">
                                {blocks.map((block) => {
                                    const exercisesForBlock = exercises.filter(ex => ex.blockId === block.id && selectedPlan && ex.planId === selectedPlan.id).sort((a,b) => (a.order ?? Infinity) - (b.order ?? Infinity));
                                    return (
                                    <SortableBlockAccordionItem
                                        key={block.id}
                                        block={block}
                                        onEditBlock={openEditBlockDialog}
                                    >
                                        <AccordionContent className="mx-[10px] md:mx-0">
                                        {block.goal && (
                                            <p className="text-sm text-primary font-semibold mb-2">
                                            Meta de la Etapa: <span className="font-normal text-muted-foreground">{block.goal}</span>
                                            </p>
                                        )}
                                        {isLoadingExercises && exercisesForBlock.length === 0 && !selectedPlan && !block ? (
                                            <div className="flex items-center justify-center p-4">
                                                <Icons.spinner className="h-5 w-5 animate-spin mr-2" /> Cargando ejercicios...
                                            </div>
                                        ) : exercisesForBlock.length > 0 ? (
                                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndExercises}>
                                            <SortableContext items={exercisesForBlock.map(e => e.id)} strategy={verticalListSortingStrategy}>
                                                <ul className="list-none pl-0 space-y-1 text-sm">
                                                {exercisesForBlock.map((exercise) => (
                                                    <SortableExerciseItem key={exercise.id} exercise={exercise} onEdit={openEditExerciseDialog} />
                                                ))}
                                                </ul>
                                            </SortableContext>
                                        </DndContext>
                                        ) : (
                                        <p className="text-sm text-muted-foreground p-2">
                                            No se encontraron ejercicios para la etapa "{block.title}" (ID: {block.id}) en el plan "{selectedPlan?.title}" (ID: {selectedPlan?.id}). Verifica que los ejercicios en Firestore tengan el `planId` y `blockId` correctos.
                                        </p>
                                        )}
                                        <Button size="sm" variant="outline" className="mt-2" onClick={() => openAddExerciseDialog(block.id)}>
                                        <Icons.plus className="mr-2 h-4 w-4" /> Añadir Ejercicio a esta Etapa
                                        </Button>
                                    </AccordionContent>
                                    </SortableBlockAccordionItem>
                                )})}
                                </Accordion>
                            </SortableContext>
                          {isLoadingBlocks && blocks.length === 0 && (
                            <div className="flex items-center justify-center p-4">
                                <Icons.spinner className="h-5 w-5 animate-spin mr-2" /> Cargando etapas...
                            </div>
                          )}
                          {!isLoadingBlocks && blocks.length === 0 && selectedPlan && (
                            <p className="text-sm text-muted-foreground p-2">Este plan no tiene etapas definidas. (Plan ID: {selectedPlan.id})</p>
                          )}
                          <div className="flex flex-wrap justify-end mt-4 gap-2">
                              <Button onClick={() => setIsAddBlockDialogOpen(true)} disabled={!selectedPlan || isLoadingBlocks}>
                                  <Icons.plus className="mr-2 h-4 w-4" /> Añadir Etapa
                              </Button>
                          </div>
                         </DndContext>
                        ) : (
                          <p className="text-sm text-muted-foreground p-2">Selecciona o crea un plan de entrenamiento para ver sus detalles y gestionarlo.</p>
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
                              blocks.sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity)).map((block) => (
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
                                <div className="flex items-center justify-center p-4">
                                    <Icons.spinner className="h-5 w-5 animate-spin mr-2" /> Cargando ejercicios...
                                </div>
                            ) : exercises.filter(ex => ex.blockId === selectedBlock.id && selectedPlan && ex.planId === selectedPlan.id).length > 0 ? (
                                exercises.filter(ex => ex.blockId === selectedBlock.id && selectedPlan && ex.planId === selectedPlan.id).sort((a,b) => (a.order ?? Infinity) - (b.order ?? Infinity)).map(exercise => {
                                    const currentResult = sessionExerciseResults.get(exercise.id) || {
                                        doneReps: 0,
                                        rating: 3,
                                        plannedReps: exercise.suggestedReps ?? "",
                                        observations: {
                                          ollaries: null, labios: null, orejas: null, ojos: null, cuello: null,
                                          dorso: null, grupa: null, miembros: null, cola: null,
                                          additionalNotes: ""
                                        }
                                    };
                                    return (
                                        <Card key={exercise.id} className="p-4 space-y-3">
                                            <Label className="font-semibold text-lg">{exercise.title}</Label>
                                            {exercise.description && <p className="text-xs text-muted-foreground">{exercise.description}</p>}

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                                            <div>
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

                                            <div className="pt-3 border-t mt-3">
                                                <div className="space-y-1 mb-3">
                                                    <Label htmlFor={`obs-additionalNotes-${exercise.id}`}>Notas Adicionales (del ejercicio)</Label>
                                                    <Textarea
                                                      id={`obs-additionalNotes-${exercise.id}`}
                                                      placeholder="Otras notas específicas del ejercicio..."
                                                      value={currentResult.observations?.additionalNotes || ''}
                                                      onChange={(e) => handleSessionExerciseInputChange(exercise.id, `observations.additionalNotes`, e.target.value)}
                                                    />
                                                </div>
                                                <h4 className="text-md font-semibold mb-2">Observaciones de Tensión:</h4>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                                                    {OBSERVATION_ZONES.map(zone => (
                                                      <div key={zone.id} className="space-y-1">
                                                        <Label htmlFor={`obs-${exercise.id}-${zone.id}`}>{zone.label}</Label>
                                                        <Select
                                                          value={currentResult.observations?.[zone.id as keyof Omit<ExerciseResultObservations, 'comment' | 'additionalNotes'>] || ''}
                                                          onValueChange={(value) => handleSessionExerciseInputChange(exercise.id, `observations.${zone.id as keyof Omit<ExerciseResultObservations, 'comment' | 'additionalNotes'>}`, value === 'N/A' ? 'N/A' : (value || null))}
                                                        >
                                                          <SelectTrigger id={`obs-${exercise.id}-${zone.id}`}>
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
                                            </div>
                                        </Card>
                                    )
                                })
                            ) : (
                                <p className="text-sm text-muted-foreground p-2">No hay ejercicios en esta etapa para registrar.</p>
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

                   <TabsContent value="historial">
                     <HorseHistory preselectedHorse={selectedHorse} />
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

      <Dialog open={isEditBlockDialogOpen} onOpenChange={setIsEditBlockDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Editar Etapa</DialogTitle>
            <DialogDescription>Modifica los detalles de la etapa "{editingBlock?.title}".</DialogDescription>
          </DialogHeader>
          {selectedPlan && editingBlock && (
            <EditBlockForm
              planId={selectedPlan.id}
              block={editingBlock}
              onSuccess={handleBlockUpdated}
              onCancel={() => setIsEditBlockDialogOpen(false)}
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

      <Dialog open={isEditExerciseDialogOpen} onOpenChange={setIsEditExerciseDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Editar Ejercicio</DialogTitle>
            <DialogDescription>Modifica los detalles del ejercicio "{editingExercise?.title}".</DialogDescription>
          </DialogHeader>
          {selectedPlan && editingExercise?.blockId && editingExercise && (
            <EditExerciseForm
              planId={selectedPlan.id}
              blockId={editingExercise.blockId}
              exercise={editingExercise}
              onSuccess={handleExerciseUpdated}
              onCancel={() => setIsEditExerciseDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default Dashboard;

    