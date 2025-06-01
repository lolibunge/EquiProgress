
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

import { createSession, addExerciseResult, getSession, getExerciseResults, updateExerciseResult, updateSession, deleteSession } from "@/services/session";
import { getHorses as fetchHorsesService, getHorseById } from "@/services/horse";
import { 
  getTrainingPlans, 
  getTrainingBlocks, 
  // getExercises, // Deprecated
  // getExercise, // Deprecated
  debugGetBlocksForPlan, 
  getBlockById, 
  deleteTrainingPlan, 
  // updateExercisesOrder, // Deprecated, use updateExercisesOrderInBlock
  deleteTrainingBlock, 
  updateTrainingBlock, 
  // deleteExercise, // Deprecated, use deleteMasterExercise or removeExerciseFromBlockReference
  // updateExercise, // Deprecated, use updateMasterExercise
  updateBlocksOrder,
  getMasterExercises, // New
  getExercisesForBlock, // New
  addExerciseToBlockReference, // New
  removeExerciseFromBlockReference, // New
  updateExercisesOrderInBlock, // New
  type MasterExercise, // New
  type BlockExerciseDisplay, // New
  type ExerciseReference, // New
} from "@/services/firestore";
import type { Horse, TrainingPlan, TrainingBlock, ExerciseResult, SessionDataInput, ExerciseResultInput, SessionData, ExerciseResultObservations } from "@/types/firestore";
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
  DialogTitle,
  DialogTrigger
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
} from "@/components/ui/alert-dialog";
import AddHorseForm from "./AddHorseForm";
import AddPlanForm from "./AddPlanForm";
import AddBlockForm from "./AddBlockForm";
// import AddExerciseForm from "./AddExerciseForm"; // Deprecated
import EditBlockForm from "./EditBlockForm";
// import EditExerciseForm from "./EditExerciseForm"; // Deprecated
import { Icons } from "./icons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";


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


type SessionExerciseResultState = Omit<ExerciseResultInput, 'exerciseId' | 'observations'> & {
    observations: Omit<ExerciseResultObservations, 'additionalNotes'> & { additionalNotes?: string | null };
};


interface SortableExerciseItemProps {
  exercise: BlockExerciseDisplay; // Changed from Exercise to BlockExerciseDisplay
  blockId: string;
  planId: string;
  onRemove: (planId: string, blockId: string, masterExerciseId: string) => void;
  // onEdit: (exercise: BlockExerciseDisplay) => void; // Edit might be different now
}

