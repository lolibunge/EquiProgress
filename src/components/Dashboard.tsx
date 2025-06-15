
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
import { useState, useEffect, useCallback, ReactNode, useMemo, useRef } from "react"; 
import type { User } from 'firebase/auth';
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';

import { createSession, addExerciseResult } from "@/services/session";
import { getHorses as fetchHorsesService, getHorseById, addHorse, startPlanForHorse, updateDayCompletionStatus, advanceHorseToNextBlock, parseDurationToDays } from "@/services/horse";
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
  type TrainingBlock as TrainingBlockType,
} from "@/services/firestore";
import type { Horse, TrainingPlan, ExerciseResult, SessionDataInput, ExerciseResultInput, ExerciseResultObservations, UserProfile } from "@/types/firestore";
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


type SessionDayResultState = Omit<ExerciseResultInput, 'exerciseId' | 'doneReps'> & {
    observations: Omit<ExerciseResultObservations, 'additionalNotes'> & { additionalNotes?: string | null };
};

interface NumberedDay {
  dayNumber: number;
}

interface SortableExerciseItemProps {
  exercise: BlockExerciseDisplay;
  blockId: string;
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
        <span className="font-medium block whitespace-normal">{exercise.title}</span>
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
            <span className="sr-only">Quitar Sugerencia de la Semana</span>
        </Button>
      )}
    </li>
  );
}

interface SortableBlockAccordionItemProps {
  block: TrainingBlockType;
  children: ReactNode;
  onEditBlock: (block: TrainingBlockType) => void;
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
              {block.title}
              {block.notes && <span className="block sm:inline text-xs text-muted-foreground ml-0 sm:ml-2">- {block.notes}</span>}
              {block.duration && <span className="block sm:inline text-xs text-muted-foreground ml-0 sm:ml-2">- Duración: {block.duration} ({parseDurationToDays(block.duration)} días)</span>}
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
  const [selectedPlanForSessionStart, setSelectedPlanForSessionStart] = useState<TrainingPlan | null>(null);

  const [allBlocksInActivePlan, setAllBlocksInActivePlan] = useState<TrainingBlockType[]>([]);
  const [currentActiveBlock, setCurrentActiveBlock] = useState<TrainingBlockType | null>(null); 
  const [isLoadingCurrentBlock, setIsLoadingCurrentBlock] = useState(false);
  
  const [suggestedExercisesForBlock, setSuggestedExercisesForBlock] = useState<BlockExerciseDisplay[]>([]);
  const [isLoadingSuggestedExercises, setIsLoadingSuggestedExercises] = useState(false);

  const [numberedDaysForCurrentBlock, setNumberedDaysForCurrentBlock] = useState<NumberedDay[]>([]);
  const [isLoadingNumberedDays, setIsLoadingNumberedDays] = useState(false);

  const [displayedDayIndex, setDisplayedDayIndex] = useState<number>(0); 

  const [date, setDate] = useState<Date | undefined>(new Date());
  const [sessionOverallNote, setSessionOverallNote] = useState("");
  const [sessionDayResult, setSessionDayResult] = useState<SessionDayResultState | null>(null);
  const [isSavingSession, setIsSavingSession] = useState(false);
  const [isAdvancingBlock, setIsAdvancingBlock] = useState(false);

  const [selectedPlanForAdmin, setSelectedPlanForAdmin] = useState<TrainingPlan | null>(null);
  const [blocksForAdminPlan, setBlocksForAdminPlan] = useState<TrainingBlockType[]>([]);
  const [isLoadingBlocksForAdmin, setIsLoadingBlocksForAdmin] = useState(false);
  const [exercisesForAdminPlan, setExercisesForAdminPlan] = useState<BlockExerciseDisplay[]>([]); 
  const [isLoadingExercisesForAdmin, setIsLoadingExercisesForAdmin] = useState(false);

  const [isCreatePlanDialogOpen, setIsCreatePlanDialogOpen] = useState(false);
  const [isAddBlockDialogOpen, setIsAddBlockDialogOpen] = useState(false);
  const [currentBlockIdForNewExercise, setCurrentBlockIdForNewExercise] = useState<string | null>(null);

