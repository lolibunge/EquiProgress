
"use client";

import Link from 'next/link';
import { Timestamp } from "firebase/firestore";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { useState, useEffect, useCallback, ReactNode } from "react";
import type { User } from 'firebase/auth';
import { useAuth } from "@/context/AuthContext"; // Ensure this is imported
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';

import { createSession, addExerciseResult, getSession, getExerciseResults, updateExerciseResult, updateSession, deleteSession } from "@/services/session";
import { getHorses as fetchHorsesService, getHorseById, addHorse } from "@/services/horse";
import {
  getTrainingPlans,
  getTrainingBlocks,
  getBlockById,
  deleteTrainingPlan,
  deleteTrainingBlock,
  updateTrainingBlock,
  updateBlocksOrder,
  getMasterExercises,
  getExercisesForBlock,
  addExerciseToBlockReference,
  removeExerciseFromBlockReference,
  updateExercisesOrderInBlock,
  type MasterExercise,
  type BlockExerciseDisplay,
  type ExerciseReference,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import AddHorseForm from "./AddHorseForm";
import AddPlanForm from "./AddPlanForm";
import AddBlockForm from "./AddBlockForm";
import EditBlockForm from "./EditBlockForm";
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


type SessionDayResultState = Omit<ExerciseResultInput, 'exerciseId' | 'observations'> & {
    observations: Omit<ExerciseResultObservations, 'additionalNotes'> & { additionalNotes?: string | null };
};


interface SortableExerciseItemProps {
  exercise: BlockExerciseDisplay; // Represents a "Day"
  blockId: string; // Represents a "Week ID"
  planId: string;
  onRemove: (planId: string, blockId: string, masterExerciseId: string) => void;
  canEdit: boolean;
}

function SortableExerciseItem({ exercise, blockId, planId, onRemove, canEdit }: SortableExerciseItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: exercise.id, disabled: !canEdit });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: canEdit ? (isDragging ? 'grabbing' : 'grab') : 'default',
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...(canEdit ? attributes : {})}
      {...(canEdit ? listeners : {})}
      className="flex items-center justify-between group p-2 rounded-md hover:bg-muted/70 active:bg-muted bg-card border mx-2.5"
    >
      <div>
        <span className="font-medium block whitespace-normal">{exercise.title}</span> {/* Day Title */}
        {exercise.suggestedReps && <span className="block whitespace-normal text-xs text-muted-foreground">(Sugerido: {exercise.suggestedReps})</span>}
        {exercise.description && <p className="text-xs text-muted-foreground pl-2 block whitespace-normal">- Desc: {exercise.description}</p>}
        {exercise.objective && <p className="text-xs text-muted-foreground pl-2 block whitespace-normal">- Obj: {exercise.objective}</p>}
      </div>
      {canEdit && (
        <Button
            variant="ghost"
            size="icon"
            className="ml-2 h-7 w-7 opacity-0 group-hover:opacity-100 flex-shrink-0"
            onClick={(e) => {
                e.stopPropagation();
                onRemove(planId, blockId, exercise.id);
            }}
        >
            <Icons.trash className="h-4 w-4 text-destructive" />
            <span className="sr-only">Quitar Día de la Semana</span>
        </Button>
      )}
    </li>
  );
}

interface SortableBlockAccordionItemProps {
  block: TrainingBlock; // Represents a "Week"
  children: ReactNode;
  onEditBlock: (block: TrainingBlock) => void;
  canEdit: boolean;
}

function SortableBlockAccordionItem({ block, children, onEditBlock, canEdit }: SortableBlockAccordionItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id, disabled: !canEdit });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: canEdit ? (isDragging ? 'grabbing' : 'grab') : 'default',
  };

  return (
    <AccordionItem
      value={block.id}
      ref={setNodeRef}
      style={style}
      className="bg-card border mx-2.5 rounded-md shadow-sm"
    >
       <div className="flex items-center justify-between w-full group text-left">
        <AccordionTrigger
          {...(canEdit ? attributes : {})}
          {...(canEdit ? listeners : {})}
          className="flex-grow p-4 hover:no-underline"
          disabled={!canEdit && (!block.exerciseReferences || block.exerciseReferences.length === 0)}
        >
            <span className="flex-grow">
              {block.title} {/* Week Title */}
              {block.notes && <span className="block sm:inline text-xs text-muted-foreground ml-0 sm:ml-2">- {block.notes}</span>}
              {block.duration && <span className="block sm:inline text-xs text-muted-foreground ml-0 sm:ml-2">- Duración: {block.duration}</span>}
              {block.goal && <span className="block sm:inline text-xs text-muted-foreground ml-0 sm:ml-2">- Meta: {block.goal}</span>}
            </span>
        </AccordionTrigger>
        {canEdit && (
            <Button
                asChild
                variant="ghost"
                size="icon"
                className="ml-2 mr-2 h-7 w-7 flex-shrink-0 opacity-0 group-hover:opacity-100 hover:bg-muted/70 hover:text-muted-foreground"
                onClick={(e) => {
                    e.stopPropagation();
                    onEditBlock(block);
                }}
            >
                <span>
                <Icons.edit className="h-4 w-4" />
                <span className="sr-only">Editar Semana</span>
                </span>
            </Button>
        )}
      </div>
      {children}
    </AccordionItem>
  );
}