function SortableExerciseItem({ exercise, blockId, planId, onRemove }: SortableExerciseItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: exercise.id }); // Use MasterExercise.id for sortable context

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
        variant="ghost"
        size="icon"
        className="ml-2 h-7 w-7 opacity-0 group-hover:opacity-100 flex-shrink-0"
        onClick={(e) => {
            e.stopPropagation();
            onRemove(planId, blockId, exercise.id); // exercise.id is MasterExercise.id
        }}
       >
        <Icons.trash className="h-4 w-4 text-destructive" />
        <span className="sr-only">Quitar Ejercicio de la Etapa</span>
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
  const [selectedBlock, setSelectedBlock] = useState<TrainingBlock | null>(null); // For session registration

  // This state will now hold BlockExerciseDisplay which includes MasterExercise details and orderInBlock
  const [exercisesInPlan, setExercisesInPlan] = useState<BlockExerciseDisplay[]>([]);
  const [isLoadingExercises, setIsLoadingExercises] = useState(false);

  const [date, setDate] = useState<Date | undefined>(new Date());

  const [sessionOverallNote, setSessionOverallNote] = useState("");
  const [sessionExerciseResults, setSessionExerciseResults] = useState<Map<string, SessionExerciseResultState>>(new Map());
  const [isSavingSession, setIsSavingSession] = useState(false);


  const [isCreatePlanDialogOpen, setIsCreatePlanDialogOpen] = useState(false);
  const [isAddBlockDialogOpen, setIsAddBlockDialogOpen] = useState(false);
  // const [isAddExerciseDialogOpen, setIsAddExerciseDialogOpen] = useState(false); // Old dialog
  const [currentBlockIdForNewExercise, setCurrentBlockIdForNewExercise] = useState<string | null>(null);

  const [isEditBlockDialogOpen, setIsEditBlockDialogOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<TrainingBlock | null>(null);
  // const [isEditExerciseDialogOpen, setIsEditExerciseDialogOpen] = useState(false); // Old dialog
  // const [editingExercise, setEditingExercise] = useState<Exercise | null>(null); // Old type
  const [isDeletePlanDialogOpen, setIsDeletePlanDialogOpen] = useState(false);
  const [isDeletingPlan, setIsDeletingPlan] = useState(false);

  // For "Add Exercise to Block" Dialog
  const [isSelectExerciseDialogOpen, setIsSelectExerciseDialogOpen] = useState(false);
  const [availableMasterExercises, setAvailableMasterExercises] = useState<MasterExercise[]>([]);
  const [isLoadingMasterExercises, setIsLoadingMasterExercises] = useState(false);
  const [selectedMasterExercisesForBlock, setSelectedMasterExercisesForBlock] = useState<Set<string>>(new Set());


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
      if (userHorses.length === 0) {
        setSelectedHorse(null);
      }
    } catch (error) {
      console.error("[Dashboard] Error fetching horses:", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los caballos." });
      setHorses([]);
    } finally {
      setIsLoadingHorses(false);
    }
  }, [toast]);

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

  // Fetches all exercises for ALL blocks in the current plan
  const performFetchExercisesForPlan = useCallback(async (planId: string, currentPlanBlocks: TrainingBlock[]) => {
    if (!planId || currentPlanBlocks.length === 0) {
        setExercisesInPlan([]);
        return;
    }
    setIsLoadingExercises(true);
    try {
      let allExercisesForPlan: BlockExerciseDisplay[] = [];
      for (const block of currentPlanBlocks) {
        const blockExercises = await getExercisesForBlock(block.id); // Uses new service function
        allExercisesForPlan = [...allExercisesForPlan, ...blockExercises];
      }
      // Sort exercises based on block order, then exercise order within block
      const sortedExercises = allExercisesForPlan.sort((a, b) => {
        const blockAOrder = currentPlanBlocks.find(bl => bl.id === a.blockId)?.order ?? Infinity;
        const blockBOrder = currentPlanBlocks.find(bl => bl.id === b.blockId)?.order ?? Infinity;
        if (blockAOrder !== blockBOrder) {
          return blockAOrder - blockBOrder;
        }
        return (a.orderInBlock ?? Infinity) - (b.orderInBlock ?? Infinity);
      });
      setExercisesInPlan(sortedExercises);
    } catch (error) {
      console.error(`[Dashboard] Error fetching exercises for plan ${planId}:`, error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los ejercicios del plan." });
      setExercisesInPlan([]);
    } finally {
      setIsLoadingExercises(false);
    }
  }, [toast]);

 const performFetchBlocks = useCallback(async (planId: string) => {
    if (!planId) {
      setBlocks([]);
      // setSelectedBlock(null); // Keep selectedBlock for session registration separate
      setExercisesInPlan([]);
      return;
    }
    setIsLoadingBlocks(true);
    setExercisesInPlan([]); 
    try {
      const fetchedBlocks = await getTrainingBlocks(planId);
      setBlocks(fetchedBlocks);
      if (fetchedBlocks.length > 0) {
        performFetchExercisesForPlan(planId, fetchedBlocks);
      } else {
        // setSelectedBlock(null); // Keep selectedBlock for session registration separate
      }
    } catch (error) {
      console.error(`[Dashboard] Error fetching blocks for plan ${planId}:`, error);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar las etapas para este plan." });
      setBlocks([]);
      // setSelectedBlock(null); // Keep selectedBlock for session registration separate
    } finally {
      setIsLoadingBlocks(false);
    }
  }, [toast, performFetchExercisesForPlan]);


  useEffect(() => {
    if (selectedPlan?.id) {
      performFetchBlocks(selectedPlan.id);
    } else {
      setBlocks([]);
      // setSelectedBlock(null); // This is for session registration, not tied to plan view directly
      setExercisesInPlan([]);
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
        }
      });
    });
  };

  const handlePlanDeleted = () => {
    setIsDeletePlanDialogOpen(false);
    setSelectedPlan(null);
    setBlocks([]);
    setExercisesInPlan([]);
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

  const openEditBlockDialog = (block: TrainingBlock) => {
    setEditingBlock(block);
    setIsEditBlockDialogOpen(true);
  };

  const openSelectExerciseDialog = async (blockId: string) => {
    setCurrentBlockIdForNewExercise(blockId);
    setIsLoadingMasterExercises(true);
    setIsSelectExerciseDialogOpen(true);
    try {
      const masters = await getMasterExercises();
      setAvailableMasterExercises(masters);
      setSelectedMasterExercisesForBlock(new Set()); // Reset selection
    } catch (error) {
      toast({ title: "Error", description: "No se pudieron cargar los ejercicios de la biblioteca.", variant: "destructive" });
      setAvailableMasterExercises([]);
    } finally {
      setIsLoadingMasterExercises(false);
    }
  };

  const handleAddSelectedExercisesToBlock = async () => {
    if (!selectedPlan || !currentBlockIdForNewExercise || selectedMasterExercisesForBlock.size === 0) {
      toast({ title: "Nada Seleccionado", description: "Por favor, selecciona al menos un ejercicio.", variant: "default" });
      return;
    }
    setIsLoadingExercises(true); // Use general exercise loading indicator
    try {
      for (const masterExerciseId of selectedMasterExercisesForBlock) {
        await addExerciseToBlockReference(selectedPlan.id, currentBlockIdForNewExercise, masterExerciseId);
      }
      toast({ title: "Ejercicios Añadidos", description: "Los ejercicios seleccionados se han añadido a la etapa." });
      setIsSelectExerciseDialogOpen(false);
      setCurrentBlockIdForNewExercise(null);
      // Refresh exercises for the current plan
      if (selectedPlan?.id && blocks.length > 0) {
        performFetchExercisesForPlan(selectedPlan.id, blocks);
      }
    } catch (error) {
      toast({ title: "Error", description: "No se pudieron añadir los ejercicios a la etapa.", variant: "destructive" });
      console.error("Error adding exercises to block:", error);
    } finally {
      setIsLoadingExercises(false);
    }
  };

  const handleRemoveExerciseFromBlock = async (planId: string, blockId: string, masterExerciseId: string) => {
    setIsLoadingExercises(true);
    try {
      await removeExerciseFromBlockReference(planId, blockId, masterExerciseId);
      toast({title: "Ejercicio Removido", description: "El ejercicio ha sido quitado de esta etapa."});
      if (selectedPlan?.id && blocks.length > 0) {
        performFetchExercisesForPlan(selectedPlan.id, blocks);
      }
    } catch (error) {
      toast({title: "Error", description: "No se pudo quitar el ejercicio.", variant: "destructive"});
      console.error("Error removing exercise from block:", error);
    } finally {
      setIsLoadingExercises(false);
    }
  };


  const handleSessionExerciseInputChange = (
    exerciseId: string, // This is MasterExercise.id
    field: keyof Omit<SessionExerciseResultState, 'observations'> | `observations.${keyof Omit<ExerciseResultObservations, 'additionalNotes'>}` | 'observations.additionalNotes',
    value: string | number | null
  ) => {
    setSessionExerciseResults(prev => {
        const newMap = new Map(prev);
        const masterExerciseDetails = exercisesInPlan.find(ex => ex.id === exerciseId); // Find from plan's exercises
        let currentExerciseData = newMap.get(exerciseId) || {
            plannedReps: masterExerciseDetails?.suggestedReps ?? "",
            doneReps: 0,
            rating: 3,
            observations: {
              nostrils: null, lips: null, ears: null, eyes: null, neck: null,
              back: null, croup: null, limbs: null, tail: null,
              additionalNotes: ""
            }
        };

        if (String(field).startsWith('observations.')) {
            const obsField = String(field).split('.')[1] as keyof ExerciseResultObservations;
             if (!currentExerciseData.observations) {
                currentExerciseData.observations = {
                    nostrils: null, lips: null, ears: null, eyes: null, neck: null,
                    back: null, croup: null, limbs: null, tail: null,
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
    if (!selectedBlock || !selectedBlock.id) { // selectedBlock is for session registration
        toast({
            variant: "destructive",
            title: "Error de Validación",
            description: "Por favor, selecciona una etapa para la sesión.",
        });
        return;
    }

    // Get exercises specifically for the selected block for the session
    const exercisesInSelectedBlockForSession = await getExercisesForBlock(selectedBlock.id);

    if (exercisesInSelectedBlockForSession.length === 0) {
        toast({
            variant: "destructive",
            title: "Sin Ejercicios",
            description: "La etapa seleccionada para la sesión no tiene ejercicios. Añade ejercicios a esta etapa en la pestaña 'Plan'.",
        });
        return;
    }


    setIsSavingSession(true);
    try {
      const sessionInput: SessionDataInput = {
        horseId: selectedHorse.id,
        date: Timestamp.fromDate(date),
        blockId: selectedBlock.id, // Use selectedBlock for session
        overallNote: sessionOverallNote,
      };

      const sessionId = await createSession(sessionInput);

      if (sessionId) {
        const exerciseResultsToSave: ExerciseResultInput[] = [];

        exercisesInSelectedBlockForSession.forEach(exercise => { // Iterate over exercises of the selected block for session
            const resultData = sessionExerciseResults.get(exercise.id); // exercise.id is MasterExercise.id
            const plannedRepsValue = resultData?.plannedReps ?? exercise?.suggestedReps ?? '';
            const doneRepsValue = resultData?.doneReps ?? 0;
            const ratingValue = resultData?.rating ?? 3;

            let observationsToSave: Omit<ExerciseResultObservations, 'additionalNotes'> & { additionalNotes?: string | null} | null = null;
             if (resultData?.observations) {
                const tempObs: Partial<ExerciseResultObservations> = {};
                let hasValidObservation = false;
                (Object.keys(resultData.observations) as Array<keyof ExerciseResultObservations>).forEach(key => {
                    const obsVal = resultData.observations![key];
                    if (obsVal !== undefined && obsVal !== null && String(obsVal).trim() !== '') {
                        (tempObs as any)[key] = obsVal;
                        hasValidObservation = true;
                    } else {
                        (tempObs as any)[key] = null; 
                    }
                });
                if (hasValidObservation) {
                    observationsToSave = tempObs as Omit<ExerciseResultObservations, 'additionalNotes'> & { additionalNotes?: string | null};
                }
            }

            exerciseResultsToSave.push({
                exerciseId: exercise.id, // This is MasterExercise.id
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
      const activeExerciseId = String(active.id);
      const overExerciseId = String(over.id);

      const activeExercise = exercisesInPlan.find(ex => ex.id === activeExerciseId);
      if (!activeExercise || !selectedPlan) return;

      const blockIdOfDraggedItem = activeExercise.blockId;
      if (!blockIdOfDraggedItem) {
        console.error("Dragged exercise does not have a blockId. Cannot reorder.");
        toast({variant: "destructive", title: "Error", description: "No se pudo determinar la etapa del ejercicio."});
        return;
      }
      
      // Get current references for the block
      const targetBlock = blocks.find(b => b.id === blockIdOfDraggedItem);
      if (!targetBlock || !targetBlock.exerciseReferences) return;

      let currentReferences: ExerciseReference[] = [...targetBlock.exerciseReferences];

      const oldIndex = currentReferences.findIndex((ref) => ref.exerciseId === activeExerciseId);
      const newIndex = currentReferences.findIndex((ref) => ref.exerciseId === overExerciseId);

      if (oldIndex === -1 || newIndex === -1) return;

      const reorderedReferences = arrayMove(currentReferences, oldIndex, newIndex).map((ref, index) => ({
        ...ref,
        order: index,
      }));
      
      try {
        await updateExercisesOrderInBlock(blockIdOfDraggedItem, reorderedReferences);
        toast({ title: "Orden de ejercicios actualizado", description: "El nuevo orden ha sido guardado." });
        // Refresh exercises for the plan to reflect new order in UI
        performFetchExercisesForPlan(selectedPlan.id, blocks);
      } catch (err) {
        console.error("Error updating exercises order in DB:", err);
        toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el nuevo orden." });
        performFetchExercisesForPlan(selectedPlan.id, blocks); // Re-fetch on error to revert UI
      }
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
                                                setSelectedPlan(plan);
                                                setSelectedBlock(null); // Reset session block selection
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
                                    const exercisesForThisBlock = exercisesInPlan.filter(ex => ex.blockId === block.id).sort((a,b) => (a.orderInBlock ?? Infinity) - (b.orderInBlock ?? Infinity));
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
                                        {isLoadingExercises && exercisesForThisBlock.length === 0 ? (
                                            <div className="flex items-center justify-center p-4">
                                                <Icons.spinner className="h-5 w-5 animate-spin mr-2" /> Cargando ejercicios...
                                            </div>
                                        ) : exercisesForThisBlock.length > 0 ? (
                                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndExercises}>
                                            <SortableContext items={exercisesForThisBlock.map(e => e.id)} strategy={verticalListSortingStrategy}>
                                                <ul className="list-none pl-0 space-y-1 text-sm">
                                                {exercisesForThisBlock.map((exercise) => (
                                                    <SortableExerciseItem 
                                                      key={exercise.id} // MasterExercise.id
                                                      exercise={exercise} 
                                                      blockId={block.id}
                                                      planId={selectedPlan.id}
                                                      onRemove={handleRemoveExerciseFromBlock}
                                                    />
                                                ))}
                                                </ul>
                                            </SortableContext>
                                        </DndContext>
                                        ) : (
                                        <p className="text-sm text-muted-foreground p-2">
                                           Esta etapa no tiene ejercicios.
                                        </p>
                                        )}
                                        <Button size="sm" variant="outline" className="mt-2" onClick={() => openSelectExerciseDialog(block.id)}>
                                          <Icons.plus className="mr-2 h-4 w-4" /> Añadir Ejercicio desde Biblioteca
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
                            <p className="text-sm text-muted-foreground p-2">Este plan no tiene etapas definidas.</p>
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
                              {(selectedBlock && blocks.some(b => b.id === selectedBlock.id)) ? selectedBlock.title : "Seleccionar Etapa para la Sesión"}
                              <Icons.chevronDown className="ml-auto h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                            <DropdownMenuLabel>Etapas del Plan: {selectedPlan?.title || "N/A"}</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {isLoadingBlocks ? (
                                <DropdownMenuItem disabled>Cargando etapas...</DropdownMenuItem>
                            ) : blocks.length > 0 ? (
                              blocks.sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity)).map((block) => (
                                  <DropdownMenuItem key={block.id} onSelect={() => {
                                    setSelectedBlock(block); // This is for session registration
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

                        {selectedBlock && ( // selectedBlock is for session registration
                            <>
                            <Label htmlFor="session-overall-note">Notas Generales de la Sesión</Label>
                            <Textarea
                                id="session-overall-note"
                                placeholder="Comentarios generales sobre la sesión, estado del caballo, etc."
                                value={sessionOverallNote}
                                onChange={(e) => setSessionOverallNote(e.target.value)}
                            />

                            {isLoadingExercises && exercisesInPlan.filter(ex => ex.blockId === selectedBlock.id).length === 0 ? (
                                <div className="flex items-center justify-center p-4">
                                    <Icons.spinner className="h-5 w-5 animate-spin mr-2" /> Cargando ejercicios para la etapa...
                                </div>
                            // Filter exercisesInPlan by selectedBlock.id for session logging
                            ) : exercisesInPlan.filter(ex => ex.blockId === selectedBlock.id).length > 0 ? ( 
                                exercisesInPlan.filter(ex => ex.blockId === selectedBlock.id).sort((a,b) => (a.orderInBlock ?? Infinity) - (b.orderInBlock ?? Infinity)).map(exercise => {
                                    const currentResult = sessionExerciseResults.get(exercise.id) || { // exercise.id is MasterExercise.id
                                        doneReps: 0,
                                        rating: 3,
                                        plannedReps: exercise.suggestedReps ?? "",
                                        observations: {
                                          nostrils: null, lips: null, ears: null, eyes: null, neck: null,
                                          back: null, croup: null, limbs: null, tail: null,
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
                                                          value={currentResult.observations?.[zone.id as keyof Omit<ExerciseResultObservations, 'additionalNotes'>] || ''}
                                                          onValueChange={(value) => handleSessionExerciseInputChange(exercise.id, `observations.${zone.id as keyof Omit<ExerciseResultObservations, 'additionalNotes'>}`, value === 'N/A' ? 'N/A' : (value || null))}
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
                                <p className="text-sm text-muted-foreground p-2">Selecciona una etapa con ejercicios para registrar la sesión.</p>
                            )}
                            </>
                        )}

                        <div className="flex justify-end mt-2">
                          <Button
                            onClick={handleSaveSessionAndNavigate}
                            disabled={isSavingSession || !date || !selectedHorse || !selectedBlock || (selectedBlock && exercisesInPlan.filter(ex => ex.blockId === selectedBlock.id).length === 0) }
                          >
                            {isSavingSession && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                            Guardar Sesión e Ir a Detalles
                          </Button>
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

      {/* Dialog to Select Master Exercises to add to a Block */}
      <Dialog open={isSelectExerciseDialogOpen} onOpenChange={(open) => {
        if (!open) setCurrentBlockIdForNewExercise(null); // Reset when closing
        setIsSelectExerciseDialogOpen(open);
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Añadir Ejercicios a la Etapa</DialogTitle>
            <DialogDescription>
              Selecciona ejercicios de la biblioteca para añadir a la etapa: {blocks.find(b => b.id === currentBlockIdForNewExercise)?.title || ""}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4 max-h-[60vh] overflow-y-auto">
            {isLoadingMasterExercises ? (
              <div className="flex justify-center"><Icons.spinner className="h-6 w-6 animate-spin" /></div>
            ) : availableMasterExercises.length === 0 ? (
              <p className="text-center text-muted-foreground">No hay ejercicios en la biblioteca. <Link href="/library/exercises" className="text-primary hover:underline" onClick={() => setIsSelectExerciseDialogOpen(false)}>Añade algunos primero.</Link></p>
            ) : (
              availableMasterExercises.map(masterEx => (
                <div key={masterEx.id} className="flex items-center space-x-3 rounded-md border p-3 hover:bg-accent/50">
                  <Checkbox
                    id={`master-ex-${masterEx.id}`}
                    checked={selectedMasterExercisesForBlock.has(masterEx.id)}
                    onCheckedChange={(checked) => {
                      setSelectedMasterExercisesForBlock(prev => {
                        const newSet = new Set(prev);
                        if (checked) {
                          newSet.add(masterEx.id);
                        } else {
                          newSet.delete(masterEx.id);
                        }
                        return newSet;
                      });
                    }}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor={`master-ex-${masterEx.id}`}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {masterEx.title}
                    </label>
                    {masterEx.description && (
                      <p className="text-xs text-muted-foreground">{masterEx.description}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={() => {
              setIsSelectExerciseDialogOpen(false);
              setCurrentBlockIdForNewExercise(null);
            }}>
              Cancelar
            </Button>
            <Button onClick={handleAddSelectedExercisesToBlock} disabled={isLoadingMasterExercises || selectedMasterExercisesForBlock.size === 0}>
              Añadir Seleccionados ({selectedMasterExercisesForBlock.size})
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default Dashboard;
