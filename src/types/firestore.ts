
import type { Timestamp } from 'firebase/firestore';

export interface UserProfile {
    uid: string;
    email?: string | null;
    displayName?: string | null;
    photoURL?: string | null;
    role?: 'admin' | 'customer';
}

export interface Horse {
  id: string;
  name: string;
    age: number;
    sex: "Macho" | "Hembra" | "Castrado";
    color: string;
    photoUrl?: string;
    ownerUid: string;
    createdAt: Timestamp;
    updatedAt?: Timestamp;
    notes?: string;
    activePlanId?: string | null;
    activePlanStartDate?: Timestamp | null;
    currentBlockId?: string | null;
    currentBlockStartDate?: Timestamp | null;
    planProgress?: {
        [blockId: string]: {
            // Key is now dayNumber (e.g., "1", "2")
            [dayNumber: string]: {
                completed: boolean;
                completedAt?: Timestamp;
            }
        }
    };
}

export interface TrainingPlan {
    id: string;
    title: string;
    createdAt: Timestamp;
    updatedAt?: Timestamp;
    template: boolean;
    horseId?: string;
    allowedUserIds?: string[] | null; 
    accessStatus?: 'allowed' | 'denied'; // For UI rendering based on current user
}

export interface ExerciseReference {
  exerciseId: string; // ID of a MasterExercise
  order: number; // Order of this suggested exercise within the block's list
  allowedUserIds?: string[] | null; // User-specific visibility for this exercise in this block
}

export interface TrainingBlock {
    id: string;
    planId: string;
    title: string;
    notes?: string;
    duration?: string; // e.g., "7 días", "1 week"
    goal?: string;
    order?: number;
    exerciseReferences?: ExerciseReference[]; // Suggested exercises for this block
    allowedUserIds?: string[] | null; // User-specific visibility for this block
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
    accessStatus?: 'allowed' | 'denied' | 'parent_denied'; // For UI rendering
}

export interface MasterExercise {
    id: string;
    title: string;
    description?: string;
    suggestedReps?: string | null;
    objective?: string;
    whenToAdvance?: string;
    whatNotToDo?: string;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

// This type might be less directly used if days are just numbers + suggestions
export interface BlockExerciseDisplay extends MasterExercise {
  orderInBlock: number; // order of the suggestion in the list
  blockId: string;
  allowedUserIds?: string[] | null; // From the ExerciseReference
  accessStatus?: 'allowed' | 'denied' | 'parent_denied'; // For UI rendering
}


export interface SessionData {
    id: string;
    horseId: string;
    userId: string;
    date: Timestamp;
    blockId: string;
    // For numbered days, selectedDayExerciseId might store the blockId or a generic "day_X" identifier
    // and selectedDayExerciseTitle stores "Día de Trabajo X"
    selectedDayExerciseId?: string;
    selectedDayExerciseTitle?: string;
    dayNumberInBlock?: number; // The specific numbered day (1, 2, etc.) this session refers to
    overallNote?: string;
    createdAt: Timestamp;
    updatedAt?: Timestamp;
}

export interface ExerciseResultObservations {
    nostrils?: string | null;
    lips?: string | null;
    ears?: string | null;
    eyes?: string | null;
    neck?: string | null;
    back?: string | null;
    croup?: string | null;
    limbs?: string | null;
    tail?: string | null;
    additionalNotes?: string | null;
}

// ExerciseResult is now more of a "SessionLogDetail" for a specific *numbered day*
// It might not be directly tied to one MasterExercise if user can pick from suggestions.
// For simplicity, we'll keep the structure but its meaning might shift slightly.
export interface ExerciseResult {
    id: string;
    // exerciseId might store the MasterExercise ID if one was specifically chosen for logging,
    // or could be null/blockId if it's a general log for the numbered day.
    exerciseId: string;
    plannedReps?: string; // What was planned for the day
    doneReps: number; // Kept for consistency, may always be 1 if session is logged for a day
    rating: number; // 0-10, overall rating for the day's work
    createdAt: Timestamp;
    updatedAt?: Timestamp;
    observations?: ExerciseResultObservations | null;
}

export interface Observation {
  id: string;
  horseId: string;
  userId: string;
  date: Timestamp;
  ears?: string | null;
  eyes?: string | null;
  neck?: string | null;
  withers?: string | null;
  back?: string | null;
  loins?: string | null;
  croup?: string | null;
  legs?: string | null;
  hooves?: string | null;
  overallBehavior?: string | null;
  additionalNotes?: string | null;
  photoUrl?: string | null;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface TrainingPlanInput {
  title: string;
  template?: boolean;
  horseId?: string;
  allowedUserIds?: string[] | null;
}

export interface TrainingBlockInput {
  title: string;
  notes?: string;
  duration?: string;
  goal?: string;
  order?: number;
  exerciseReferences?: ExerciseReference[];
  allowedUserIds?: string[] | null;
}

export interface MasterExerciseInput {
  title: string;
  description?: string;
  suggestedReps?: string | null;
  objective?: string;
  whenToAdvance?: string;
  whatNotToDo?: string;
}

export interface SessionDataInput {
    horseId: string;
    date: Timestamp;
    blockId: string;
    dayNumberInBlock: number; // The numbered day (1, 2, etc.)
    // selectedDayExerciseId will be blockId, title will be "Día de Trabajo X"
    selectedDayExerciseId: string;
    selectedDayExerciseTitle: string;
    overallNote?: string;
}

export type SessionUpdateData = Partial<Pick<SessionData, 'date' | 'overallNote' | 'dayNumberInBlock'>>;

export interface ExerciseResultInput {
    exerciseId: string; // Can be blockId or a specific MasterExercise ID if applicable
    plannedReps?: string;
    doneReps: number;
    rating: number; // 0-10
    observations?: ExerciseResultObservations | null;
}

export type ExerciseResultUpdateData = Partial<Omit<ExerciseResult, 'id' | 'createdAt' | 'updatedAt' | 'exerciseId'>>;


export interface ObservationInput {
  date: Timestamp;
  ears?: string | null;
  eyes?: string | null;
  neck?: string | null;
  withers?: string | null;
  back?: string | null;
  loins?: string | null;
  croup?: string | null;
  legs?: string | null;
  hooves?: string | null;
  overallBehavior?: string | null;
  additionalNotes?: string | null;
  photoUrl?: string | null;
}

// DEPRECATED Exercise related types
export interface Exercise {
    id: string;
    planId: string;
    blockId: string;
    title: string;
    description?: string;
    suggestedReps?: string | null;
    objective?: string;
    order?: number;
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}
export interface ExerciseInput {
  title: string;
  description?: string;
  suggestedReps?: string | null;
  objective?: string;
  order?: number;
}