const Dashboard = () => {
  const { currentUser, userProfile, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isAddHorseDialogOpen, setIsAddHorseDialogOpen] = useState(false);
  const [horses, setHorses] = useState<Horse[]>([]);
  const [isLoadingHorses, setIsLoadingHorses] = useState(true);
  const [selectedHorse, setSelectedHorse] = useState<Horse | null>(null);

  const [trainingPlans, setTrainingPlans] = useState<TrainingPlan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<TrainingPlan | null>(null);

  const [blocks, setBlocks] = useState<TrainingBlock[]>([]); // Represents "Weeks"
  const [isLoadingBlocks, setIsLoadingBlocks] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<TrainingBlock | null>(null); // Represents selected "Week"

  const [exercisesInPlan, setExercisesInPlan] = useState<BlockExerciseDisplay[]>([]); // Represents "Days" within the entire plan
  const [isLoadingExercises, setIsLoadingExercises] = useState(false);
  const [selectedDayForSession, setSelectedDayForSession] = useState<BlockExerciseDisplay | null>(null); // Selected "Day" for logging

  const [date, setDate] = useState<Date | undefined>(new Date());

  const [sessionOverallNote, setSessionOverallNote] = useState("");
  const [sessionDayResult, setSessionDayResult] = useState<SessionDayResultState | null>(null);
  const [isSavingSession, setIsSavingSession] = useState(false);


  const [isCreatePlanDialogOpen, setIsCreatePlanDialogOpen] = useState(false);
  const [isAddBlockDialogOpen, setIsAddBlockDialogOpen] = useState(false);
  const [currentBlockIdForNewExercise, setCurrentBlockIdForNewExercise] = useState<string | null>(null);

  const [isEditBlockDialogOpen, setIsEditBlockDialogOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<TrainingBlock | null>(null);
  const [isDeletePlanDialogOpen, setIsDeletePlanDialogOpen] = useState(false);
  const [isDeletingPlan, setIsDeletingPlan] = useState(false);

  const [isSelectExerciseDialogOpen, setIsSelectExerciseDialogOpen] = useState(false);
  const [availableMasterExercises, setAvailableMasterExercises] = useState<MasterExercise[]>([]);
  const [isLoadingMasterExercises, setIsLoadingMasterExercises] = useState(false);
  const [selectedMasterExercisesForBlock, setSelectedMasterExercisesForBlock] = useState<Set<string>>(new Set());
  const [exerciseSearchTerm, setExerciseSearchTerm] = useState("");
  
  const isUserAdmin = userProfile?.role === 'admin';
  // CRITICAL LOG: This will show what the Dashboard sees from AuthContext regarding the user's admin status.
  console.log(`%c[Dashboard Render] currentUser UID: ${currentUser?.uid}, userProfile: ${JSON.stringify(userProfile)}, isUserAdmin: ${isUserAdmin}, authLoading: ${authLoading}`, "color: blue; font-weight: bold;");


  const initialLoadingComplete = !isLoadingHorses && !isLoadingPlans && !isLoadingBlocks && !authLoading;
  const [activeTab, setActiveTab] = useState("sesiones");


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
        setSelectedHorse(userHorses[0]); // Auto-select first horse if none is selected
      } else if (userHorses.length === 0) {
        setSelectedHorse(null);
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error al Cargar Caballos", description: "No se pudieron cargar los caballos." });
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
      toast({ variant: "destructive", title: "Error al Cargar Planes", description: "No se pudieron cargar los planes." });
      setTrainingPlans([]);
    } finally {
      setIsLoadingPlans(false);
    }
  }, [toast]);

  useEffect(() => {
    if (currentUser) {
      performFetchPlans();
    } else {
      setTrainingPlans([]);
      setSelectedPlan(null);
      setBlocks([]);
      setExercisesInPlan([]);
      setIsLoadingPlans(false);
    }
  }, [currentUser, performFetchPlans]);

  const performFetchExercisesForPlan = useCallback(async (planId: string, currentPlanBlocks: TrainingBlock[]) => {
    if (!planId || currentPlanBlocks.length === 0) {
        setExercisesInPlan([]);
        setIsLoadingExercises(false);
        return;
    }
    setIsLoadingExercises(true);
    try {
      let allExercisesForPlan: BlockExerciseDisplay[] = [];
      for (const block of currentPlanBlocks) {
        if (block && block.id) {
          const blockExercises = await getExercisesForBlock(block.id);
          const exercisesWithBlockId = blockExercises.map(ex => ({ ...ex, blockId: block.id }));
          allExercisesForPlan = [...allExercisesForPlan, ...exercisesWithBlockId];
        }
      }
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
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los días del plan." });
      setExercisesInPlan([]);
    } finally {
      setIsLoadingExercises(false);
    }
  }, [toast]);

 const performFetchBlocks = useCallback(async (planId: string) => {
    if (!planId) {
      setBlocks([]);
      setExercisesInPlan([]);
      setSelectedBlock(null);
      setSelectedDayForSession(null);
      setIsLoadingBlocks(false);
      return []; // Return empty array if no planId
    }
    setIsLoadingBlocks(true);
    setExercisesInPlan([]);
    setSelectedBlock(null);
    setSelectedDayForSession(null);
    try {
      const fetchedBlocks = await getTrainingBlocks(planId);
      const sortedBlocks = fetchedBlocks.sort((a,b) => (a.order ?? Infinity) - (b.order ?? Infinity));
      setBlocks(sortedBlocks);
      if (sortedBlocks.length > 0) {
        await performFetchExercisesForPlan(planId, sortedBlocks);
        // Auto-select the first block for the "Sesiones" tab
        const firstBlock = sortedBlocks.find(b => b.order === 0) || sortedBlocks[0];
        if (firstBlock) {
            setSelectedBlock(firstBlock);
        }
      } else {
         setExercisesInPlan([]);
         setSelectedBlock(null);
      }
      return sortedBlocks; // Return fetched blocks
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar las semanas para este plan." });
      setBlocks([]);
      setExercisesInPlan([]);
      return []; // Return empty array on error
    } finally {
      setIsLoadingBlocks(false);
    }
  }, [toast, performFetchExercisesForPlan]);


  useEffect(() => {
    if (initialLoadingComplete) { // Check after all relevant data loading is complete
      if (isUserAdmin) {
        setActiveTab("plan");
      } else {
        setActiveTab("sesiones");
      }
    }
  }, [isUserAdmin, initialLoadingComplete]);


  useEffect(() => {
    if (selectedPlan?.id) {
      performFetchBlocks(selectedPlan.id);
    } else {
      setBlocks([]);
      setExercisesInPlan([]);
      setSelectedBlock(null);
      setSelectedDayForSession(null);
    }
  }, [selectedPlan, performFetchBlocks]);

  useEffect(() => {
    setSelectedDayForSession(null);
    setSessionDayResult(null);
  }, [selectedBlock]);


  const handleHorseAdded = () => {
    setIsAddHorseDialogOpen(false);
    if (currentUser?.uid) {
        performFetchHorses(currentUser.uid);
    }
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
    performFetchPlans();
  };

  const handleDeleteSelectedPlan = async () => {
    if (!selectedPlan || !isUserAdmin) return;
    setIsDeletingPlan(true);
    try {
      await deleteTrainingPlan(selectedPlan.id);
      toast({
        title: "Plan Eliminado",
        description: `El plan "${selectedPlan.title}" y todo su contenido han sido eliminados.`,
      });
      handlePlanDeleted();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error al Eliminar Plan",
        description: "Ocurrió un error al eliminar el plan.",
      });
    } finally {
      setIsDeletingPlan(false);
    }
  };


  const handleBlockAdded = () => {
    setIsAddBlockDialogOpen(false);
    if (selectedPlan?.id) {
      performFetchBlocks(selectedPlan.id);
    }
  };

  const handleBlockUpdated = () => {
    setIsEditBlockDialogOpen(false);
    setEditingBlock(null);
    if (selectedPlan?.id) {
      performFetchBlocks(selectedPlan.id);
    }
  };

  const openEditBlockDialog = (block: TrainingBlock) => {
    if (!isUserAdmin) return;
    setEditingBlock(block);
    setIsEditBlockDialogOpen(true);
  };

  const openSelectExerciseDialog = async (blockId: string) => {
    if (!isUserAdmin) return;
    setCurrentBlockIdForNewExercise(blockId);
    setExerciseSearchTerm("");
    setIsLoadingMasterExercises(true);
    setIsSelectExerciseDialogOpen(true);
    try {
      const masters = await getMasterExercises();
      setAvailableMasterExercises(masters);
      setSelectedMasterExercisesForBlock(new Set());
    } catch (error) {
      toast({ title: "Error", description: "No se pudieron cargar los ejercicios (días) de la biblioteca.", variant: "destructive" });
      setAvailableMasterExercises([]);
    } finally {
      setIsLoadingMasterExercises(false);
    }
  };

  const handleAddSelectedExercisesToBlock = async () => {
    if (!selectedPlan?.id || !currentBlockIdForNewExercise || selectedMasterExercisesForBlock.size === 0 || !isUserAdmin) {
      toast({ title: "Nada Seleccionado", description: "Por favor, selecciona al menos un día.", variant: "default" });
      return;
    }
    setIsLoadingExercises(true);
    try {
      for (const masterExerciseId of selectedMasterExercisesForBlock) {
        await addExerciseToBlockReference(selectedPlan.id, currentBlockIdForNewExercise, masterExerciseId);
      }
      toast({ title: "Día(s) Añadido(s)", description: "Los días seleccionados se han añadido a la semana." });
      setIsSelectExerciseDialogOpen(false);
      setCurrentBlockIdForNewExercise(null);
      if (selectedPlan?.id && blocks.length > 0) {
        await performFetchExercisesForPlan(selectedPlan.id, blocks);
      }
    } catch (error) {
      toast({ title: "Error", description: "No se pudieron añadir los días a la semana.", variant: "destructive" });
    } finally {
      setIsLoadingExercises(false);
    }
  };

  const handleRemoveExerciseFromBlock = async (planId: string, blockId: string, masterExerciseId: string) => {
    if (!isUserAdmin) return;
    setIsLoadingExercises(true);
    try {
      await removeExerciseFromBlockReference(planId, blockId, masterExerciseId);
      toast({title: "Día Removido", description: "El día ha sido quitado de esta semana."});
      if (selectedPlan?.id && blocks.length > 0) {
        await performFetchExercisesForPlan(selectedPlan.id, blocks);
      }
    } catch (error) {
      toast({title: "Error", description: "No se pudo quitar el día.", variant: "destructive"});
    } finally {
      setIsLoadingExercises(false);
    }
  };


  const handleSessionDayResultChange = (
    field: keyof Omit<SessionDayResultState, 'observations'> | `observations.${keyof Omit<ExerciseResultObservations, 'additionalNotes'>}` | 'observations.additionalNotes',
    value: string | number | null
  ) => {
    if (!selectedDayForSession) return;

    setSessionDayResult(prev => {
        const currentDayData = prev || {
            plannedReps: selectedDayForSession?.suggestedReps ?? "1 sesión",
            doneReps: 0,
            rating: 3,
            observations: { nostrils: null, lips: null, ears: null, eyes: null, neck: null, back: null, croup: null, limbs: null, tail: null, additionalNotes: "" }
        };

        let updatedDayData = { ...currentDayData };

        if (String(field).startsWith('observations.')) {
            const obsField = String(field).split('.')[1] as keyof ExerciseResultObservations;
            updatedDayData = {
                ...updatedDayData,
                observations: {
                    ...(updatedDayData.observations || { /* Default structure */ }),
                    [obsField]: value === '' || value === 'N/A' ? null : String(value)
                }
            };
        } else if (field === 'doneReps' || field === 'rating') {
            (updatedDayData as any)[field] = Number(value);
        } else if (field === 'plannedReps') {
            (updatedDayData as any)[field] = String(value);
        }
        return updatedDayData;
    });
  };