  const [isEditBlockDialogOpen, setIsEditBlockDialogOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<TrainingBlockType | null>(null);
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

  const previousHorseDataRef = useRef<{ currentBlockId: string | null | undefined, activePlanId: string | null | undefined } | null>(null);


  useEffect(() => {
    if (initialLoadingComplete) {
      if (isUserAdmin) setActiveTab("plan");
      else setActiveTab("sesiones");
    }
  }, [isUserAdmin, initialLoadingComplete]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const performFetchHorses = useCallback(async (uid: string) => {
    setIsLoadingHorses(true);
    try {
      const userHorses = await fetchHorsesService(uid);
      setHorses(userHorses);
    } catch (error) {
      toast({ variant: "destructive", title: "Error al Cargar Caballos", description: "No se pudieron cargar los caballos." });
      setHorses([]);
    } finally {
      setIsLoadingHorses(false);
    }
  }, [toast]);

  useEffect(() => {
    if (currentUser?.uid) {
        performFetchHorses(currentUser.uid);
        previousHorseDataRef.current = null; 
    } else {
      setHorses([]);
      setSelectedHorse(null);
      setIsLoadingHorses(false);
      previousHorseDataRef.current = null;
    }
  }, [currentUser?.uid, performFetchHorses]);

  useEffect(() => {
    if (!isLoadingHorses) { 
        if (horses.length > 0 && !selectedHorse) {
            const newSelectedHorse = horses[0];
            setSelectedHorse(newSelectedHorse);
            previousHorseDataRef.current = { currentBlockId: newSelectedHorse.currentBlockId, activePlanId: newSelectedHorse.activePlanId };
        } else if (horses.length === 0) {
            setSelectedHorse(null);
            previousHorseDataRef.current = null;
        }
    }
  }, [horses, selectedHorse, isLoadingHorses]);


  const performFetchAllPlans = useCallback(async () => {
    setIsLoadingPlans(true);
    try {
      const userCtx = currentUser ? { uid: currentUser.uid, role: userProfile?.role } : null;
      const plans = await getTrainingPlans(userCtx);
      setTrainingPlans(plans);
    } catch (error) {
      toast({ variant: "destructive", title: "Error al Cargar Planes", description: "No se pudieron cargar los planes." });
      setTrainingPlans([]);
    } finally {
      setIsLoadingPlans(false);
    }
  }, [toast, currentUser, userProfile]);

  useEffect(() => {
    if (currentUser) performFetchAllPlans();
    else {
      setTrainingPlans([]);
      setSelectedPlanForSessionStart(null);
      setSelectedPlanForAdmin(null);
      setIsLoadingPlans(false);
    }
  }, [currentUser, performFetchAllPlans]);


  const fetchHorseActivePlanDetails = useCallback(async (horse: Horse) => {
    console.log(`%c[Dashboard fetchHorseActivePlanDetails V2] Called for Horse ID: ${horse.id}, ActivePlanID: ${horse.activePlanId}, Horse's CurrentBlockID (DB): ${horse.currentBlockId}`, "color: purple; font-weight: bold;");
    if (!horse.activePlanId) {
      console.log(`%c[Dashboard fetchHorseActivePlanDetails V2] Horse ${horse.id} has NO active plan. Clearing block states.`, "color: orange;");
      setCurrentActiveBlock(null);
      setAllBlocksInActivePlan([]);
      setIsLoadingCurrentBlock(false);
      setDisplayedDayIndex(0);
      return;
    }
    setIsLoadingCurrentBlock(true);
    try {
      const allPlanBlocks = await getTrainingBlocks(horse.activePlanId);
      const sortedAllPlanBlocks = allPlanBlocks.sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity));
      setAllBlocksInActivePlan(sortedAllPlanBlocks);
      console.log(`%c[Dashboard fetchHorseActivePlanDetails V2] Fetched ${sortedAllPlanBlocks.length} total blocks for plan ${horse.activePlanId}. Blocks:`, "color: purple;", sortedAllPlanBlocks.map(b => ({id: b.id, title: b.title, order: b.order})));

      const horseActualCurrentBlockId = horse.currentBlockId;
      let blockToDisplay: TrainingBlockType | null = null;

      if (horseActualCurrentBlockId) {
        blockToDisplay = sortedAllPlanBlocks.find(b => b.id === horseActualCurrentBlockId) || null;
        console.log(`%c[Dashboard fetchHorseActivePlanDetails V2] Horse has currentBlockId (DB): ${horseActualCurrentBlockId}. Found in plan blocks? ${blockToDisplay ? 'YES' : 'NO'}.`, "color: purple;");
      }
      
      if (!blockToDisplay && sortedAllPlanBlocks.length > 0) {
        blockToDisplay = sortedAllPlanBlocks[0];
        console.log(`%c[Dashboard fetchHorseActivePlanDetails V2] Horse's currentBlockId not found or not set. Defaulting to first block of plan: ${blockToDisplay.id} (${blockToDisplay.title}).`, "color: purple;");
      } else if (!blockToDisplay && sortedAllPlanBlocks.length === 0) {
        console.log(`%c[Dashboard fetchHorseActivePlanDetails V2] No blocks in plan and horse has no currentBlockId. Cannot set a block to display.`, "color: orange;");
      }
      
      if (!blockToDisplay) {
         console.log(`%c[Dashboard fetchHorseActivePlanDetails V2] FINAL: Could not determine a block to display. Setting active block to null.`, "color: red;");
         setCurrentActiveBlock(null);
      } else {
        console.log(`%c[Dashboard fetchHorseActivePlanDetails V2] FINAL: Setting currentActiveBlock to ID: ${blockToDisplay.id}, Title: ${blockToDisplay.title}`, "color: green; font-weight: bold;");
        setCurrentActiveBlock(blockToDisplay); 
      }
    } catch (error) {
      console.error(`%c[Dashboard fetchHorseActivePlanDetails V2] Error:`, "color: red;", error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo cargar la etapa activa del caballo." });
      setCurrentActiveBlock(null);
      setAllBlocksInActivePlan([]);
    } finally {
      setIsLoadingCurrentBlock(false);
    }
  }, [toast]);

  useEffect(() => {
    const currentHorseId = selectedHorse?.id;
    const currentHorseCurrentBlockId = selectedHorse?.currentBlockId;
    const currentHorseActivePlanId = selectedHorse?.activePlanId;
    const currentViewedBlockId = currentActiveBlock?.id;

    console.log(`%c[Dashboard useEffect for selectedHorse - START]
    Selected Horse ID: ${currentHorseId}
    Horse's currentBlockId (DB): ${currentHorseCurrentBlockId}
    Horse's activePlanId (DB): ${currentHorseActivePlanId}
    Currently Viewed Block ID (UI): ${currentViewedBlockId}
    Previous Horse Data Ref: ${JSON.stringify(previousHorseDataRef.current)}`,
    "color: #007bff; font-weight: bold; background-color: #f0f8ff; padding: 2px;");

    if (selectedHorse) {
        const prevData = previousHorseDataRef.current;
        const horseActualCurrentBlockIdChanged = prevData?.currentBlockId !== selectedHorse.currentBlockId;
        const horseActivePlanIdChanged = prevData?.activePlanId !== selectedHorse.activePlanId;

        let reasonToResetView = "";
        if (!currentActiveBlock) {
            reasonToResetView = "No block currently viewed (e.g., initial load for this horse, horse selection changed)";
            console.log(`%c[Dashboard useEffect selectedHorse] Reason to Reset View (Branch 1): ${reasonToResetView}`, "color: #FF4500;");
        } else if (horseActivePlanIdChanged) { 
            reasonToResetView = "Horse's active plan has changed entirely";
            console.log(`%c[Dashboard useEffect selectedHorse] Reason to Reset View (Branch 2): ${reasonToResetView}`, "color: #FF4500;");
        } else if (selectedHorse.currentBlockId && horseActualCurrentBlockIdChanged && currentActiveBlock.id !== selectedHorse.currentBlockId) {
            reasonToResetView = "Horse's actual currentBlockId in DB changed, and view is not synced to this new DB state";
            console.log(`%c[Dashboard useEffect selectedHorse] Reason to Reset View (Branch 3): ${reasonToResetView}. DB: ${selectedHorse.currentBlockId}, View: ${currentActiveBlock.id}`, "color: #FF4500;");
        }


        console.log(`%c[Dashboard useEffect for selectedHorse - DECISION CHECKS]
          - prevData?.currentBlockId (viewed before this update): ${prevData?.currentBlockId}
          - selectedHorse.currentBlockId (DB current): ${selectedHorse.currentBlockId}
          - horseActualCurrentBlockIdChanged (DB value changed *this cycle*): ${horseActualCurrentBlockIdChanged}
          - prevData?.activePlanId (viewed before this update): ${prevData?.activePlanId}
          - selectedHorse.activePlanId (DB current): ${selectedHorse.activePlanId}
          - horseActivePlanIdChanged (DB value changed *this cycle*): ${horseActivePlanIdChanged}
          - currentActiveBlock (Currently Viewed Block) ID: ${currentActiveBlock?.id}
          - FINAL Reason to reset view to horse's actual current block: ${reasonToResetView || 'N/A (conditions for reset not met, view will be preserved/refreshed)'}`,
        "color: #DAA520; background-color: #fffacd; padding: 2px;");


        if (reasonToResetView) {
            console.log(`%c[Dashboard useEffect for selectedHorse - ACTION: RESETTING VIEW] Condition MET. Reason: ${reasonToResetView}. Calling fetchHorseActivePlanDetails.`, "color: #28a745; font-weight:bold;");
            fetchHorseActivePlanDetails(selectedHorse);
        } else if (selectedHorse.activePlanId) {
            console.log(`%c[Dashboard useEffect for selectedHorse - ACTION: PRESERVING/REFRESHING VIEW] View reset condition NOT met. Horse Plan: ${selectedHorse.activePlanId}. Current Viewed Block: ${currentActiveBlock?.id}. Refreshing allBlocksInActivePlan & checking view validity.`, "color: #17a2b8;");
            const refreshAllBlocksOnly = async () => {
                setIsLoadingCurrentBlock(true); 
                try {
                    if (!selectedHorse.activePlanId) {
                         console.warn("[Dashboard useEffect selectedHorse - refreshAllBlocksOnly] Horse activePlanId is null, cannot refresh blocks.");
                         setIsLoadingCurrentBlock(false);
                         return;
                    }
                    const allPlanBlocks = await getTrainingBlocks(selectedHorse.activePlanId);
                    const sortedAllPlanBlocks = allPlanBlocks.sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity));
                    setAllBlocksInActivePlan(sortedAllPlanBlocks);
                    console.log(`[Dashboard useEffect selectedHorse - refreshAllBlocksOnly] Refreshed allBlocksInActivePlan. Count: ${sortedAllPlanBlocks.length}`);

                    if (currentActiveBlock && !sortedAllPlanBlocks.find(b => b.id === currentActiveBlock.id)) {
                        console.log(`%c[Dashboard useEffect selectedHorse - refreshAllBlocksOnly] Current viewed block ${currentActiveBlock?.id} is no longer in the active plan's blocks. Resetting view to horse's actual current block.`, "color: #FFA500;");
                        fetchHorseActivePlanDetails(selectedHorse);
                    } else if (!currentActiveBlock && selectedHorse.currentBlockId) {
                        console.log(`%c[Dashboard useEffect selectedHorse - refreshAllBlocksOnly] CurrentActiveBlock is null, but horse has currentBlockId ${selectedHorse.currentBlockId}. Resetting view.`, "color: #FFA500;");
                        fetchHorseActivePlanDetails(selectedHorse);
                    }
                     else {
                        console.log(`%c[Dashboard useEffect selectedHorse - refreshAllBlocksOnly] Current viewed block ${currentActiveBlock?.id} still valid. View preserved. UI should reflect any planProgress changes for this currently viewed block.`, "color: #ADFF2F;");
                    }
                } catch (e) {
                    console.error("[Dashboard useEffect selectedHorse - refreshAllBlocksOnly] Error refreshing all blocks:", e);
                    toast({ variant: "destructive", title: "Error", description: "No se pudo actualizar la lista de etapas del plan." });
                    fetchHorseActivePlanDetails(selectedHorse);
                } finally {
                    setIsLoadingCurrentBlock(false);
                }
            };
            refreshAllBlocksOnly();
        } else if (!selectedHorse.activePlanId) {
            console.log(`%c[Dashboard useEffect for selectedHorse - ACTION: NO ACTIVE PLAN] Horse has no active plan. Clearing active block states.`, "color: #dc3545;");
            setCurrentActiveBlock(null);
            setAllBlocksInActivePlan([]);
            setDisplayedDayIndex(0);
            setIsLoadingCurrentBlock(false);
        }
        // Update the ref *after* all logic for the current render has used the previous values
        previousHorseDataRef.current = { currentBlockId: selectedHorse.currentBlockId, activePlanId: selectedHorse.activePlanId };

    } else { 
      console.log(`%c[Dashboard useEffect for selectedHorse - ACTION: NO SELECTED HORSE] No selectedHorse. Resetting active plan states.`, "color: #6c757d;");
      setCurrentActiveBlock(null);
      setAllBlocksInActivePlan([]);
      setDisplayedDayIndex(0);
      setIsLoadingCurrentBlock(false);
      previousHorseDataRef.current = null;
    }
    console.log(`%c[Dashboard useEffect for selectedHorse - END]
    Selected Horse ID: ${currentHorseId}
    Horse's currentBlockId (DB): ${currentHorseCurrentBlockId}
    Horse's activePlanId (DB): ${currentHorseActivePlanId}
    FINAL Viewed Block ID (UI): ${currentActiveBlock?.id} (Value after this effect's potential updates)
    ---`,
    "color: #007bff; font-weight: bold; background-color: #e7f3ff; padding: 2px; border-top: 1px dashed #007bff;");
  }, [selectedHorse, fetchHorseActivePlanDetails, toast]);


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

      let allSuggestedExercises: BlockExerciseDisplay[] = [];
      if (sortedBlocks.length > 0) {
        for (const block of sortedBlocks) {
          const blockExercises = await getExercisesForBlock(block.id);
          allSuggestedExercises = [...allSuggestedExercises, ...blockExercises.map(ex => ({...ex, blockId: block.id}))];
        }
        setExercisesForAdminPlan(allSuggestedExercises.sort((a,b) => {
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
    if (selectedPlanForAdmin?.id && activeTab === 'plan') fetchDetailsForAdminPlan(selectedPlanForAdmin.id);
    else {
      setBlocksForAdminPlan([]);
      setExercisesForAdminPlan([]);
    }
  }, [selectedPlanForAdmin, activeTab, fetchDetailsForAdminPlan]);


  useEffect(() => {
    const fetchDetailsForViewedBlock = async () => {
        console.log(`%c[Dashboard fetchDetailsForViewedBlock - START] VIEWED Block ID: ${currentActiveBlock?.id}, Title: ${currentActiveBlock?.title}. Selected Horse: ${selectedHorse?.id}`, "color: teal; font-weight: bold;");
        if (currentActiveBlock && selectedHorse && selectedHorse.activePlanId) {
            setIsLoadingNumberedDays(true);
            setIsLoadingSuggestedExercises(true);
            try {
                console.log(`%c[Dashboard fetchDetailsForViewedBlock - TRY] About to parse duration: "${currentActiveBlock.duration}" for block ${currentActiveBlock.title} (ID: ${currentActiveBlock.id})`, "color: teal;");
                const numDays = parseDurationToDays(currentActiveBlock.duration);
                console.log(`%c[Dashboard fetchDetailsForViewedBlock - TRY] Parsed duration for ${currentActiveBlock.title}: ${numDays} days`, "color: teal;");
                const newNumberedDaysArray = Array.from({ length: numDays }, (_, i) => ({ dayNumber: i + 1 }));
                setNumberedDaysForCurrentBlock(newNumberedDaysArray);
                console.log(`%c[Dashboard fetchDetailsForViewedBlock - TRY] Generated ${newNumberedDaysArray.length} numbered days for block ${currentActiveBlock.id}.`, "color: teal;");

                console.log(`%c[Dashboard fetchDetailsForViewedBlock - TRY] About to fetch suggestions for block ${currentActiveBlock.id}`, "color: teal;");
                const suggested = await getExercisesForBlock(currentActiveBlock.id);
                setSuggestedExercisesForBlock(suggested.sort((a,b) => (a.orderInBlock ?? Infinity) - (b.orderInBlock ?? Infinity)));
                console.log(`%c[Dashboard fetchDetailsForViewedBlock - TRY] Fetched ${suggested.length} suggested exercises for block ${currentActiveBlock.id}.`, "color: teal;");

                let initialDisplayIndex = 0;
                if (newNumberedDaysArray.length > 0) {
                    const blockProgressForViewed = selectedHorse.planProgress?.[currentActiveBlock.id];
                    console.log(`%c[Dashboard fetchDetailsForViewedBlock - TRY] Plan progress for viewed block ${currentActiveBlock.id}:`, "color: teal;", JSON.parse(JSON.stringify(blockProgressForViewed || {})));
                    const firstUncompletedDayIndex = newNumberedDaysArray.findIndex(nd => !blockProgressForViewed?.[String(nd.dayNumber)]?.completed);
                    
                    if (firstUncompletedDayIndex !== -1) {
                        initialDisplayIndex = firstUncompletedDayIndex;
                        console.log(`%c[Dashboard fetchDetailsForViewedBlock - TRY] First uncompleted day in ${currentActiveBlock.title} is index: ${initialDisplayIndex} (Day ${initialDisplayIndex + 1})`, "color: teal;");
                    } else { 
                        initialDisplayIndex = newNumberedDaysArray.length - 1 >= 0 ? newNumberedDaysArray.length - 1 : 0;
                        console.log(`%c[Dashboard fetchDetailsForViewedBlock - TRY] All days in ${currentActiveBlock.title} complete or no days. Setting to last day index: ${initialDisplayIndex} (Day ${initialDisplayIndex + 1})`, "color: teal;");
                    }
                }
                setDisplayedDayIndex(initialDisplayIndex);
                console.log(`%c[Dashboard fetchDetailsForViewedBlock - TRY] FINAL displayedDayIndex for ${currentActiveBlock.title} set to: ${initialDisplayIndex}`, "color: teal; font-weight: bold;");

            } catch (error: any) {
                console.error(`%c[Dashboard fetchDetailsForViewedBlock - CATCH] Error fetching details for block ${currentActiveBlock.title}:`, "color: red;", error);
                toast({ title: "Error", description: `No se pudieron cargar los detalles de la etapa: ${currentActiveBlock.title}. Message: ${error.message}`, variant: "destructive"});
                setNumberedDaysForCurrentBlock([]);
                setSuggestedExercisesForBlock([]);
                 setDisplayedDayIndex(0); 
            } finally {
                console.log(`%c[Dashboard fetchDetailsForViewedBlock - FINALLY] For VIEWED Block ID: ${currentActiveBlock?.id}. Setting loaders to false.`, "color: teal;");
                setIsLoadingNumberedDays(false);
                setIsLoadingSuggestedExercises(false);
            }
        } else {
             console.log(`%c[Dashboard fetchDetailsForViewedBlock - SKIP] Conditions not met for fetching details. VIEWED Block: ${currentActiveBlock?.id}, Selected Horse: ${selectedHorse?.id}, ActivePlanId: ${selectedHorse?.activePlanId}`, "color: orange;");
             setNumberedDaysForCurrentBlock([]);
             setSuggestedExercisesForBlock([]);
             setDisplayedDayIndex(0);
             setIsLoadingNumberedDays(false); 
             setIsLoadingSuggestedExercises(false);
        }
         console.log(`%c[Dashboard fetchDetailsForViewedBlock - END] VIEWED Block ID: ${currentActiveBlock?.id}`, "color: teal; font-weight: bold;");
    };
    fetchDetailsForViewedBlock();
  }, [currentActiveBlock?.id, toast, selectedHorse?.id, selectedHorse?.activePlanId, selectedHorse?.planProgress]);


  const currentNumberedDayForDisplay: NumberedDay | null = useMemo(() => {
    if (numberedDaysForCurrentBlock && numberedDaysForCurrentBlock.length > displayedDayIndex && displayedDayIndex >= 0) {
      const day = numberedDaysForCurrentBlock[displayedDayIndex];
      console.log(`%c[Dashboard Memo currentNumberedDayForDisplay] Recalculated. Index: ${displayedDayIndex}, Day Number: ${day?.dayNumber} (for block: ${currentActiveBlock?.title})`, "color: #2E8B57");
      return day;
    }
    console.log(`%c[Dashboard Memo currentNumberedDayForDisplay] Recalculated. Index: ${displayedDayIndex} is out of bounds for ${numberedDaysForCurrentBlock.length} days (for block: ${currentActiveBlock?.title}). Returning null.`, "color: #FFA500");
    return null;
  }, [numberedDaysForCurrentBlock, displayedDayIndex, currentActiveBlock?.title]);


  useEffect(() => {
      const currentDayObj = currentNumberedDayForDisplay;
      const blockIdForForm = currentActiveBlock?.id;
      console.log(`%c[Dashboard Effect for Session Form Reset] Displayed Day Number: ${currentDayObj?.dayNumber}, Viewed Block ID: ${blockIdForForm}. Resetting session form.`, "color: skyblue; font-weight: bold;");
      if (currentDayObj && blockIdForForm) {
          setDate(new Date());
          setSessionOverallNote("");
          setSessionDayResult({
              plannedReps: "1 sesión",
              rating: 5, 
              observations: { nostrils: null, lips: null, ears: null, eyes: null, neck: null, back: null, croup: null, limbs: null, tail: null, additionalNotes: "" }
          });
      } else {
          setSessionDayResult(null);
          setSessionOverallNote("");
      }
  }, [currentNumberedDayForDisplay?.dayNumber, currentActiveBlock?.id]);


  const allDaysInBlockCompleted = useMemo(() => {
    console.log('%c[Dashboard Memo] Calculating allDaysInBlockCompleted. Input numberedDaysForCurrentBlock:', 'color: #FF8C00', JSON.parse(JSON.stringify(numberedDaysForCurrentBlock.map(d => d.dayNumber))));
    console.log('%c[Dashboard Memo] Calculating allDaysInBlockCompleted. Input selectedHorse.planProgress:', 'color: #FF8C00', JSON.parse(JSON.stringify(selectedHorse?.planProgress || {})));
    console.log('%c[Dashboard Memo] Calculating allDaysInBlockCompleted. Input currentActiveBlock.id:', 'color: #FF8C00', currentActiveBlock?.id);

    if (!selectedHorse || !currentActiveBlock || !numberedDaysForCurrentBlock.length || !selectedHorse.planProgress) {
        console.log('%c[Dashboard Memo] allDaysInBlockCompleted: Pre-condition failed (horse, block, numberedDaysForCurrentBlock.length, or planProgress missing). Returning false.', 'color: #FF8C00');
        return false;
    }
    const blockProgress = selectedHorse.planProgress[currentActiveBlock.id];
    if (!blockProgress && numberedDaysForCurrentBlock.length > 0) { 
        console.log(`%c[Dashboard Memo] allDaysInBlockCompleted: No progress object found for block ${currentActiveBlock.id} in planProgress but block has ${numberedDaysForCurrentBlock.length} days. Returning false.`, 'color: #FF8C00');
        return false;
    }
    if (numberedDaysForCurrentBlock.length === 0) {
        console.log('%c[Dashboard Memo] allDaysInBlockCompleted: No numbered days for this block. Returning true (vacuously complete).', 'color: #FF8C00');
        return true;
    }

    const result = numberedDaysForCurrentBlock.every(nd => {
        const dayKey = String(nd.dayNumber);
        const dayIsComplete = !!blockProgress?.[dayKey]?.completed;
        console.log(`%c[Dashboard Memo allDaysInBlockCompleted check] For Block: ${currentActiveBlock.title}, DayNumberKey: ${dayKey}, Completed in progress: ${dayIsComplete}`, dayIsComplete ? 'color: #90EE90' : 'color: #FFA07A');
        return dayIsComplete;
    });
    console.log(`%c[Dashboard Memo allDaysInBlockCompleted] for block ${currentActiveBlock.id}: Final result: ${result}`, `color: ${result ? 'green' : 'red'}; font-weight: bold;`);
    return result;
  }, [selectedHorse, currentActiveBlock, numberedDaysForCurrentBlock]);


  const handleHorseAdded = async () => {
    setIsAddHorseDialogOpen(false);
    if (currentUser?.uid) await performFetchHorses(currentUser.uid);
  };
  const handleAddHorseCancel = () => setIsAddHorseDialogOpen(false);

  const handleAdminPlanSelected = (plan: TrainingPlan) => setSelectedPlanForAdmin(plan);

  const handlePlanAdded = (newPlanId: string) => {
    setIsCreatePlanDialogOpen(false);
    performFetchAllPlans().then(() => {
      const userCtx = currentUser ? { uid: currentUser.uid, role: userProfile?.role } : null;
      getTrainingPlans(userCtx).then(refreshedPlans => { 
        setTrainingPlans(refreshedPlans);
        const newPlan = refreshedPlans.find(p => p.id === newPlanId);
        if (newPlan) setSelectedPlanForAdmin(newPlan);
      });
    });
  };

  const handlePlanDeleted = () => {
    setIsDeletePlanDialogOpen(false);
    setSelectedPlanForAdmin(null);
    performFetchAllPlans();
    if (selectedHorse && selectedHorse.activePlanId === selectedPlanForAdmin?.id) {
        setSelectedHorse(prev => prev ? ({...prev, activePlanId: null, currentBlockId: null, activePlanStartDate: null, currentBlockStartDate: null, planProgress: {}}) : null);
    }
  };

  const handleDeleteSelectedPlan = async () => {
    if (!selectedPlanForAdmin || !isUserAdmin) return;
    setIsDeletingPlan(true);
    try {
      await deleteTrainingPlan(selectedPlanForAdmin.id);
      toast({ title: "Plan Eliminado", description: `El plan "${selectedPlanForAdmin.title}" y todo su contenido han sido eliminados.` });
      handlePlanDeleted();
    } catch (error) {
      toast({ variant: "destructive", title: "Error al Eliminar Plan", description: "Ocurrió un error al eliminar el plan." });
    } finally {
      setIsDeletingPlan(false);
    }
  };

  const handleBlockAdded = () => {
    setIsAddBlockDialogOpen(false);
    if (selectedPlanForAdmin?.id) fetchDetailsForAdminPlan(selectedPlanForAdmin.id);
  };

  const handleBlockUpdated = () => {
    setIsEditBlockDialogOpen(false);
    setEditingBlock(null);
    if (selectedPlanForAdmin?.id) fetchDetailsForAdminPlan(selectedPlanForAdmin.id);
  };

  const openEditBlockDialog = (block: TrainingBlockType) => {
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
      toast({ title: "Nada Seleccionado", description: "Por favor, selecciona al menos un ejercicio maestro (sugerencia).", variant: "default" });
      return;
    }
    setIsLoadingExercisesForAdmin(true);
    try {
      for (const masterExerciseId of selectedMasterExercisesForBlock) {
        await addExerciseToBlockReference(selectedPlanForAdmin.id, currentBlockIdForNewExercise, masterExerciseId);
      }
      toast({ title: "Sugerencia(s) Añadida(s)", description: "Los ejercicios seleccionados se han añadido como sugerencias a la semana." });
      setIsSelectExerciseDialogOpen(false);
      setCurrentBlockIdForNewExercise(null);
      if (selectedPlanForAdmin?.id) await fetchDetailsForAdminPlan(selectedPlanForAdmin.id);
    } catch (error) {
      toast({ title: "Error", description: "No se pudieron añadir las sugerencias a la semana.", variant: "destructive" });
    } finally {
      setIsLoadingExercisesForAdmin(false);
    }
  };

  const handleRemoveExerciseFromBlock = async (planId: string, blockId: string, masterExerciseId: string) => {
    if (!isUserAdmin) return;
    setIsLoadingExercisesForAdmin(true);
    try {
      await removeExerciseFromBlockReference(planId, blockId, masterExerciseId);
      toast({title: "Sugerencia Removida", description: "El ejercicio sugerido ha sido quitado de esta semana."});
      if (selectedPlanForAdmin?.id) await fetchDetailsForAdminPlan(selectedPlanForAdmin.id);
    } catch (error) {
      toast({title: "Error", description: "No se pudo quitar la sugerencia.", variant: "destructive"});
    } finally {
      setIsLoadingExercisesForAdmin(false);
    }
  };

  const handleDayCheckboxChange = async (dayNumberValue: number, completed: boolean) => {
    if (!selectedHorse || !currentActiveBlock) return;
    console.log(`%c[Dashboard handleDayCheckboxChange] For DayNumber: ${dayNumberValue}, In VIEWED Block ID: ${currentActiveBlock.id}, New Completion: ${completed}. Horse ID: ${selectedHorse.id}`, "color: green; font-weight:bold;");
    try {
        await updateDayCompletionStatus(selectedHorse.id, currentActiveBlock.id, dayNumberValue, completed);
        const updatedHorse = await getHorseById(selectedHorse.id);
        console.log(`%c[Dashboard handleDayCheckboxChange] Fetched updatedHorse. New planProgress:`, "color: green;", JSON.parse(JSON.stringify(updatedHorse?.planProgress || {})));
        if (updatedHorse) {
          setSelectedHorse(updatedHorse);
        }
        toast({title: "Progreso Actualizado", description: `Día ${dayNumberValue} ${completed ? 'completado' : 'marcado como no completado'}.`});
    } catch (error) {
        toast({variant: "destructive", title: "Error", description: "No se pudo actualizar el estado del día."});
        const previousHorseState = await getHorseById(selectedHorse.id);
        if (previousHorseState) setSelectedHorse(previousHorseState);
    }
  };


  const handleSessionDayResultChange = (
    field: keyof Omit<SessionDayResultState, 'observations'> | `observations.${keyof Omit<ExerciseResultObservations, 'additionalNotes'>}` | 'observations.additionalNotes',
    value: string | number | boolean | null
  ) => {
    if (!currentNumberedDayForDisplay) return;
    setSessionDayResult(prev => {
        const currentDayData = prev || {
            plannedReps: "1 sesión",
            rating: 5, 
            observations: { nostrils: null, lips: null, ears: null, eyes: null, neck: null, back: null, croup: null, limbs: null, tail: null, additionalNotes: "" }
        };
        let updatedDayData = { ...currentDayData };
        if (String(field).startsWith('observations.')) {
            const obsField = String(field).split('.')[1] as keyof ExerciseResultObservations;
            updatedDayData = {
                ...updatedDayData,
                observations: { ...(updatedDayData.observations || { }), [obsField]: value === '' || value === 'N/A' ? null : String(value) }
            };
        } else if (field === 'rating') (updatedDayData as any)[field] = Number(value);
        else if (field === 'plannedReps') (updatedDayData as any)[field] = String(value);
        return updatedDayData;
    });
  };

const handleSaveSessionAndNavigate = async () => {
    if (!currentUser || !date || !selectedHorse || !selectedHorse.id || !currentActiveBlock || !currentNumberedDayForDisplay) {
      toast({ variant: "destructive", title: "Error de Validación", description: "Faltan datos esenciales (fecha, caballo, etapa o día activo)."});
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
        blockId: currentActiveBlock.id,
        dayNumberInBlock: currentNumberedDayForDisplay.dayNumber,
        selectedDayExerciseId: currentActiveBlock.id, 
        selectedDayExerciseTitle: `Día de Trabajo ${currentNumberedDayForDisplay.dayNumber}`,
        overallNote: sessionOverallNote,
      };
      const sessionId = await createSession(sessionInput);

      if (sessionId) {
        const dayResultInput: ExerciseResultInput = {
            exerciseId: currentActiveBlock.id, 
            plannedReps: sessionDayResult.plannedReps,
            doneReps: 1,
            rating: sessionDayResult.rating,
            observations: sessionDayResult.observations && Object.values(sessionDayResult.observations).some(v => v !== null && v !== undefined && String(v).trim() !== '')
                            ? sessionDayResult.observations : null,
        };
        await addExerciseResult(selectedHorse.id, sessionId, dayResultInput);
        toast({ title: "Sesión Guardada", description: `La sesión del Día de Trabajo ${currentNumberedDayForDisplay.dayNumber} ha sido registrada.` });
        router.push(`/session/${sessionId}?horseId=${selectedHorse.id}`);
      } else {
        toast({ variant: "destructive", title: "Error", description: "No se pudo crear la sesión." });
      }
    } catch (error) {
      let errorMessage = "Ocurrió un error al guardar la sesión.";
      if (error instanceof Error) errorMessage = error.message;
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
      if (!activeExercise || !activeExercise.blockId) return;
      const blockIdOfDraggedItem = activeExercise.blockId;
      const targetBlock = blocksForAdminPlan.find(b => b.id === blockIdOfDraggedItem);
      if (!targetBlock || !targetBlock.exerciseReferences) return;
      let currentReferencesForBlock: ExerciseReference[] = [...targetBlock.exerciseReferences];
      const oldIndex = currentReferencesForBlock.findIndex((ref) => ref.exerciseId === activeExerciseId);
      const newIndex = currentReferencesForBlock.findIndex((ref) => ref.exerciseId === overExerciseId);
      if (oldIndex === -1 || newIndex === -1) return;
      const reorderedReferencesForBlock = arrayMove(currentReferencesForBlock, oldIndex, newIndex).map((ref, index) => ({ ...ref, order: index }));
      setExercisesForAdminPlan(prevExercises => {
        const otherBlocksExercises = prevExercises.filter(ex => ex.blockId !== blockIdOfDraggedItem);
        const reorderedBlockExercises = reorderedReferencesForBlock.map(ref => {
            const masterDetails = prevExercises.find(ex => ex.id === ref.exerciseId);
            return { ...masterDetails!, blockId: blockIdOfDraggedItem, orderInBlock: ref.order };
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
        toast({ title: "Orden de sugerencias actualizado", description: "El nuevo orden ha sido guardado." });
        if (selectedPlanForAdmin?.id) await fetchDetailsForAdminPlan(selectedPlanForAdmin.id);
      } catch (err) {
        toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el nuevo orden." });
        if (selectedPlanForAdmin?.id) await fetchDetailsForAdminPlan(selectedPlanForAdmin.id);
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
        const updatedBlocksForDb = reorderedBlocks.map((block, index) => ({ ...block, order: index }));
        const dbPayload = updatedBlocksForDb.map(b => ({ id: b.id, order: b.order as number }));
        updateBlocksOrder(selectedPlanForAdmin.id, dbPayload)
          .then(async () => {
            toast({ title: "Orden de semanas actualizado", description: "El nuevo orden de semanas ha sido guardado." });
            if (selectedPlanForAdmin?.id) await fetchDetailsForAdminPlan(selectedPlanForAdmin.id);
          })
          .catch(async err => {
            toast({ variant: "destructive", title: "Error", description: "No se pudo guardar el nuevo orden de semanas." });
            if (selectedPlanForAdmin?.id) await fetchDetailsForAdminPlan(selectedPlanForAdmin.id);
          });
        return updatedBlocksForDb;
      });
    }
  };

  const filteredMasterExercises = availableMasterExercises.filter(exercise =>
    exercise.title.toLowerCase().includes(exerciseSearchTerm.toLowerCase())
  );

  const plansForDropdown = useMemo(() => {
    const allPlans = trainingPlans;
    return allPlans;
  }, [trainingPlans]);

  const handleStartPlan = async () => {
    if (!selectedHorse || !selectedPlanForSessionStart) {
        toast({title: "Error", description: "Selecciona un caballo y un plan.", variant: "destructive"});
        return;
    }
    setIsLoadingCurrentBlock(true);
    try {
        const planBlocks = await getTrainingBlocks(selectedPlanForSessionStart.id);
        if (planBlocks.length === 0) {
            toast({title: "Plan Vacío", description: "Este plan no tiene etapas/semanas definidas.", variant: "destructive"});
            setIsLoadingCurrentBlock(false);
            return;
        }
        const firstBlock = planBlocks.sort((a,b) => (a.order ?? Infinity) - (b.order ?? Infinity))[0];
        await startPlanForHorse(selectedHorse.id, selectedPlanForSessionStart.id, firstBlock.id);
        toast({title: "Plan Iniciado", description: `"${selectedPlanForSessionStart.title}" ha comenzado para ${selectedHorse.name}.`});
        const updatedHorse = await getHorseById(selectedHorse.id);
        if (updatedHorse) setSelectedHorse(updatedHorse);
    } catch (error) {
        toast({title: "Error al Iniciar Plan", description: "No se pudo iniciar el plan.", variant: "destructive"});
    }
  };

  const etapaProgressBarValue = useMemo(() => {
    if (!selectedHorse || !selectedHorse.planProgress || !currentActiveBlock || !numberedDaysForCurrentBlock.length) return 0;
    const blockProgress = selectedHorse.planProgress[currentActiveBlock.id];
    if (!blockProgress) return 0;
    const totalDaysInBlock = numberedDaysForCurrentBlock.length;
    let completedDays = 0;
    for (const numberedDay of numberedDaysForCurrentBlock) {
        if (blockProgress[String(numberedDay.dayNumber)]?.completed) completedDays++;
    }
    return totalDaysInBlock > 0 ? (completedDays / totalDaysInBlock) * 100 : 0;
  }, [selectedHorse, currentActiveBlock, numberedDaysForCurrentBlock]);


 const handleAdvanceToNextEtapa = async () => {
    if (!selectedHorse || !selectedHorse.activePlanId || !currentActiveBlock) {
        toast({ title: "Error", description: "No hay caballo o plan activo seleccionado.", variant: "destructive" });
        return;
    }

    if (currentActiveBlock.id !== selectedHorse.currentBlockId) {
        const actualCurrentBlockDetails = allBlocksInActivePlan.find(b => b.id === selectedHorse.currentBlockId);
        toast({
            title: "Acción no Permitida",
            description: `Solo puedes avanzar desde la etapa actual DEL CABALLO (${actualCurrentBlockDetails?.title || 'Desconocida'}). Estás viendo: ${currentActiveBlock.title}.`,
            variant: "destructive",
            duration: 7000
        });
        if (actualCurrentBlockDetails) {
            console.log(`[Dashboard handleAdvanceToNextEtapa] User tried to advance from non-current block. Snapping back to horse's actual current block: ${actualCurrentBlockDetails.id}`);
            setCurrentActiveBlock(actualCurrentBlockDetails);
        }
        return;
    }
    
    // Client-side duration check for immediate feedback
    const requiredDurationDays = parseDurationToDays(currentActiveBlock.duration);
    if (requiredDurationDays > 0 && selectedHorse.currentBlockStartDate) {
        const startDate = selectedHorse.currentBlockStartDate.toDate();
        const currentDate = new Date();
        const safeStartDate = startDate > currentDate ? currentDate : startDate;
        const elapsedMilliseconds = currentDate.getTime() - safeStartDate.getTime();
        const elapsedDays = Math.floor(elapsedMilliseconds / (1000 * 3600 * 24));
        if (elapsedDays < requiredDurationDays) {
            const daysRemaining = requiredDurationDays - elapsedDays;
            toast({
                title: "Duración Pendiente (UI Check)",
                description: `La duración de esta etapa (${currentActiveBlock.duration || 'N/A'}) aún no ha finalizado. Faltan aproximadamente ${Math.max(0, daysRemaining)} día(s).`,
                variant: "default",
                duration: 7000
            });
            return;
        }
    } else if (requiredDurationDays > 0 && !selectedHorse.currentBlockStartDate) {
         toast({
            title: "Fecha de Inicio Faltante (UI Check)",
            description: `No se puede verificar la duración de la etapa actual porque falta la fecha de inicio.`,
            variant: "destructive",
            duration: 7000
        });
        return;
    }


    setIsAdvancingBlock(true);
    try {
      const result = await advanceHorseToNextBlock(selectedHorse.id);
      if (result.advanced && result.newBlockId) {
        toast({ title: "Etapa Avanzada", description: "Has pasado a la siguiente etapa del plan." });
        const updatedHorse = await getHorseById(selectedHorse.id);
        if (updatedHorse) setSelectedHorse(updatedHorse);
      } else if (result.planCompleted) {
        toast({ title: "¡Plan Completado!", description: "Has completado todas las etapas de este plan." });
         const updatedHorse = await getHorseById(selectedHorse.id);
         if (updatedHorse) setSelectedHorse(updatedHorse);
      } else if (result.reason === 'duration_not_met') {
        toast({ title: "Duración Pendiente", description: `La duración de esta etapa (${currentActiveBlock.duration || 'N/A'}) aún no ha finalizado. Faltan aproximadamente ${result.daysRemaining} día(s).`, variant: "default", duration: 7000 });
      } else if (result.reason === 'not_all_days_completed') {
         toast({ title: "Días Pendientes", description: "Aún no has completado todos los días de esta etapa.", variant: "default", duration: 5000 });
      } else {
        toast({ title: "Fin del Plan", description: "No hay más etapas en este plan o no se pudo avanzar.", variant: "default" });
      }
    } catch (error) {
      console.error("Error advancing to next block:", error);
      toast({ title: "Error", description: "No se pudo avanzar a la siguiente etapa.", variant: "destructive" });
    } finally {
      setIsAdvancingBlock(false);
    }
  };

  const handlePreviousDay = async () => {
    console.log(`%c[Dashboard handlePreviousDay] Current displayedDayIndex: ${displayedDayIndex}, Current Block ID (viewed): ${currentActiveBlock?.id}`, "color: olive");
    if (!currentActiveBlock || !allBlocksInActivePlan || allBlocksInActivePlan.length === 0) return;

    if (displayedDayIndex > 0) {
        setDisplayedDayIndex(prev => prev - 1);
    } else {
        const currentBlockOrderInPlan = allBlocksInActivePlan.findIndex(b => b.id === currentActiveBlock.id);
        if (currentBlockOrderInPlan > 0) {
            const prevBlock = allBlocksInActivePlan[currentBlockOrderInPlan - 1];
            console.log(`%c[Dashboard handlePreviousDay] Moving to previous block (for viewing): ${prevBlock.id} (${prevBlock.title})`, "color: olive");
            setIsLoadingNumberedDays(true);
            setIsLoadingSuggestedExercises(true);
            setCurrentActiveBlock(prevBlock);
        } else {
            toast({title: "Inicio del Plan", description: "Ya estás en el primer día de la primera etapa del plan.", duration: 3000});
        }
    }
  };

  const handleNextDay = async () => {
    console.log(`%c[Dashboard handleNextDay] Current displayedDayIndex: ${displayedDayIndex}, currentBlock (viewed): ${currentActiveBlock?.title}, numberedDaysForCurrentBlock.length: ${numberedDaysForCurrentBlock.length}`, "color: darkgoldenrod");
    if (!currentActiveBlock || !allBlocksInActivePlan || allBlocksInActivePlan.length === 0 || !numberedDaysForCurrentBlock) return;
    
    if (displayedDayIndex < numberedDaysForCurrentBlock.length - 1) {
        setDisplayedDayIndex(prev => prev + 1);
    } else { 
        const currentBlockOrderInPlan = allBlocksInActivePlan.findIndex(b => b.id === currentActiveBlock.id);
        if (currentBlockOrderInPlan < allBlocksInActivePlan.length - 1) {
            const nextBlock = allBlocksInActivePlan[currentBlockOrderInPlan + 1];
            console.log(`%c[Dashboard handleNextDay] Moving to next block (for viewing): ${nextBlock.id} (${nextBlock.title})`, "color: darkgoldenrod");
            setIsLoadingNumberedDays(true);
            setIsLoadingSuggestedExercises(true);
            setCurrentActiveBlock(nextBlock);
        } else {
             if (currentActiveBlock.id === selectedHorse?.currentBlockId && allDaysInBlockCompleted) {
                toast({title: "¡Etapa Finalizada!", description: "Este es el último día de la etapa actual. Considera avanzar a la siguiente etapa si la duración se ha cumplido.", duration: 5000});
             } else if (currentActiveBlock.id !== selectedHorse?.currentBlockId) {
                toast({title: "Fin de Etapa (Vista Previa)", description: "Has llegado al final de esta etapa en el modo de vista previa.", duration: 3000});
             } else {
                toast({title: "Último Día de la Etapa", description: "Este es el último día de la etapa actual. Completa todos los días para avanzar.", duration: 3000});
             }
        }
    }
  };


   useEffect(() => {
    console.log(`[Dashboard Render] currentUser UID: ${currentUser?.uid}, userProfile: ${JSON.stringify(userProfile || {})}, isUserAdmin: ${isUserAdmin}, authLoading: ${authLoading}`);
    if (selectedHorse) {
        console.log(`[Dashboard Render] selectedHorse.activePlanId: ${selectedHorse.activePlanId}. Dropdown to start new plan will show if this is falsy.`);
    }
  }, [currentUser, userProfile, isUserAdmin, authLoading, selectedHorse]);

  const activePlanTitle = useMemo(() => {
    if (selectedHorse?.activePlanId && trainingPlans.length > 0) {
      return trainingPlans.find(p => p.id === selectedHorse.activePlanId)?.title;
    }
    return null;
  }, [selectedHorse?.activePlanId, trainingPlans]);


  return (
    <div className="container mx-auto py-6 sm:py-10">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div><CardTitle>Mis Caballos</CardTitle><CardDescription>Gestiona tus caballos y selecciona uno para entrenar.</CardDescription></div>
                <Button onClick={() => setIsAddHorseDialogOpen(true)} className="w-full mt-2 sm:mt-0 sm:w-auto"><Icons.plus className="mr-2 h-4 w-4" /> Añadir Nuevo Caballo</Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoadingHorses ? <div className="flex justify-center py-4"><Icons.spinner className="h-6 w-6 animate-spin" /></div>
              : horses.length === 0 ? <p className="text-center text-muted-foreground py-4">No tienes caballos registrados. ¡Añade tu primer caballo!</p>
              : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {horses.map(horse => (
                    <Button key={horse.id} variant={selectedHorse?.id === horse.id ? "default" : "outline"} onClick={() => setSelectedHorse(horse)} className="h-auto py-3 flex flex-col items-start text-left w-full">
                      <span className="font-semibold text-base block whitespace-normal">{horse.name}</span>
                      <span className="text-xs opacity-80 block whitespace-normal">{horse.age} años, {horse.sex}, {horse.color}</span>
                    </Button>
                  ))}
                </div>}
            </CardContent>
          </Card>

          {selectedHorse ? (
            <Card>
              <CardHeader>
                <CardTitle>Entrenamiento para {selectedHorse.name}</CardTitle>
                 {activePlanTitle ? (
                    <CardDescription>Plan Activo: {activePlanTitle}</CardDescription>
                ) : selectedHorse.activePlanId ? (
                    <CardDescription>Cargando nombre del plan...</CardDescription>
                ): (
                     <CardDescription>Selecciona un plan y registra tus sesiones.</CardDescription>
                )}
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
                        {!selectedHorse.activePlanId && ( <>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="w-full justify-start" disabled={isLoadingPlans || plansForDropdown.length === 0}>
                                    {isLoadingPlans ? "Cargando planes..." : selectedPlanForSessionStart ? selectedPlanForSessionStart.title : "Seleccionar Plan para Comenzar"}
                                    {!isLoadingPlans && <Icons.chevronDown className="ml-auto h-4 w-4" />}
                                </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                                <DropdownMenuLabel>Planes Disponibles</DropdownMenuLabel><DropdownMenuSeparator />
                                {isLoadingPlans ? <DropdownMenuItem disabled>Cargando...</DropdownMenuItem>
                                : plansForDropdown.length > 0 ? plansForDropdown.map((plan) => (
                                    <DropdownMenuItem key={plan.id} onSelect={() => setSelectedPlanForSessionStart(plan)}>
                                        {plan.title} {plan.template && <span className="text-xs text-muted-foreground ml-2">(Plantilla)</span>}
                                    </DropdownMenuItem> ))
                                : <DropdownMenuItem disabled>{!isUserAdmin ? "No hay planes. Contacta a un admin." : "No hay planes. Crea uno."}</DropdownMenuItem>}
                                </DropdownMenuContent>
                            </DropdownMenu>
                            {selectedPlanForSessionStart && (
                                <Button onClick={handleStartPlan} disabled={isLoadingCurrentBlock}>
                                    {isLoadingCurrentBlock && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}
                                    Comenzar este Plan para {selectedHorse.name}
                                </Button> )}
                            {!selectedPlanForSessionStart && plansForDropdown.length === 0 && !isLoadingPlans && (
                                <p className="text-sm text-muted-foreground text-center">{!isUserAdmin ? "No hay planes. Contacta a un admin." : "No hay planes. Crea uno en 'Gestionar Plan'."}</p> )} </>
                        )}
                        {selectedHorse.activePlanId && currentActiveBlock && ( <>
                            <div className="my-2 p-3 border rounded-lg bg-muted/30 shadow-sm">
                                <h3 className="text-lg font-semibold text-primary">Etapa (Visualizada): {currentActiveBlock.title}</h3>
                                {currentActiveBlock.goal && <p className="text-sm text-muted-foreground italic mt-1">Meta de la Etapa: {currentActiveBlock.goal}</p>}
                                {currentActiveBlock.duration && <p className="text-sm text-muted-foreground mt-1">Duración Sugerida: {currentActiveBlock.duration} ({parseDurationToDays(currentActiveBlock.duration)} días)</p>}
                                {currentActiveBlock.id === selectedHorse.currentBlockId && selectedHorse.currentBlockStartDate && (
                                  <p className="text-xs text-muted-foreground mt-0.5">Inicio de esta etapa para {selectedHorse.name}: {selectedHorse.currentBlockStartDate.toDate().toLocaleDateString("es-ES")}</p>
                                )}
                                <div className="mt-3 mb-1">
                                    <Label htmlFor="etapa-progress" className="text-xs font-medium text-muted-foreground">Progreso de la Etapa ({Math.round(etapaProgressBarValue)}%):</Label>
                                    <Progress value={etapaProgressBarValue} id="etapa-progress" className="w-full h-2 mt-1" />
                                </div>
                            </div>
                            <div className="flex justify-between items-center my-3">
                                <Button onClick={handlePreviousDay} variant="outline" size="sm" disabled={isLoadingNumberedDays || isLoadingSuggestedExercises || (displayedDayIndex === 0 && allBlocksInActivePlan.findIndex(b => b.id === currentActiveBlock.id) === 0)}><Icons.arrowRight className="h-4 w-4 rotate-180 mr-1" /> Día Anterior</Button>
                                <Button onClick={handleNextDay} variant="outline" size="sm" disabled={isLoadingNumberedDays || isLoadingSuggestedExercises || (displayedDayIndex === numberedDaysForCurrentBlock.length - 1 && allBlocksInActivePlan.findIndex(b => b.id === currentActiveBlock.id) === allBlocksInActivePlan.length - 1 )} >Día Siguiente <Icons.arrowRight className="h-4 w-4 ml-1" /></Button>
                            </div>

                            {isLoadingNumberedDays || isLoadingSuggestedExercises ? <div className="flex items-center p-2"><Icons.spinner className="h-4 w-4 animate-spin mr-2" /> Cargando datos del día...</div>
                            : allDaysInBlockCompleted && currentActiveBlock.id === selectedHorse.currentBlockId ? (
                                <Card className="mt-4 p-4 text-center">
                                    <Icons.check className="mx-auto h-10 w-10 text-green-500 mb-2" />
                                    <CardTitle className="text-lg">¡Etapa {currentActiveBlock.title} Completada!</CardTitle>
                                    <CardDescription>
                                        Todos los días de "{currentActiveBlock.title}" han sido completados.
                                        <br />
                                        <span className="text-xs">(Duración: {currentActiveBlock.duration || 'N/A'}, Inicio: {selectedHorse.currentBlockStartDate ? selectedHorse.currentBlockStartDate.toDate().toLocaleDateString("es-ES") : 'N/A'})</span>
                                    </CardDescription>
                                     <Button onClick={handleAdvanceToNextEtapa} disabled={isAdvancingBlock} className="mt-4">
                                        {isAdvancingBlock ? <Icons.spinner className="mr-2 h-4 w-4 animate-spin" /> : <Icons.arrowRight className="mr-2 h-4 w-4" />} Siguiente Etapa
                                    </Button>
                                </Card>
                             ) : currentNumberedDayForDisplay ? (
                                <Card key={`day-${currentActiveBlock.id}-${currentNumberedDayForDisplay.dayNumber}`} className="mt-4">
                                    <CardHeader>
                                        <CardTitle className="text-lg text-center flex-grow px-2">Día de Trabajo {currentNumberedDayForDisplay.dayNumber}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="flex items-center space-x-2 py-3 border-t border-b">
                                            <Checkbox id={`day-complete-${currentNumberedDayForDisplay.dayNumber}`}
                                                checked={selectedHorse?.planProgress?.[currentActiveBlock.id]?.[String(currentNumberedDayForDisplay.dayNumber)]?.completed || false}
                                                onCheckedChange={(checked) => handleDayCheckboxChange(currentNumberedDayForDisplay.dayNumber, !!checked)}
                                                className="h-5 w-5" />
                                            <Label htmlFor={`day-complete-${currentNumberedDayForDisplay.dayNumber}`} className="text-base font-medium">Marcar Día {currentNumberedDayForDisplay.dayNumber} como Hecho</Label>
                                        </div>
                                        {suggestedExercisesForBlock.length > 0 && (
                                            <div className="pt-4 border-t">
                                                <h4 className="text-md font-semibold mb-2">Ejercicios Sugeridos para esta Etapa:</h4>
                                                <ul className="space-y-1 text-sm text-muted-foreground">
                                                    {suggestedExercisesForBlock.map(ex => (
                                                        <li key={ex.id} className="p-2 border rounded-md bg-background shadow-sm">
                                                           <strong className="block text-foreground">{ex.title}</strong>
                                                           {ex.suggestedReps && <p className="text-xs mt-0.5">Sugerido: {ex.suggestedReps}</p>}
                                                           {ex.description && <p className="text-xs mt-0.5 whitespace-pre-wrap">Desc: {ex.description}</p>}
                                                           {ex.objective && <p className="text-xs mt-0.5 whitespace-pre-wrap">Obj: {ex.objective}</p>}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                        {sessionDayResult && (
                                            <div className="pt-3 space-y-3 border-t mt-3">
                                                <h3 className="text-md font-semibold">Registrar Sesión del Día {currentNumberedDayForDisplay.dayNumber}:</h3>
                                                <div><Label htmlFor="session-overall-note">Notas Generales de la Sesión</Label><Textarea id="session-overall-note" placeholder="Comentarios generales sobre la sesión de hoy..." value={sessionOverallNote} onChange={(e) => setSessionOverallNote(e.target.value)} className="min-h-[80px]" /></div>
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <div><Label htmlFor={`day-plannedReps`}>Trabajo Planificado para Hoy</Label><Input id={`day-plannedReps`} type="text" placeholder="Ej: 1 sesión, 45 min" value={sessionDayResult.plannedReps ?? ''} onChange={(e) => handleSessionDayResultChange('plannedReps', e.target.value)} /></div>
                                                    <div><Label htmlFor={`day-rating`}>Calificación del Día (0-10): {sessionDayResult.rating}</Label><Slider id={`day-rating`} value={[sessionDayResult.rating]} min={0} max={10} step={1} className="mt-1" onValueChange={(value) => handleSessionDayResultChange('rating', value[0])} /></div>
                                                </div>
                                                <div className="pt-3 border-t mt-3">
                                                    <div className="space-y-1 mb-3"><Label htmlFor={`day-obs-additionalNotes`}>Notas Adicionales (específicas del día)</Label><Textarea id={`day-obs-additionalNotes`} placeholder="Notas sobre rendimiento, dificultades, etc." value={sessionDayResult.observations?.additionalNotes || ''} onChange={(e) => handleSessionDayResultChange(`observations.additionalNotes`, e.target.value)} className="min-h-[70px]" /></div>
                                                    <h4 className="text-sm font-semibold mb-2">Observaciones de Tensión:</h4>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                                                        {OBSERVATION_ZONES.map(zone => (
                                                        <div key={zone.id} className="space-y-1"><Label htmlFor={`day-obs-${zone.id}`}>{zone.label}</Label>
                                                            <Select value={sessionDayResult.observations?.[zone.id as keyof Omit<ExerciseResultObservations, 'additionalNotes'>] || ''} onValueChange={(value) => handleSessionDayResultChange(`observations.${zone.id as keyof Omit<ExerciseResultObservations, 'additionalNotes'>}`, value === 'N/A' ? 'N/A' : (value || null))}>
                                                            <SelectTrigger id={`day-obs-${zone.id}`} className="h-8 text-xs"><SelectValue placeholder={`Estado...`} /></SelectTrigger>
                                                            <SelectContent>{TENSION_STATUS_OPTIONS.map(option => (<SelectItem key={option.value} value={option.value} className="text-xs">{option.label}</SelectItem>))}</SelectContent>
                                                            </Select>
                                                        </div> ))}
                                                    </div>
                                                </div>
                                                <div className="flex justify-end mt-3">
                                                <Button onClick={handleSaveSessionAndNavigate} disabled={isSavingSession || !date || !selectedHorse || !currentActiveBlock || !currentNumberedDayForDisplay || !sessionDayResult}>
                                                    {isSavingSession && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />} Guardar Sesión del Día {currentNumberedDayForDisplay.dayNumber}
                                                </Button></div>
                                            </div> )}
                                    </CardContent>
                                </Card>
                            ) :  <p className="text-sm text-muted-foreground p-2 text-center mt-4">Esta etapa no tiene días de trabajo definidos (revisa su duración) o ha ocurrido un error al cargar el día.</p>} </>
                        )}
                         {selectedHorse.activePlanId && !currentActiveBlock && isLoadingCurrentBlock && <div className="flex justify-center p-4"><Icons.spinner className="h-6 w-6 animate-spin" /><span className="ml-2">Cargando etapa actual del caballo...</span></div>}
                         {!selectedHorse.activePlanId && !isLoadingPlans && plansForDropdown.length === 0 && <p className="text-center text-muted-foreground mt-4">No hay planes disponibles para iniciar.</p>}
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
                                            {isLoadingPlans ? "Cargando planes..." : selectedPlanForAdmin ? selectedPlanForAdmin.title : "Seleccionar Plan"}
                                            {!isLoadingPlans && <Icons.chevronDown className="ml-2 h-4 w-4" />}
                                        </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
                                        <DropdownMenuLabel>Planes Disponibles</DropdownMenuLabel><DropdownMenuSeparator />
                                        {isLoadingPlans ? <DropdownMenuItem disabled>Cargando planes...</DropdownMenuItem>
                                        : trainingPlans.length > 0 ? trainingPlans.map((plan) => (<DropdownMenuItem key={plan.id} onSelect={() => handleAdminPlanSelected(plan)} disabled={!isUserAdmin} >{plan.title} {plan.template && "(Plantilla)"}</DropdownMenuItem>))
                                        : <DropdownMenuItem disabled>No hay planes disponibles</DropdownMenuItem>}
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                    {isUserAdmin && <Button onClick={() => setIsCreatePlanDialogOpen(true)} className="w-full sm:w-auto flex-shrink-0"><Icons.plus className="mr-2 h-4 w-4" /> Crear Plan</Button>}
                                </div>
                                {selectedPlanForAdmin && isUserAdmin && (
                                    <AlertDialog open={isDeletePlanDialogOpen} onOpenChange={setIsDeletePlanDialogOpen}>
                                    <AlertDialogTrigger asChild><Button variant="destructive" size="sm" className="w-full sm:w-auto mt-2 sm:mt-0" disabled={!selectedPlanForAdmin || isDeletingPlan}>{isDeletingPlan ? <Icons.spinner className="mr-2 h-4 w-4 animate-spin" /> : <Icons.trash className="mr-2 h-4 w-4" />} Eliminar Plan</Button></AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader><AlertDialogTitle>¿Estás realmente seguro?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer. Eliminará el plan &quot;{selectedPlanForAdmin?.title}&quot; y todo su contenido.</AlertDialogDescription></AlertDialogHeader>
                                        <AlertDialogFooter><AlertDialogCancel disabled={isDeletingPlan}>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDeleteSelectedPlan} disabled={isDeletingPlan} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">{isDeletingPlan && <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />}Sí, eliminar</AlertDialogAction></AlertDialogFooter>
                                    </AlertDialogContent></AlertDialog> )}
                            </div>
                            {selectedPlanForAdmin && <CardDescription className="mt-2">Plan activo (admin): {selectedPlanForAdmin.title}</CardDescription>}
                        </CardHeader>
                        <CardContent className="px-1">
                        {!isUserAdmin && <p className="text-muted-foreground text-center py-4">Gestión solo para administradores.</p>}
                        {isUserAdmin && isLoadingPlans && !selectedPlanForAdmin ? <div className="flex items-center justify-center p-4"><Icons.spinner className="h-5 w-5 animate-spin mr-2" /> Cargando...</div>
                        : isUserAdmin && selectedPlanForAdmin ? (
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndBlocks}>
                                <SortableContext items={blocksForAdminPlan.map(b => b.id)} strategy={verticalListSortingStrategy} disabled={!isUserAdmin}>
                                    <Accordion type="single" collapsible className="w-full space-y-2">
                                    {(isLoadingBlocksForAdmin && blocksForAdminPlan.length === 0) ? <div className="flex items-center justify-center p-4"><Icons.spinner className="h-5 w-5 animate-spin mr-2" /> Cargando semanas...</div>
                                    : blocksForAdminPlan.length === 0 && !isLoadingBlocksForAdmin ? <p className="text-sm text-muted-foreground p-2 text-center">Este plan no tiene semanas. ¡Añade la primera!</p>
                                    : ( blocksForAdminPlan.map((block) => {
                                        const suggestedExercisesInThisBlock = exercisesForAdminPlan.filter(ex => ex.blockId === block.id).sort((a,b) => (a.orderInBlock ?? Infinity) - (b.orderInBlock ?? Infinity));
                                        return (
                                        <SortableBlockAccordionItem key={block.id} block={block} onEditBlock={openEditBlockDialog} canEdit={isUserAdmin}>
                                            <AccordionContent className="px-1 sm:px-2.5">
                                            {block.goal && <p className="text-sm text-primary font-semibold mb-2">Meta de la Semana: <span className="font-normal text-muted-foreground">{block.goal}</span></p>}
                                            {isLoadingExercisesForAdmin && suggestedExercisesInThisBlock.length === 0 && block.exerciseReferences && block.exerciseReferences.length > 0 ? <div className="flex items-center justify-center p-4"><Icons.spinner className="h-5 w-5 animate-spin mr-2" /> Cargando sugerencias...</div>
                                            : suggestedExercisesInThisBlock.length > 0 ? (
                                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndExercises}>
                                                <SortableContext items={suggestedExercisesInThisBlock.map(e => e.id)} strategy={verticalListSortingStrategy} disabled={!isUserAdmin}>
                                                    <ul className="list-none pl-0 space-y-1 text-sm">
                                                    {suggestedExercisesInThisBlock.map((exercise) => (<SortableExerciseItem key={exercise.id} exercise={exercise} blockId={block.id} planId={selectedPlanForAdmin.id} onRemove={handleRemoveExerciseFromBlock} canEdit={isUserAdmin}/>))}
                                                    </ul>
                                                </SortableContext>
                                            </DndContext>
                                            ) : <p className="text-sm text-muted-foreground p-2">Esta semana no tiene ejercicios sugeridos.</p>}
                                            {isUserAdmin && <Button size="sm" variant="outline" className="mt-2" onClick={() => openSelectExerciseDialog(block.id)}><Icons.plus className="mr-2 h-4 w-4" /> Añadir Sugerencia</Button>}
                                        </AccordionContent>
                                        </SortableBlockAccordionItem> );}) )}
                                    </Accordion>
                                </SortableContext>
                            {isUserAdmin && <div className="flex flex-wrap justify-end mt-4 gap-2"><Button onClick={() => setIsAddBlockDialogOpen(true)} disabled={!selectedPlanForAdmin || isLoadingBlocksForAdmin}><Icons.plus className="mr-2 h-4 w-4" /> Añadir Semana</Button></div>}
                            </DndContext>
                            ) : isUserAdmin && <p className="text-sm text-muted-foreground p-2 text-center">Selecciona o crea un plan.</p>}
                        </CardContent>
                        </Card>
                    </TabsContent> )}
                </Tabs>
              </CardContent>
            </Card>
          ) : <Card><CardContent className="flex flex-col items-center justify-center h-64 text-center p-4"><Icons.logo className="w-16 h-16 mb-4 text-muted-foreground" data-ai-hint="horse pointing" /><p className="text-muted-foreground">Selecciona un caballo o registra uno nuevo.</p></CardContent></Card>}
        </div>
        <Card className="md:col-span-1 row-start-1 md:row-auto">
          <CardHeader><CardTitle>Calendario</CardTitle><CardDescription>Selecciona la fecha de tu sesión.</CardDescription></CardHeader>
          <CardContent className="grid gap-6"><Calendar mode="single" selected={date} onSelect={setDate} className="rounded-md border shadow"/>{date ? <p className="text-center text-sm font-medium">Fecha: {date.toLocaleDateString("es-ES", {year: "numeric",month: "long",day: "numeric",})}</p> : <p className="text-center text-sm text-muted-foreground">Selecciona una fecha.</p>}</CardContent>
        </Card>
      </div>
      <Dialog open={isAddHorseDialogOpen} onOpenChange={setIsAddHorseDialogOpen}><DialogContent className="sm:max-w-[480px]"><DialogHeader><DialogTitle>Añadir Nuevo Caballo</DialogTitle><DialogDescription>Completa los detalles para registrar un nuevo caballo.</DialogDescription></DialogHeader><AddHorseForm onSuccess={handleHorseAdded} onCancel={handleAddHorseCancel} /></DialogContent></Dialog>
    {isUserAdmin && ( <>
        <Dialog open={isCreatePlanDialogOpen} onOpenChange={setIsCreatePlanDialogOpen}><DialogContent className="sm:max-w-[480px]"><DialogHeader><DialogTitle>Crear Nuevo Plan de Entrenamiento</DialogTitle><DialogDescription>Define un nuevo plan.</DialogDescription></DialogHeader><AddPlanForm onSuccess={handlePlanAdded} onCancel={() => setIsCreatePlanDialogOpen(false)} /></DialogContent></Dialog>
        <Dialog open={isAddBlockDialogOpen} onOpenChange={setIsAddBlockDialogOpen}><DialogContent className="sm:max-w-[480px]"><DialogHeader><DialogTitle>Añadir Nueva Semana al Plan</DialogTitle><DialogDescription>Añade una semana a "{selectedPlanForAdmin?.title}".</DialogDescription></DialogHeader>{selectedPlanForAdmin && <AddBlockForm planId={selectedPlanForAdmin.id} onSuccess={handleBlockAdded} onCancel={() => setIsAddBlockDialogOpen(false)} />}</DialogContent></Dialog>
        <Dialog open={isEditBlockDialogOpen} onOpenChange={setIsEditBlockDialogOpen}><DialogContent className="sm:max-w-[480px]"><DialogHeader><DialogTitle>Editar Semana</DialogTitle><DialogDescription>Modifica "{editingBlock?.title}".</DialogDescription></DialogHeader>{selectedPlanForAdmin && editingBlock && <EditBlockForm planId={selectedPlanForAdmin.id} block={editingBlock} onSuccess={handleBlockUpdated} onCancel={() => setIsEditBlockDialogOpen(false)} />}</DialogContent></Dialog>
        <Dialog open={isSelectExerciseDialogOpen} onOpenChange={(open) => { if (!open) {setCurrentBlockIdForNewExercise(null); setExerciseSearchTerm("");} setIsSelectExerciseDialogOpen(open);}}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Añadir Sugerencias a la Semana</DialogTitle><DialogDescription>Selecciona Ejercicios Maestros para {blocksForAdminPlan.find(b => b.id === currentBlockIdForNewExercise)?.title || ""}</DialogDescription></DialogHeader>
            <div className="my-4"><Input type="search" placeholder="Buscar ejercicios..." value={exerciseSearchTerm} onChange={(e) => setExerciseSearchTerm(e.target.value)} className="w-full"/></div>
            <div className="space-y-4 max-h-[50vh] overflow-y-auto">
                {isLoadingMasterExercises ? <div className="flex justify-center"><Icons.spinner className="h-6 w-6 animate-spin" /></div>
                : filteredMasterExercises.length === 0 && availableMasterExercises.length > 0 ? <p className="text-center text-muted-foreground">No se encontraron ejercicios con &quot;{exerciseSearchTerm}&quot;.</p>
                : filteredMasterExercises.length === 0 && availableMasterExercises.length === 0 ? <p className="text-center text-muted-foreground">No hay ejercicios en la biblioteca. <Link href="/library/exercises" className="text-primary hover:underline" onClick={() => setIsSelectExerciseDialogOpen(false)}>Añade algunos.</Link></p>
                : filteredMasterExercises.map(masterEx => (<div key={masterEx.id} className="flex items-center space-x-3 rounded-md border p-3 hover:bg-accent/50">
                    <Checkbox id={`master-ex-${masterEx.id}`} checked={selectedMasterExercisesForBlock.has(masterEx.id)} onCheckedChange={(checked) => setSelectedMasterExercisesForBlock(prev => { const newSet = new Set(prev); if (checked) newSet.add(masterEx.id); else newSet.delete(masterEx.id); return newSet; })} />
                    <div className="grid gap-1.5 leading-none"><label htmlFor={`master-ex-${masterEx.id}`} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{masterEx.title}</label>{masterEx.description && <p className="text-xs text-muted-foreground">{masterEx.description}</p>}</div>
                    </div>))}
            </div>
            <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button variant="outline" onClick={() => {setIsSelectExerciseDialogOpen(false); setCurrentBlockIdForNewExercise(null); setExerciseSearchTerm("");}}>Cancelar</Button>
                <Button onClick={handleAddSelectedExercisesToBlock} disabled={isLoadingMasterExercises || selectedMasterExercisesForBlock.size === 0}>Añadir Seleccionados ({selectedMasterExercisesForBlock.size})</Button>
            </div></DialogContent></Dialog> </> )}
    </div>
  );
};
export default Dashboard;


    