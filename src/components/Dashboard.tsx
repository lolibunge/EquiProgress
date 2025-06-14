
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
import { useState, useEffect, useCallback, ReactNode, useMemo } from "react";
import type { User } from 'firebase/auth';
import { useAuth } from "@/context/AuthContext"; // Ensure this is imported
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';

import { createSession, addExerciseResult } from "@/services/session";
import { getHorses as fetchHorsesService, getHorseById, addHorse, startPlanForHorse, updateDayCompletionStatus } from "@/services/horse";
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
import { Progress } from "@/components/ui/progress";


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
} from '@dnd-kit/sortable'; // Corrected import
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

  const [trainingPlans, setTrainingPlans] = useState<TrainingPlan[]>([]); // All available plans
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [selectedPlanForSession, setSelectedPlanForSession] = useState<TrainingPlan | null>(null); // Plan selected in dropdown for session logging OR active plan
  
  const [currentActiveBlock, setCurrentActiveBlock] = useState<TrainingBlock | null>(null); // The horse's current block (Etapa)
  const [isLoadingCurrentBlock, setIsLoadingCurrentBlock] = useState(false);
  
  const [daysInCurrentBlock, setDaysInCurrentBlock] = useState<BlockExerciseDisplay[]>([]); // Days for the current active block
  const [isLoadingDaysInBlock, setIsLoadingDaysInBlock] = useState(false);
  const [selectedDayForSession, setSelectedDayForSession] = useState<BlockExerciseDisplay | null>(null); // Selected "Day" for logging

  const [date, setDate] = useState<Date | undefined>(new Date());

  const [sessionOverallNote, setSessionOverallNote] = useState("");
  const [sessionDayResult, setSessionDayResult] = useState<SessionDayResultState | null>(null);
  const [isSavingSession, setIsSavingSession] = useState(false);

  // Admin "Gestionar Plan" tab states
  const [selectedPlanForAdmin, setSelectedPlanForAdmin] = useState<TrainingPlan | null>(null);
  const [blocksForAdminPlan, setBlocksForAdminPlan] = useState<TrainingBlock[]>([]);
  const [isLoadingBlocksForAdmin, setIsLoadingBlocksForAdmin] = useState(false);
  const [exercisesForAdminPlan, setExercisesForAdminPlan] = useState<BlockExerciseDisplay[]>([]);
  const [isLoadingExercisesForAdmin, setIsLoadingExercisesForAdmin] = useState(false);

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
  
  const isUserAdmin = !!userProfile && userProfile.role === 'admin';
  
  const initialLoadingComplete = !isLoadingHorses && !isLoadingPlans && !authLoading;
  const [activeTab, setActiveTab] = useState("sesiones");

  console.log(`%c[Dashboard Render] currentUser UID: ${currentUser?.uid}, userProfile: ${JSON.stringify(userProfile)}, isUserAdmin: ${isUserAdmin}, authLoading: ${authLoading}`, "color: blue; font-weight: bold;");
  if (selectedHorse) {
    console.log(`%c[Dashboard Render] selectedHorse.activePlanId: ${selectedHorse.activePlanId}. Dropdown to start new plan will show if this is falsy (null, undefined, or empty string).`, "color: teal; font-weight: bold;");
  }


  useEffect(() => {
    if (initialLoadingComplete) {
      if (isUserAdmin) {
        console.log("[Dashboard] Defaulting admin to 'plan' tab.");
        setActiveTab("plan");
      } else {
        console.log("[Dashboard] Defaulting non-admin to 'sesiones' tab.");
        setActiveTab("sesiones");
      }
    }
  }, [isUserAdmin, initialLoadingComplete]);


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
        setSelectedHorse(userHorses[0]); 
      } else if (userHorses.length === 0) {
        setSelectedHorse(null);
        setSelectedPlanForSession(null);
        setCurrentActiveBlock(null);
        setDaysInCurrentBlock([]);
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


  const performFetchAllPlans = useCallback(async () => {
    console.log("[Dashboard - performFetchAllPlans] Attempting to fetch all plans.");
    setIsLoadingPlans(true);
    try {
      const plans = await getTrainingPlans();
      console.log("[Dashboard - performFetchAllPlans] Fetched plans raw from service:", JSON.stringify(plans, null, 2));
      setTrainingPlans(plans);
    } catch (error) {
      toast({ variant: "destructive", title: "Error al Cargar Planes", description: "No se pudieron cargar los planes." });
      console.error("[Dashboard - performFetchAllPlans] Error fetching plans:", error);
      setTrainingPlans([]);
    } finally {
      setIsLoadingPlans(false);
      console.log("[Dashboard - performFetchAllPlans] Finished fetching plans. isLoadingPlans:", false);
    }
  }, [toast]);

  useEffect(() => { // Fetch all available plans once
    if (currentUser) {
      performFetchAllPlans();
    } else {
      setTrainingPlans([]);
      setSelectedPlanForSession(null);
      setSelectedPlanForAdmin(null);
      setIsLoadingPlans(false);
    }
  }, [currentUser, performFetchAllPlans]);


  const fetchHorseActivePlanDetails = useCallback(async (horse: Horse) => {
    if (!horse.activePlanId || !horse.currentBlockId) {
      setSelectedPlanForSession(null);
      setCurrentActiveBlock(null);
      setDaysInCurrentBlock([]);
      setIsLoadingCurrentBlock(false);
      setIsLoadingDaysInBlock(false);
      return;
    }
    setIsLoadingCurrentBlock(true);
    setIsLoadingDaysInBlock(true);
    try {
      const plan = trainingPlans.find(p => p.id === horse.activePlanId) || await getTrainingPlans().then(plans => plans.find(p => p.id === horse.activePlanId));
      setSelectedPlanForSession(plan || null);

      const block = await getBlockById(horse.currentBlockId);
      setCurrentActiveBlock(block);
      if (block) {
        const days = await getExercisesForBlock(block.id);
        setDaysInCurrentBlock(days);
      } else {
        setDaysInCurrentBlock([]);
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudo cargar el plan activo del caballo." });
      setSelectedPlanForSession(null);
      setCurrentActiveBlock(null);
      setDaysInCurrentBlock([]);
    } finally {
      setIsLoadingCurrentBlock(false);
      setIsLoadingDaysInBlock(false);
    }
  }, [toast, trainingPlans]); // Added trainingPlans dependency

  useEffect(() => {
    if (selectedHorse) {
        fetchHorseActivePlanDetails(selectedHorse);
        setSelectedDayForSession(null); // Reset selected day when horse changes
        setSessionDayResult(null);
    } else {
        setSelectedPlanForSession(null);
        setCurrentActiveBlock(null);
        setDaysInCurrentBlock([]);
        setSelectedDayForSession(null);
        setSessionDayResult(null);
    }
  }, [selectedHorse, fetchHorseActivePlanDetails]);

  // For Admin Tab: Fetch blocks and exercises when selectedPlanForAdmin changes
 const fetchDetailsForAdminPlan = useCallback(async (planId: string) => {
    if (!planId) {
      setBlocksForAdminPlan([]);
      setExercisesForAdminPlan([]);
      return;
    }
    setIsLoadingBlocksForAdmin(true);
    setIsLoadingExercisesForAdmin(true);
    try {
      const fetchedBlocks = await getTrainingBlocks(planId);
      const sortedBlocks = fetchedBlocks.sort((a,b) => (a.order ?? Infinity) - (b.order ?? Infinity));
      setBlocksForAdminPlan(sortedBlocks);
      
      let allExercises: BlockExerciseDisplay[] = [];
      if (sortedBlocks.length > 0) {
        for (const block of sortedBlocks) {
          const blockExercises = await getExercisesForBlock(block.id);
          allExercises = [...allExercises, ...blockExercises.map(ex => ({...ex, blockId: block.id}))];
        }
        setExercisesForAdminPlan(allExercises.sort((a,b) => {
            const blockAOrder = sortedBlocks.find(bl => bl.id === a.blockId)?.order ?? Infinity;
            const blockBOrder = sortedBlocks.find(bl => bl.id === b.blockId)?.order ?? Infinity;
            if (blockAOrder !== blockBOrder) return blockAOrder - blockBOrder;
            return (a.orderInBlock ?? Infinity) - (b.orderInBlock ?? Infinity);
        }));
      } else {
        setExercisesForAdminPlan([]);
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar detalles del plan para admin." });
      setBlocksForAdminPlan([]);
      setExercisesForAdminPlan([]);
    } finally {
      setIsLoadingBlocksForAdmin(false);
      setIsLoadingExercisesForAdmin(false);
    }
  }, [toast]);

  useEffect(() => {
    if (selectedPlanForAdmin?.id && activeTab === 'plan') {
      fetchDetailsForAdminPlan(selectedPlanForAdmin.id);
    } else {
      setBlocksForAdminPlan([]);
      setExercisesForAdminPlan([]);
    }
  }, [selectedPlanForAdmin, activeTab, fetchDetailsForAdminPlan]);


  const handleHorseAdded = async () => {
    setIsAddHorseDialogOpen(false);
    if (currentUser?.uid) {
        await performFetchHorses(currentUser.uid);
        // If it was the first horse added, it will be auto-selected by performFetchHorses
    }
  };
  const handleAddHorseCancel = () => setIsAddHorseDialogOpen(false);

  const handleAdminPlanSelected = (plan: TrainingPlan) => {
    setSelectedPlanForAdmin(plan);
  };

  const handlePlanAdded = (newPlanId: string) => {
    setIsCreatePlanDialogOpen(false);
    performFetchAllPlans().then(() => {
      getTrainingPlans().then(refreshedPlans => { // Re-fetch to ensure latest list
        setTrainingPlans(refreshedPlans);
        const newPlan = refreshedPlans.find(p => p.id === newPlanId);
        if (newPlan) {
          setSelectedPlanForAdmin(newPlan); // Select newly added plan in admin tab
        }
      });
    });
  };

  const handlePlanDeleted = () => {
    setIsDeletePlanDialogOpen(false);
    setSelectedPlanForAdmin(null);
    performFetchAllPlans(); // Refresh the list of all plans
    if (selectedHorse && selectedHorse.activePlanId === selectedPlanForAdmin?.id) {
        // If the deleted plan was active for the current horse, clear its active plan
        setSelectedHorse(prev => prev ? ({...prev, activePlanId: null, currentBlockId: null, activePlanStartDate: null, planProgress: {}}) : null);
    }
  };

  const handleDeleteSelectedPlan = async () => {
    if (!selectedPlanForAdmin || !isUserAdmin) return;
    setIsDeletingPlan(true);
    try {
      await deleteTrainingPlan(selectedPlanForAdmin.id);
      toast({
        title: "Plan Eliminado",
        description: `El plan "${selectedPlanForAdmin.title}" y todo su contenido han sido eliminados.`,
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
    if (selectedPlanForAdmin?.id) {
      fetchDetailsForAdminPlan(selectedPlanForAdmin.id);
    }
  };

  const handleBlockUpdated = () => {
    setIsEditBlockDialogOpen(false);
    setEditingBlock(null);
    if (selectedPlanForAdmin?.id) {
      fetchDetailsForAdminPlan(selectedPlanForAdmin.id);
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
    if (!selectedPlanForAdmin?.id || !currentBlockIdForNewExercise || selectedMasterExercisesForBlock.size === 0 || !isUserAdmin) {
      toast({ title: "Nada Seleccionado", description: "Por favor, selecciona al menos un día.", variant: "default" });
      return;
    }
    setIsLoadingExercisesForAdmin(true);
    try {
      for (const masterExerciseId of selectedMasterExercisesForBlock) {
        await addExerciseToBlockReference(selectedPlanForAdmin.id, currentBlockIdForNewExercise, masterExerciseId);
      }
      toast({ title: "Día(s) Añadido(s)", description: "Los días seleccionados se han añadido a la semana." });
      setIsSelectExerciseDialogOpen(false);
      setCurrentBlockIdForNewExercise(null);
      if (selectedPlanForAdmin?.id) {
        await fetchDetailsForAdminPlan(selectedPlanForAdmin.id);
      }
    } catch (error) {
      toast({ title: "Error", description: "No se pudieron añadir los días a la semana.", variant: "destructive" });
    } finally {
      setIsLoadingExercisesForAdmin(false);
    }
  };

  const handleRemoveExerciseFromBlock = async (planId: string, blockId: string, masterExerciseId: string) => {
    if (!isUserAdmin) return;
    setIsLoadingExercisesForAdmin(true);
    try {
      await removeExerciseFromBlockReference(planId, blockId, masterExerciseId);
      toast({title: "Día Removido", description: "El día ha sido quitado de esta semana."});
      if (selectedPlanForAdmin?.id) {
        await fetchDetailsForAdminPlan(selectedPlanForAdmin.id);
      }
    } catch (error) {
      toast({title: "Error", description: "No se pudo quitar el día.", variant: "destructive"});
    } finally {
      setIsLoadingExercisesForAdmin(false);
    }
  };


  const handleDayCheckboxChange = async (dayId: string, completed: boolean) => {
    if (!selectedHorse || !currentActiveBlock) return;
    
    setSelectedDayForSession(prevDay => {
        if (prevDay?.id === dayId) {
            setSessionDayResult(prevResult => {
                if (!prevResult) return null;
                return {...prevResult, doneReps: completed ? 1 : 0};
            });
        }
        return prevDay;
    });

    try {
        await updateDayCompletionStatus(selectedHorse.id, currentActiveBlock.id, dayId, completed);
        // Refresh horse data to get updated planProgress
        const updatedHorse = await getHorseById(selectedHorse.id);
        if (updatedHorse) {
            setSelectedHorse(updatedHorse); // This will trigger re-calculation of progress bar
        }
        toast({title: "Progreso Actualizado", description: `Día ${completed ? 'completado' : 'marcado como no completado'}.`});
    } catch (error) {
        toast({variant: "destructive", title: "Error", description: "No se pudo actualizar el estado del día."});
        // Revert UI change if needed or re-fetch to be sure
        const previousHorseState = await getHorseById(selectedHorse.id);
        if (previousHorseState) setSelectedHorse(previousHorseState);
    }
  };

  const handleSessionDayResultChange = (
    field: keyof Omit<SessionDayResultState, 'observations'> | `observations.${keyof Omit<ExerciseResultObservations, 'additionalNotes'>}` | 'observations.additionalNotes',
    value: string | number | boolean | null
  ) => {
    if (!selectedDayForSession) return;

    setSessionDayResult(prev => {
        const currentDayData = prev || {
            plannedReps: selectedDayForSession?.suggestedReps ?? "1 sesión",
            doneReps: selectedHorse?.planProgress?.[currentActiveBlock?.id || '']?.[selectedDayForSession.id]?.completed ? 1 : 0,
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
        } else if (field === 'doneReps') {
            (updatedDayData as any)[field] = value ? 1 : 0;
             // Also update the main horse progress when the detailed session checkbox is toggled
            if (selectedHorse && currentActiveBlock && selectedDayForSession) {
                updateDayCompletionStatus(selectedHorse.id, currentActiveBlock.id, selectedDayForSession.id, !!value);
                 // Refresh horse data to get updated planProgress after day completion status change
                getHorseById(selectedHorse.id).then(horse => {
                    if (horse) setSelectedHorse(horse);
                });
            }
        } else if (field === 'rating') {
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
    if (!selectedHorse.activePlanId || !selectedHorse.currentBlockId) {
        toast({ variant: "destructive", title: "Error", description: "El caballo no tiene un plan activo o etapa actual."});
        return;
    }
    if (!currentActiveBlock) { // Should be set if horse.currentBlockId exists
        toast({ variant: "destructive", title: "Error", description: "No se pudo cargar la etapa activa."});
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
        blockId: selectedHorse.currentBlockId, 
        selectedDayExerciseId: selectedDayForSession.id,
        selectedDayExerciseTitle: selectedDayForSession.title,
        overallNote: sessionOverallNote,
      };

      const sessionId = await createSession(sessionInput);

      if (sessionId) {
        const dayResultInput: ExerciseResultInput = {
            exerciseId: selectedDayForSession.id,
            plannedReps: sessionDayResult.plannedReps,
            doneReps: sessionDayResult.doneReps, // This reflects the checkbox in the session details
            rating: sessionDayResult.rating,
            observations: sessionDayResult.observations && Object.values(sessionDayResult.observations).some(v => v !== null && v !== undefined && String(v).trim() !== '')
                            ? sessionDayResult.observations
                            : null,
        };
        await addExerciseResult(selectedHorse.id, sessionId, dayResultInput);

        // Ensure the main horse progress is also updated based on the session's "doneReps"
        await updateDayCompletionStatus(selectedHorse.id, selectedHorse.currentBlockId, selectedDayForSession.id, sessionDayResult.doneReps === 1);
        const updatedHorse = await getHorseById(selectedHorse.id); // Re-fetch horse to update UI
        if (updatedHorse) setSelectedHorse(updatedHorse);

        toast({ title: "Sesión Guardada", description: "La sesión del día ha sido registrada." });
        // Don't reset selectedDayForSession or sessionDayResult here, allow user to navigate or log another
        // Resetting overall note might be good
        setSessionOverallNote("");


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
    if (!isUserAdmin || !selectedPlanForAdmin) return;
    const { active, over } = event;

    if (active && over && active.id !== over.id) {
      const activeExerciseId = String(active.id);
      const overExerciseId = String(over.id);

      const activeExercise = exercisesForAdminPlan.find(ex => ex.id === activeExerciseId);
      if (!activeExercise) return;

      const blockIdOfDraggedItem = activeExercise.blockId;
      if (!blockIdOfDraggedItem) {
        toast({variant: "destructive", title: "Error", description: "No se pudo determinar la semana del día."});
        return;
      }

      const targetBlock = blocksForAdminPlan.find(b => b.id === blockIdOfDraggedItem);
      if (!targetBlock || !targetBlock.exerciseReferences) return;

      let currentReferencesForBlock: ExerciseReference[] = [...targetBlock.exerciseReferences];
      const oldIndex = currentReferencesForBlock.findIndex((ref) => ref.exerciseId === activeExerciseId);
      const newIndex = currentReferencesForBlock.findIndex((ref) => ref.exerciseId === overExerciseId);

      if (oldIndex === -1 || newIndex === -1) return;

      const reorderedReferencesForBlock = arrayMove(currentReferencesForBlock, oldIndex, newIndex).map((ref, index) => ({
        ...ref,
        order: index,
      }));

      setExercisesForAdminPlan(prevExercises => { // Update local state for optimistic UI
        const otherBlocksExercises = prevExercises.filter(ex => ex.blockId !== blockIdOfDraggedItem);
        const reorderedBlockExercises = reorderedReferencesForBlock.map(ref => {
            const masterDetails = prevExercises.find(ex => ex.id === ref.exerciseId);
            return { ...masterDetails!, blockId: blockIdOfDraggedItem, orderInBlock: ref.order }; // Ensure orderInBlock is correctly updated
        });
        const allExercises = [...otherBlocksExercises, ...reorderedBlockExercises];
        return allExercises.sort((a,b) => {
            const blockAOrder = blocksForAdminPlan.find(bl => bl.id === a.blockId)?.order ?? Infinity;
            const blockBOrder = blocksForAdminPlan.find(bl => bl.id === b.blockId)?.order ?? Infinity;
            if (blockAOrder !== blockBOrder) return blockAOrder - blockBOrder;
            return (a.orderInBlock ?? Infinity) - (b.orderInBlock ?? Infinity);
        });
      });
      

      try {
        await updateExercisesOrderInBlock(blockIdOfDraggedItem, reorderedReferencesForBlock);
        toast({ title: "Orden de días actualizado", description: "El nuevo orden ha sido guardado." });
        await fetchDetailsForAdminPlan(selectedPlanForAdmin.id); // Re-fetch to confirm
      } catch (err) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el nuevo orden." });
        await fetchDetailsForAdminPlan(selectedPlanForAdmin.id); // Re-fetch to revert optimistic update
      }
    }
  };

  const handleDragEndBlocks = async (event: DragEndEvent) => {
    if (!isUserAdmin || !selectedPlanForAdmin) return;
    const { active, over } = event;

    if (active && over && active.id !== over.id) {
      setBlocksForAdminPlan((prevBlocks) => {
        const oldIndex = prevBlocks.findIndex(b => b.id === String(active.id));
        const newIndex = prevBlocks.findIndex(b => b.id === String(over.id));
        if (oldIndex === -1 || newIndex === -1) return prevBlocks;

        const reorderedBlocks = arrayMove(prevBlocks, oldIndex, newIndex);
        const updatedBlocksForDb = reorderedBlocks.map((block, index) => ({
          ...block,
          order: index,
        }));
        const dbPayload = updatedBlocksForDb.map(b => ({ id: b.id, order: b.order as number }));

        updateBlocksOrder(selectedPlanForAdmin.id, dbPayload)
          .then(async () => {
            toast({ title: "Orden de semanas actualizado", description: "El nuevo orden de semanas ha sido guardado." });
            await fetchDetailsForAdminPlan(selectedPlanForAdmin.id);
          })
          .catch(async err => {
            toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el nuevo orden de semanas." });
            await fetchDetailsForAdminPlan(selectedPlanForAdmin.id);
          });
        return updatedBlocksForDb; // Optimistic update
      });
    }
  };

  const filteredMasterExercises = availableMasterExercises.filter(exercise =>
    exercise.title.toLowerCase().includes(exerciseSearchTerm.toLowerCase())
  );

  const handleStartPlan = async () => {
    if (!selectedHorse || !selectedPlanForSession) {
        toast({title: "Error", description: "Selecciona un caballo y un plan.", variant: "destructive"});
        return;
    }
    setIsLoadingCurrentBlock(true); // Indicate loading while starting plan
    try {
        const planBlocks = await getTrainingBlocks(selectedPlanForSession.id);
        if (planBlocks.length === 0) {
            toast({title: "Plan Vacío", description: "Este plan no tiene etapas/semanas definidas.", variant: "destructive"});
            setIsLoadingCurrentBlock(false);
            return;
        }
        const firstBlock = planBlocks.sort((a,b) => (a.order ?? Infinity) - (b.order ?? Infinity))[0];
        await startPlanForHorse(selectedHorse.id, selectedPlanForSession.id, firstBlock.id);
        toast({title: "Plan Iniciado", description: `"${selectedPlanForSession.title}" ha comenzado para ${selectedHorse.name}.`});
        // Re-fetch horse to get active plan details
        const updatedHorse = await getHorseById(selectedHorse.id);
        if (updatedHorse) setSelectedHorse(updatedHorse); // This will trigger useEffect to load active plan details
    } catch (error) {
        toast({title: "Error al Iniciar Plan", description: "No se pudo iniciar el plan.", variant: "destructive"});
    } finally {
        setIsLoadingCurrentBlock(false);
    }
  };

  const etapaProgressBarValue = useMemo(() => {
    if (!selectedHorse || !selectedHorse.planProgress || !currentActiveBlock || !currentActiveBlock.exerciseReferences || currentActiveBlock.exerciseReferences.length === 0) {
        return 0;
    }
    const blockProgress = selectedHorse.planProgress[currentActiveBlock.id];
    if (!blockProgress) return 0;

    const totalDaysInBlock = currentActiveBlock.exerciseReferences.length;
    let completedDays = 0;
    for (const dayRef of currentActiveBlock.exerciseReferences) {
        if (blockProgress[dayRef.exerciseId]?.completed) {
            completedDays++;
        }
    }
    return totalDaysInBlock > 0 ? (completedDays / totalDaysInBlock) * 100 : 0;
  }, [selectedHorse, currentActiveBlock]);

  const nonTemplatePlans = useMemo(() => {
    console.log("[Dashboard - Derive nonTemplatePlans] All trainingPlans before filter:", JSON.stringify(trainingPlans, null, 2));
    const filtered = trainingPlans.filter(p => {
        const isTemplate = p.template;
        console.log(`[Dashboard - Derive nonTemplatePlans] Plan: "${p.title}" (ID: ${p.id}), template: ${isTemplate}, !template: ${!isTemplate}`);
        return !isTemplate;
    });
    console.log("[Dashboard - Derive nonTemplatePlans] Filtered non-template plans:", JSON.stringify(filtered, null, 2));
    return filtered;
  }, [trainingPlans]);


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
                        
                        {!selectedHorse.activePlanId && (
                            <>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                    <Button variant="outline" className="w-full justify-start" disabled={isLoadingPlans || trainingPlans.length === 0}>
                                        {isLoadingPlans ? "Cargando planes..." : selectedPlanForSession ? selectedPlanForSession.title : "Seleccionar Plan para Comenzar"}
                                        {!isLoadingPlans && <Icons.chevronDown className="ml-auto h-4 w-4" />}
                                    </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                                    <DropdownMenuLabel>Planes Disponibles (No Plantillas)</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {isLoadingPlans ? (
                                        <DropdownMenuItem disabled>Cargando...</DropdownMenuItem>
                                    ) : nonTemplatePlans.length > 0 ? (
                                        nonTemplatePlans.map((plan) => (
                                        <DropdownMenuItem key={plan.id} onSelect={() => setSelectedPlanForSession(plan)}>
                                            {plan.title}
                                        </DropdownMenuItem>
                                        ))
                                    ) : (
                                        <DropdownMenuItem disabled>
                                            {trainingPlans.length > 0 ? "No hay planes (no plantillas) para iniciar." : "No hay planes creados. Los planes plantilla no aparecen aquí."}
                                        </DropdownMenuItem>
                                    )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                                {selectedPlanForSession && (
                                    <Button onClick={handleStartPlan} disabled={isLoadingCurrentBlock}>
                                        {isLoadingCurrentBlock && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                                        Comenzar este Plan para {selectedHorse.name}
                                    </Button>
                                )}
                                {!selectedPlanForSession && nonTemplatePlans.length === 0 && trainingPlans.length > 0 && !isLoadingPlans && (
                                    <p className="text-sm text-muted-foreground text-center">Todos los planes disponibles son plantillas. Para iniciar un plan, asegúrate que no esté marcado como plantilla, o crea uno nuevo.</p>
                                )}
                                 {!selectedPlanForSession && trainingPlans.length === 0 && !isLoadingPlans && (
                                    <p className="text-sm text-muted-foreground text-center">No hay planes de entrenamiento creados. Un administrador puede crear planes en la pestaña 'Gestionar Plan'.</p>
                                 )}
                            </>
                        )}
                        
                        {selectedHorse.activePlanId && currentActiveBlock && (
                           <>
                            <div className="my-2 p-3 border rounded-lg bg-muted/30 shadow-sm">
                                <h3 className="text-lg font-semibold text-primary">Etapa Actual: {currentActiveBlock.title}</h3>
                                {currentActiveBlock.goal && <p className="text-sm text-muted-foreground italic mt-1">Meta: {currentActiveBlock.goal}</p>}
                                <div className="mt-3 mb-1">
                                    <Label htmlFor="etapa-progress" className="text-xs font-medium text-muted-foreground">Progreso de la Etapa ({Math.round(etapaProgressBarValue)}%):</Label>
                                    <Progress value={etapaProgressBarValue} id="etapa-progress" className="w-full h-2 mt-1" />
                                </div>
                            </div>
                            
                            <Label className="mt-2 block">Seleccionar Día de la Etapa &quot;{currentActiveBlock.title}&quot;:</Label>
                            {isLoadingDaysInBlock ? (
                                <div className="flex items-center p-2"><Icons.spinner className="h-4 w-4 animate-spin mr-2" /> Cargando días...</div>
                            ): daysInCurrentBlock.length > 0 ? (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                {daysInCurrentBlock.map(day => {
                                  const isDayCompletedInPlan = selectedHorse.planProgress?.[currentActiveBlock.id]?.[day.id]?.completed || false;
                                  return (
                                    <div key={day.id} className={`p-2 border rounded-md ${selectedDayForSession?.id === day.id ? 'bg-primary/10 ring-2 ring-primary' : 'hover:bg-muted/50'}`}>
                                        <div className="flex items-start justify-between gap-2">
                                            <Button
                                                variant="ghost"
                                                onClick={() => {
                                                setSelectedDayForSession(day);
                                                setSessionDayResult({
                                                    plannedReps: day.suggestedReps ?? "1 sesión",
                                                    doneReps: isDayCompletedInPlan ? 1 : 0,
                                                    rating: 3,
                                                    observations: { nostrils: null, lips: null, ears: null, eyes: null, neck: null, back: null, croup: null, limbs: null, tail: null, additionalNotes: "" }
                                                });
                                                }}
                                                className="h-auto py-1 px-2 text-left flex-grow flex flex-col items-start w-full overflow-hidden"
                                            >
                                                <span className={`font-semibold block w-full whitespace-normal break-words ${selectedDayForSession?.id === day.id ? 'text-primary' : ''}`}>{day.title}</span>
                                                {day.objective && (
                                                <span className={`text-xs block w-full whitespace-normal break-words ${selectedDayForSession?.id === day.id ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                                                    {day.objective}
                                                </span>
                                                )}
                                            </Button>
                                            <div className="pt-1 flex flex-col items-center">
                                                <Checkbox
                                                    id={`day-complete-${day.id}`}
                                                    checked={isDayCompletedInPlan}
                                                    onCheckedChange={(checked) => handleDayCheckboxChange(day.id, !!checked)}
                                                    className="h-5 w-5"
                                                />
                                                <Label htmlFor={`day-complete-${day.id}`} className="text-xs mt-1">Hecho</Label>
                                            </div>
                                        </div>
                                    </div>
                                );
                                })}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground p-2">Esta etapa no tiene días definidos. {isUserAdmin ? "Añade días en la pestaña 'Gestionar Plan'." : ""}</p>
                            )}
                           </>
                        )}
                         {selectedHorse.activePlanId && !currentActiveBlock && !isLoadingCurrentBlock && (
                            <p className="text-sm text-muted-foreground p-2 text-center">Cargando etapa actual del caballo...</p>
                        )}


                        {selectedDayForSession && sessionDayResult && currentActiveBlock && (
                            <Card className="p-4 space-y-3 mt-2 shadow-inner bg-background">
                                <h3 className="text-lg font-semibold">Detalles para: {selectedDayForSession.title}</h3>
                                <div className="my-2">
                                    <Label htmlFor="day-progress" className="text-xs font-medium text-muted-foreground">Progreso del Día ({sessionDayResult.doneReps === 1 ? 100 : 0}%):</Label>
                                    <Progress value={sessionDayResult.doneReps === 1 ? 100 : 0} id="day-progress" className="w-full h-2 mt-1" />
                                    <p className="text-xs text-muted-foreground mt-1">{sessionDayResult.doneReps === 1 ? "Día completado" : "Día pendiente"}</p>
                                </div>

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
                                    <div className="flex items-center space-x-2 pt-6">
                                        <Checkbox
                                            id={`session-day-doneReps`}
                                            checked={sessionDayResult.doneReps === 1}
                                            onCheckedChange={(checked) => handleSessionDayResultChange('doneReps', !!checked)}
                                        />
                                        <Label htmlFor={`session-day-doneReps`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                            Día Completado (en esta sesión)
                                        </Label>
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
                                    disabled={isSavingSession || !date || !selectedHorse || !currentActiveBlock || !selectedDayForSession || !sessionDayResult}
                                  >
                                    {isSavingSession && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                                    Guardar Sesión del Día
                                  </Button>
                                </div>
                            </Card>
                        )}
                         {!selectedDayForSession && currentActiveBlock && daysInCurrentBlock.length > 0 && (
                            <p className="text-center text-muted-foreground mt-4">Por favor, selecciona un día de la lista de arriba para registrar sus detalles.</p>
                        )}
                         {!selectedHorse.activePlanId && !isLoadingPlans && trainingPlans.length === 0 && (
                            <p className="text-center text-muted-foreground mt-4">No hay planes disponibles para iniciar.</p>
                         )}

                      </CardContent>
                    </Card>
                  </TabsContent>

                  {isUserAdmin && (
                    <TabsContent value="plan">
                         {console.log(`%c[Dashboard - Admin Tab] Rendering Admin Tab Content. isUserAdmin: ${isUserAdmin}, userProfile: ${JSON.stringify(userProfile)}`, "color: purple; font-weight: bold;")}
                        <Card className="my-4 border-none p-0">
                        <CardHeader className="px-1 pt-1 pb-3">
                            <CardTitle className="text-xl">Gestionar Plan Activo</CardTitle>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mt-2">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                        <Button variant="outline" className="w-full sm:w-auto justify-between flex-grow" disabled={!isUserAdmin}>
                                            {isLoadingPlans ? "Cargando planes..." : selectedPlanForAdmin ? selectedPlanForAdmin.title : "Seleccionar Plan"}
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
                                                onSelect={() => handleAdminPlanSelected(plan)}
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
                                {selectedPlanForAdmin && isUserAdmin && (
                                    <AlertDialog open={isDeletePlanDialogOpen} onOpenChange={setIsDeletePlanDialogOpen}>
                                    <AlertDialogTrigger asChild>
                                        <Button
                                        variant="destructive"
                                        size="sm"
                                        className="w-full sm:w-auto mt-2 sm:mt-0"
                                        disabled={!selectedPlanForAdmin || isDeletingPlan}
                                        >
                                        {isDeletingPlan ? <Icons.spinner className="mr-2 h-4 w-4 animate-spin" /> : <Icons.trash className="mr-2 h-4 w-4" />}
                                        Eliminar Plan
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                        <AlertDialogTitle>¿Estás realmente seguro?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            Esta acción no se puede deshacer. Esto eliminará permanentemente el plan &quot;{selectedPlanForAdmin?.title}&quot;
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
                            {selectedPlanForAdmin && <CardDescription className="mt-2">Plan activo (admin): {selectedPlanForAdmin.title}</CardDescription>}
                        </CardHeader>
                        <CardContent className="px-1">
                        {!isUserAdmin && <p className="text-muted-foreground text-center py-4">La gestión de planes es solo para administradores.</p>}
                        {isUserAdmin && isLoadingPlans && !selectedPlanForAdmin ? (
                            <div className="flex items-center justify-center p-4"><Icons.spinner className="h-5 w-5 animate-spin mr-2" /> Cargando información del plan...</div>
                        ) : isUserAdmin && selectedPlanForAdmin ? (
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndBlocks}>
                                <SortableContext items={blocksForAdminPlan.map(b => b.id)} strategy={verticalListSortingStrategy} disabled={!isUserAdmin}>
                                    <Accordion type="single" collapsible className="w-full space-y-2">
                                    {(isLoadingBlocksForAdmin && blocksForAdminPlan.length === 0) ? (
                                    <div className="flex items-center justify-center p-4"><Icons.spinner className="h-5 w-5 animate-spin mr-2" /> Cargando semanas...</div>
                                    ) : blocksForAdminPlan.length === 0 && !isLoadingBlocksForAdmin ? (
                                        <p className="text-sm text-muted-foreground p-2 text-center">Este plan no tiene semanas. ¡Añade la primera!</p>
                                    ) : (
                                    blocksForAdminPlan.map((block) => {
                                        const daysInThisWeek = exercisesForAdminPlan.filter(ex => ex.blockId === block.id).sort((a,b) => (a.orderInBlock ?? Infinity) - (b.orderInBlock ?? Infinity));
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
                                            {isLoadingExercisesForAdmin && daysInThisWeek.length === 0 && block.exerciseReferences && block.exerciseReferences.length > 0 ? (
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
                                                            planId={selectedPlanForAdmin.id}
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
                                    <Button onClick={() => setIsAddBlockDialogOpen(true)} disabled={!selectedPlanForAdmin || isLoadingBlocksForAdmin}>
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
                    <DialogDescription>Añade una semana a "{selectedPlanForAdmin?.title}".</DialogDescription>
                </DialogHeader>
                {selectedPlanForAdmin && (
                    <AddBlockForm
                    planId={selectedPlanForAdmin.id}
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
                {selectedPlanForAdmin && editingBlock && (
                    <EditBlockForm
                    planId={selectedPlanForAdmin.id}
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
                    Selecciona Días (plantillas de MasterExercise) para añadir a la semana: {blocksForAdminPlan.find(b => b.id === currentBlockIdForNewExercise)?.title || ""}
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