const handleSaveSessionAndNavigate = async () => {
    if (!currentUser || !date || !selectedHorse || !selectedHorse.id ) {
      toast({ variant: "destructive", title: "Error de Validación", description: "Asegúrate de que la fecha y el caballo estén seleccionados."});
      return;
    }
     if (!selectedPlan) {
        toast({ variant: "destructive", title: "Error de Validación", description: "Selecciona un plan de entrenamiento."});
        return;
    }
    if (!selectedBlock || !selectedBlock.id) {
        toast({ variant: "destructive", title: "Error de Validación", description: "Selecciona una semana para la sesión."});
        return;
    }
    if (!selectedDayForSession || !selectedDayForSession.id) {
        toast({ variant: "destructive", title: "Error de Validación", description: "Selecciona un día para la sesión."});
        return;
    }
    if (!sessionDayResult) {
        toast({ variant: "destructive", title: "Error de Validación", description: "Completa los detalles del día."});
        return;
    }

    setIsSavingSession(true);
    try {
      const sessionInput: SessionDataInput = {
        horseId: selectedHorse.id,
        date: Timestamp.fromDate(date),
        blockId: selectedBlock.id,
        selectedDayExerciseId: selectedDayForSession.id,
        selectedDayExerciseTitle: selectedDayForSession.title,
        overallNote: sessionOverallNote,
      };

      const sessionId = await createSession(sessionInput);

      if (sessionId) {
        const dayResultInput: ExerciseResultInput = {
            exerciseId: selectedDayForSession.id,
            plannedReps: sessionDayResult.plannedReps,
            doneReps: sessionDayResult.doneReps,
            rating: sessionDayResult.rating,
            observations: sessionDayResult.observations && Object.values(sessionDayResult.observations).some(v => v !== null && v !== undefined && String(v).trim() !== '')
                            ? sessionDayResult.observations
                            : null,
        };
        await addExerciseResult(selectedHorse.id, sessionId, dayResultInput);

        toast({ title: "Sesión Guardada", description: "La sesión del día ha sido registrada." });
        setSessionOverallNote("");
        setSelectedDayForSession(null);
        setSessionDayResult(null);

        router.push(`/session/${sessionId}?horseId=${selectedHorse.id}`);
      } else {
        toast({ variant: "destructive", title: "Error", description: "No se pudo crear la sesión." });
      }
    } catch (error) {
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
    if (!isUserAdmin) return;
    const { active, over } = event;

    if (active && over && active.id !== over.id) {
      const activeExerciseId = String(active.id);
      const overExerciseId = String(over.id);

      const activeExercise = exercisesInPlan.find(ex => ex.id === activeExerciseId);
      if (!activeExercise || !selectedPlan?.id) {
          return;
      }

      const blockIdOfDraggedItem = activeExercise.blockId;
      if (!blockIdOfDraggedItem) {
        toast({variant: "destructive", title: "Error", description: "No se pudo determinar la semana del día."});
        return;
      }

      const targetBlock = blocks.find(b => b.id === blockIdOfDraggedItem);
      if (!targetBlock || !targetBlock.exerciseReferences) {
          return;
      }

      let currentReferencesForBlock: ExerciseReference[] = [...targetBlock.exerciseReferences];
      const oldIndex = currentReferencesForBlock.findIndex((ref) => ref.exerciseId === activeExerciseId);
      const newIndex = currentReferencesForBlock.findIndex((ref) => ref.exerciseId === overExerciseId);

      if (oldIndex === -1 || newIndex === -1) {
          return;
      }

      const reorderedReferencesForBlock = arrayMove(currentReferencesForBlock, oldIndex, newIndex).map((ref, index) => ({
        ...ref,
        order: index,
      }));

      setExercisesInPlan(prevExercises => {
        const otherBlocksExercises = prevExercises.filter(ex => ex.blockId !== blockIdOfDraggedItem);
        const reorderedBlockExercises = reorderedReferencesForBlock.map(ref => {
            const masterDetails = prevExercises.find(ex => ex.id === ref.exerciseId);
            return { ...masterDetails!, blockId: blockIdOfDraggedItem, orderInBlock: ref.order };
        });
        const allExercises = [...otherBlocksExercises, ...reorderedBlockExercises];
        return allExercises.sort((a,b) => {
            const blockAOrder = blocks.find(bl => bl.id === a.blockId)?.order ?? Infinity;
            const blockBOrder = blocks.find(bl => bl.id === b.blockId)?.order ?? Infinity;
            if (blockAOrder !== blockBOrder) return blockAOrder - blockBOrder;
            return (a.orderInBlock ?? Infinity) - (b.orderInBlock ?? Infinity);
        });
      });

      try {
        await updateExercisesOrderInBlock(blockIdOfDraggedItem, reorderedReferencesForBlock);
        toast({ title: "Orden de días actualizado", description: "El nuevo orden ha sido guardado." });
        if (selectedPlan?.id && blocks.length > 0) {
            await performFetchExercisesForPlan(selectedPlan.id, blocks);
        }
      } catch (err) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el nuevo orden." });
        if (selectedPlan?.id && blocks.length > 0) {
           await performFetchExercisesForPlan(selectedPlan.id, blocks);
        }
      }
    }
  };

  const handleDragEndBlocks = async (event: DragEndEvent) => {
    if (!isUserAdmin) return;
    const { active, over } = event;

    if (active && over && active.id !== over.id && selectedPlan) {
      setBlocks((prevBlocks) => {
        const oldIndex = prevBlocks.findIndex(b => b.id === String(active.id));
        const newIndex = prevBlocks.findIndex(b => b.id === String(over.id));
        if (oldIndex === -1 || newIndex === -1) return prevBlocks;

        const reorderedBlocks = arrayMove(prevBlocks, oldIndex, newIndex);
        const updatedBlocksForDb = reorderedBlocks.map((block, index) => ({
          ...block,
          order: index,
        }));
        const dbPayload = updatedBlocksForDb.map(b => ({ id: b.id, order: b.order as number }));

        updateBlocksOrder(selectedPlan.id, dbPayload)
          .then(async () => {
            toast({ title: "Orden de semanas actualizado", description: "El nuevo orden de semanas ha sido guardado." });
            await performFetchBlocks(selectedPlan.id);
          })
          .catch(async err => {
            toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el nuevo orden de semanas." });
            if (selectedPlan?.id) {
                await performFetchBlocks(selectedPlan.id);
            }
          });
        return updatedBlocksForDb;
      });
    }
  };

  const filteredMasterExercises = availableMasterExercises.filter(exercise =>
    exercise.title.toLowerCase().includes(exerciseSearchTerm.toLowerCase())
  );

  const daysInSelectedWeek = selectedBlock ? exercisesInPlan.filter(ex => ex.blockId === selectedBlock.id).sort((a,b) => (a.orderInBlock ?? Infinity) - (b.orderInBlock ?? Infinity)) : [];


  return (
    <div className="container mx-auto py-6 sm:py-10">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">

        <div className="md:col-span-2 space-y-6">
          {/* Horse Management Section */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <CardTitle>Mis Caballos</CardTitle>
                  <CardDescription>Gestiona tus caballos y selecciona uno para entrenar.</CardDescription>
                </div>
                <Button onClick={() => setIsAddHorseDialogOpen(true)} className="w-full mt-2 sm:mt-0 sm:w-auto">
                  <Icons.plus className="mr-2 h-4 w-4" /> Añadir Nuevo Caballo
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingHorses ? (
                <div className="flex justify-center py-4"><Icons.spinner className="h-6 w-6 animate-spin" /></div>
              ) : horses.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">No tienes caballos registrados. ¡Añade tu primer caballo!</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {horses.map(horse => (
                    <Button
                      key={horse.id}
                      variant={selectedHorse?.id === horse.id ? "default" : "outline"}
                      onClick={() => setSelectedHorse(horse)}
                      className="h-auto py-3 flex flex-col items-start text-left w-full"
                    >
                      <span className="font-semibold text-base block whitespace-normal">{horse.name}</span>
                      <span className="text-xs opacity-80 block whitespace-normal">{horse.age} años, {horse.sex}, {horse.color}</span>
                    </Button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>


          {selectedHorse ? (
            <Card>
              <CardHeader>
                <CardTitle>Entrenamiento para {selectedHorse.name}</CardTitle>
                <CardDescription>Selecciona un plan y registra tus sesiones.</CardDescription>
              </CardHeader>
              <CardContent>
                 <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                   <TabsList className={`grid w-full ${isUserAdmin ? 'grid-cols-2' : 'grid-cols-1'} mb-4`}>
                    <TabsTrigger value="sesiones">Registrar Sesión</TabsTrigger>
                    {isUserAdmin && <TabsTrigger value="plan">Gestionar Plan (Admin)</TabsTrigger>}
                  </TabsList>

                  <TabsContent value="sesiones">
                     <Card className="border-none p-0">
                      <CardHeader className="px-1 pt-1 pb-3">
                        <CardTitle className="text-xl">Nueva Sesión</CardTitle>
                        <CardDescription>Para {selectedHorse.name} el {date ? date.toLocaleDateString("es-ES") : 'día no seleccionado'}</CardDescription>
                      </CardHeader>
                      <CardContent className="grid gap-4 px-1">
                        {/* Plan Selector for Session Logging */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="w-full justify-start" disabled={isLoadingPlans || trainingPlans.length === 0}>
                                {isLoadingPlans ? "Cargando planes..." : selectedPlan ? selectedPlan.title : "Seleccionar Plan de Entrenamiento"}
                                {!isLoadingPlans && <Icons.chevronDown className="ml-auto h-4 w-4" />}
                            </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                            <DropdownMenuLabel>Planes Disponibles</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {isLoadingPlans ? (
                                <DropdownMenuItem disabled>Cargando...</DropdownMenuItem>
                            ) : trainingPlans.length > 0 ? (
                                trainingPlans.map((plan) => (
                                <DropdownMenuItem
                                    key={plan.id}
                                    onSelect={() => {
                                        setSelectedPlan(plan);
                                        // performFetchBlocks will auto-select first week
                                    }}
                                >
                                    {plan.title} {plan.template && "(Plantilla)"}
                                </DropdownMenuItem>
                                ))
                            ) : (
                                <DropdownMenuItem disabled>No hay planes</DropdownMenuItem>
                            )}
                            </DropdownMenuContent>
                        </DropdownMenu>

                        {/* Week Selector */}
                        {selectedPlan && (
                            <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="w-full justify-start" disabled={!selectedPlan || blocks.length === 0 || isLoadingBlocks}>
                                {isLoadingBlocks ? "Cargando semanas..." : (selectedBlock && blocks.some(b => b.id === selectedBlock.id)) ? selectedBlock.title : "Seleccionar Semana"}
                                {!isLoadingBlocks && <Icons.chevronDown className="ml-auto h-4 w-4" />}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                                <DropdownMenuLabel>Semanas del Plan: {selectedPlan?.title || "N/A"}</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                {isLoadingBlocks ? (
                                    <DropdownMenuItem disabled>Cargando semanas...</DropdownMenuItem>
                                ) : blocks.length > 0 ? (
                                blocks.sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity)).map((block) => (
                                    <DropdownMenuItem key={block.id} onSelect={() => setSelectedBlock(block)}>
                                        {block.title}
                                        {block.notes && <span className="text-xs text-muted-foreground ml-1">({block.notes})</span>}
                                    </DropdownMenuItem>
                                ))
                                ) : (
                                <DropdownMenuItem disabled>No hay semanas en el plan</DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                            </DropdownMenu>
                        )}

                        {/* Day Selector (visible after week is selected) */}
                        {selectedBlock && (
                          <>
                            <Label>Seleccionar Día de la {selectedBlock.title}:</Label>
                            {isLoadingExercises && daysInSelectedWeek.length === 0 && selectedBlock.exerciseReferences && selectedBlock.exerciseReferences.length > 0 ? (
                                <div className="flex items-center p-2"><Icons.spinner className="h-4 w-4 animate-spin mr-2" /> Cargando días...</div>
                            ): daysInSelectedWeek.length > 0 ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {daysInSelectedWeek.map(day => (
                                  <Button
                                    key={day.id}
                                    variant={selectedDayForSession?.id === day.id ? "default" : "outline"}
                                    onClick={() => {
                                      setSelectedDayForSession(day);
                                      setSessionDayResult({
                                        plannedReps: day.suggestedReps ?? "1 sesión",
                                        doneReps: 0,
                                        rating: 3,
                                        observations: { nostrils: null, lips: null, ears: null, eyes: null, neck: null, back: null, croup: null, limbs: null, tail: null, additionalNotes: "" }
                                      });
                                    }}
                                    className="h-auto py-2 text-left flex flex-col items-start w-full overflow-hidden"
                                  >
                                    <span className="font-semibold block w-full whitespace-normal break-words">{day.title}</span>
                                    {day.objective && (
                                      <span className={`text-xs block w-full whitespace-normal break-words ${selectedDayForSession?.id === day.id ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                                        {day.objective}
                                      </span>
                                    )}
                                  </Button>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground p-2">Esta semana no tiene días definidos. {isUserAdmin ? "Añade días en la pestaña 'Plan'." : ""}</p>
                            )}
                          </>
                        )}

                        {selectedDayForSession && sessionDayResult && (
                            <Card className="p-4 space-y-3 mt-4 shadow-inner bg-muted/30">
                                <h3 className="text-lg font-semibold">Detalles para: {selectedDayForSession.title}</h3>
                                <div>
                                    <Label htmlFor="session-overall-note">Notas Generales de la Sesión (para este día)</Label>
                                    <Textarea
                                        id="session-overall-note"
                                        placeholder="Comentarios generales sobre la sesión de hoy..."
                                        value={sessionOverallNote}
                                        onChange={(e) => setSessionOverallNote(e.target.value)}
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor={`day-plannedReps`}>Planificado</Label>
                                        <Input
                                            id={`day-plannedReps`}
                                            type="text"
                                            placeholder="Ej: 1 sesión, 45 min"
                                            value={sessionDayResult.plannedReps ?? ''}
                                            onChange={(e) => handleSessionDayResultChange('plannedReps', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor={`day-doneReps`}>Realizado (0=No, 1=Sí)</Label>
                                        <Input
                                            id={`day-doneReps`}
                                            type="number"
                                            min="0" max="1" step="1"
                                            placeholder="1"
                                            value={String(sessionDayResult.doneReps)}
                                            onChange={(e) => handleSessionDayResultChange('doneReps', e.target.value)}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <Label htmlFor={`day-rating`}>Calificación del Día (1-5): {sessionDayResult.rating}</Label>
                                    <Slider
                                        id={`day-rating`}
                                        value={[sessionDayResult.rating]}
                                        min={1}
                                        max={5}
                                        step={1}
                                        className="mt-1"
                                        onValueChange={(value) => handleSessionDayResultChange('rating', value[0])}
                                    />
                                </div>

                                <div className="pt-3 border-t mt-3">
                                    <div className="space-y-1 mb-3">
                                        <Label htmlFor={`day-obs-additionalNotes`}>Notas Adicionales (específicas del día)</Label>
                                        <Textarea
                                            id={`day-obs-additionalNotes`}
                                            placeholder="Notas sobre el rendimiento, dificultades, etc."
                                            value={sessionDayResult.observations?.additionalNotes || ''}
                                            onChange={(e) => handleSessionDayResultChange(`observations.additionalNotes`, e.target.value)}
                                        />
                                    </div>
                                    <h4 className="text-md font-semibold mb-2">Observaciones de Tensión:</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-3">
                                        {OBSERVATION_ZONES.map(zone => (
                                        <div key={zone.id} className="space-y-1">
                                            <Label htmlFor={`day-obs-${zone.id}`}>{zone.label}</Label>
                                            <Select
                                            value={sessionDayResult.observations?.[zone.id as keyof Omit<ExerciseResultObservations, 'additionalNotes'>] || ''}
                                            onValueChange={(value) => handleSessionDayResultChange(`observations.${zone.id as keyof Omit<ExerciseResultObservations, 'additionalNotes'>}`, value === 'N/A' ? 'N/A' : (value || null))}
                                            >
                                            <SelectTrigger id={`day-obs-${zone.id}`}>
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
                                <div className="flex justify-end mt-2">
                                  <Button
                                    onClick={handleSaveSessionAndNavigate}
                                    disabled={isSavingSession || !date || !selectedHorse || !selectedBlock || !selectedDayForSession || !sessionDayResult}
                                  >
                                    {isSavingSession && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                                    Guardar Sesión del Día
                                  </Button>
                                </div>
                            </Card>
                        )}
                         {!selectedDayForSession && selectedBlock && daysInSelectedWeek.length > 0 && (
                            <p className="text-center text-muted-foreground mt-4">Por favor, selecciona un día de la lista de arriba para registrar sus detalles.</p>
                        )}
                        {!selectedPlan && (
                            <p className="text-center text-muted-foreground mt-4">Selecciona un plan de entrenamiento para empezar.</p>
                        )}
                         {selectedPlan && !selectedBlock && blocks.length > 0 && (
                            <p className="text-center text-muted-foreground mt-4">Selecciona una semana para continuar.</p>
                        )}


                      </CardContent>
                    </Card>
                  </TabsContent>

                  {isUserAdmin && (
                    <TabsContent value="plan">
                        <Card className="my-4 border-none p-0">
                        <CardHeader className="px-1 pt-1 pb-3">
                            <CardTitle className="text-xl">Gestionar Plan Activo</CardTitle>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-2">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                        <Button variant="outline" className="w-full sm:w-auto justify-between flex-grow" disabled={!isUserAdmin}>
                                            {isLoadingPlans ? "Cargando planes..." : selectedPlan ? selectedPlan.title : "Seleccionar Plan"}
                                            {!isLoadingPlans && <Icons.chevronDown className="ml-2 h-4 w-4" />}
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
                                                    // performFetchBlocks will auto-select first week
                                                }}
                                                disabled={!isUserAdmin}
                                            >
                                                {plan.title} {plan.template && "(Plantilla)"}
                                            </DropdownMenuItem>
                                            ))
                                        ) : (
                                            <DropdownMenuItem disabled>No hay planes disponibles</DropdownMenuItem>
                                        )}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    {isUserAdmin && (
                                        <Button onClick={() => setIsCreatePlanDialogOpen(true)} className="w-full sm:w-auto flex-shrink-0">
                                            <Icons.plus className="mr-2 h-4 w-4" /> Crear Plan
                                        </Button>
                                    )}
                                </div>
                                {selectedPlan && isUserAdmin && (
                                    <AlertDialog open={isDeletePlanDialogOpen} onOpenChange={setIsDeletePlanDialogOpen}>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                        variant="destructive"
                                        size="sm"
                                        className="w-full sm:w-auto mt-2 sm:mt-0"
                                        disabled={!selectedPlan || isDeletingPlan}
                                        >
                                        {isDeletingPlan ? <Icons.spinner className="mr-2 h-4 w-4 animate-spin" /> : <Icons.trash className="mr-2 h-4 w-4" />}
                                        Eliminar Plan
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                        <AlertDialogTitle>¿Estás realmente seguro?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Esta acción no se puede deshacer. Esto eliminará permanentemente el plan &quot;{selectedPlan?.title}&quot;
                                            y todas sus semanas y días asociados.
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
                            {selectedPlan && <CardDescription className="mt-2">Plan activo (admin): {selectedPlan.title}</CardDescription>}
                        </CardHeader>
                        <CardContent className="px-1">
                        {!isUserAdmin && <p className="text-muted-foreground text-center py-4">La gestión de planes es solo para administradores.</p>}
                        {isUserAdmin && isLoadingPlans ? (
                            <div className="flex items-center justify-center p-4"><Icons.spinner className="h-5 w-5 animate-spin mr-2" /> Cargando información del plan...</div>
                        ) : isUserAdmin && selectedPlan ? (
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndBlocks}>
                                <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy} disabled={!isUserAdmin}>
                                    <Accordion type="single" collapsible className="w-full space-y-2">
                                    {(isLoadingBlocks && blocks.length === 0) ? (
                                    <div className="flex items-center justify-center p-4"><Icons.spinner className="h-5 w-5 animate-spin mr-2" /> Cargando semanas...</div>
                                    ) : blocks.length === 0 && !isLoadingBlocks ? (
                                        <p className="text-sm text-muted-foreground p-2 text-center">Este plan no tiene semanas. ¡Añade la primera!</p>
                                    ) : (
                                    blocks.map((block) => {
                                        const daysInThisWeek = exercisesInPlan.filter(ex => ex.blockId === block.id).sort((a,b) => (a.orderInBlock ?? Infinity) - (b.orderInBlock ?? Infinity));
                                        return (
                                        <SortableBlockAccordionItem
                                            key={block.id}
                                            block={block}
                                            onEditBlock={openEditBlockDialog}
                                            canEdit={isUserAdmin}
                                        >
                                            <AccordionContent className="px-1 sm:px-2.5">
                                            {block.goal && (
                                                <p className="text-sm text-primary font-semibold mb-2">
                                                Meta de la Semana: <span className="font-normal text-muted-foreground">{block.goal}</span>
                                                </p>
                                            )}
                                            {isLoadingExercises && daysInThisWeek.length === 0 && block.exerciseReferences && block.exerciseReferences.length > 0 ? (
                                                <div className="flex items-center justify-center p-4">
                                                    <Icons.spinner className="h-5 w-5 animate-spin mr-2" /> Cargando días...
                                                </div>
                                            ) : daysInThisWeek.length > 0 ? (
                                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndExercises}>
                                                <SortableContext items={daysInThisWeek.map(e => e.id)} strategy={verticalListSortingStrategy} disabled={!isUserAdmin}>
                                                    <ul className="list-none pl-0 space-y-1 text-sm">
                                                    {daysInThisWeek.map((exercise) => (
                                                        <SortableExerciseItem
                                                            key={exercise.id}
                                                            exercise={exercise}
                                                            blockId={block.id}
                                                            planId={selectedPlan.id}
                                                            onRemove={handleRemoveExerciseFromBlock}
                                                            canEdit={isUserAdmin}
                                                        />
                                                    ))}
                                                    </ul>
                                                </SortableContext>
                                            </DndContext>
                                            ) : (
                                            <p className="text-sm text-muted-foreground p-2">
                                                Esta semana no tiene días definidos.
                                            </p>
                                            )}
                                            {isUserAdmin && (
                                                <Button size="sm" variant="outline" className="mt-2" onClick={() => openSelectExerciseDialog(block.id)}>
                                                    <Icons.plus className="mr-2 h-4 w-4" /> Añadir Día
                                                </Button>
                                            )}
                                        </AccordionContent>
                                        </SortableBlockAccordionItem>
                                    )})
                                    )}
                                    </Accordion>
                                </SortableContext>
                            {isUserAdmin && (
                                <div className="flex flex-wrap justify-end mt-4 gap-2">
                                    <Button onClick={() => setIsAddBlockDialogOpen(true)} disabled={!selectedPlan || isLoadingBlocks}>
                                        <Icons.plus className="mr-2 h-4 w-4" /> Añadir Semana
                                    </Button>
                                </div>
                            )}
                            </DndContext>
                            ) : isUserAdmin && (
                            <p className="text-sm text-muted-foreground p-2 text-center">Selecciona o crea un plan de entrenamiento para gestionarlo.</p>
                            )}
                        </CardContent>
                        </Card>
                    </TabsContent>
                  )}
                </Tabs>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64 text-center p-4">
                <Icons.logo className="w-16 h-16 mb-4 text-muted-foreground" data-ai-hint="horse head pointing" />
                <p className="text-muted-foreground">Selecciona un caballo para ver sus detalles o registra uno nuevo.</p>
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="md:col-span-1 row-start-1 md:row-auto">
          <CardHeader>
            <CardTitle>Calendario</CardTitle>
            <CardDescription>
              Selecciona la fecha de tu sesión.
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

    {isUserAdmin && (
        <>
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
                    <DialogTitle>Añadir Nueva Semana al Plan</DialogTitle>
                    <DialogDescription>Añade una semana a "{selectedPlan?.title}".</DialogDescription>
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
                    <DialogTitle>Editar Semana</DialogTitle>
                    <DialogDescription>Modifica los detalles de la semana "{editingBlock?.title}".</DialogDescription>
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

            <Dialog open={isSelectExerciseDialogOpen} onOpenChange={(open) => {
                if (!open) {
                setCurrentBlockIdForNewExercise(null);
                setExerciseSearchTerm("");
                }
                setIsSelectExerciseDialogOpen(open);
            }}>
                <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Añadir Días a la Semana</DialogTitle>
                    <DialogDescription>
                    Selecciona Días (plantillas de MasterExercise) para añadir a la semana: {blocks.find(b => b.id === currentBlockIdForNewExercise)?.title || ""}
                    </DialogDescription>
                </DialogHeader>
                <div className="my-4">
                    <Input
                    type="search"
                    placeholder="Buscar días por título..."
                    value={exerciseSearchTerm}
                    onChange={(e) => setExerciseSearchTerm(e.target.value)}
                    className="w-full"
                    />
                </div>
                <div className="space-y-4 max-h-[50vh] overflow-y-auto">
                    {isLoadingMasterExercises ? (
                    <div className="flex justify-center"><Icons.spinner className="h-6 w-6 animate-spin" /></div>
                    ) : filteredMasterExercises.length === 0 && availableMasterExercises.length > 0 ? (
                        <p className="text-center text-muted-foreground">No se encontraron días con &quot;{exerciseSearchTerm}&quot;.</p>
                    ) : filteredMasterExercises.length === 0 && availableMasterExercises.length === 0 ? (
                    <p className="text-center text-muted-foreground">No hay plantillas de día en la biblioteca. <Link href="/library/exercises" className="text-primary hover:underline" onClick={() => setIsSelectExerciseDialogOpen(false)}>Añade algunas primero.</Link></p>
                    ) : (
                    filteredMasterExercises.map(masterEx => (
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
                    setExerciseSearchTerm("");
                    }}>
                    Cancelar
                    </Button>
                    <Button onClick={handleAddSelectedExercisesToBlock} disabled={isLoadingMasterExercises || selectedMasterExercisesForBlock.size === 0}>
                    Añadir Seleccionados ({selectedMasterExercisesForBlock.size})
                    </Button>
                </div>
                </DialogContent>
            </Dialog>
        </>
    )}

    </div>
  );
};

export default Dashboard;

