
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
}

export interface TrainingPlan {
    id: string;
    title: string;
    createdAt: Timestamp;
    updatedAt?: Timestamp;
    template: boolean;
    horseId?: string;
}

export interface ExerciseReference {
  exerciseId: string;
  order: number;
}

export interface TrainingBlock {
    id: string;
    planId: string;
    title: string;
    notes?: string;
    duration?: string;
    goal?: string;
    order?: number;
    exerciseReferences?: ExerciseReference[];
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
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

export interface BlockExerciseDisplay extends MasterExercise {
  orderInBlock: number;
  blockId: string;
}


export interface SessionData {
    id: string;
    horseId: string;
    userId: string;
    date: Timestamp;
    blockId: string; // Represents the "Week" ID
    selectedDayExerciseId?: string; // ID of the MasterExercise representing the "Day"
    selectedDayExerciseTitle?: string; // Title of the MasterExercise representing the "Day"
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

export interface ExerciseResult {
    id: string;
    exerciseId: string; // Refers to the MasterExercise document id (which could be a "Day Card")
    plannedReps?: string;
    doneReps: number;
    rating: number; // 1-5
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
}

export interface TrainingBlockInput {
  title: string; // e.g., "Semana 1"
  notes?: string;
  duration?: string;
  goal?: string;
  order?: number;
  exerciseReferences?: ExerciseReference[]; // References to MasterExercises (which are "Days")
}

export interface MasterExerciseInput { // Represents a "Day Template" or a specific exercise
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
    blockId: string; // ID of the "Week" (TrainingBlock)
    selectedDayExerciseId: string; // ID of the MasterExercise representing the "Day"
    selectedDayExerciseTitle: string; // Title of the MasterExercise representing the "Day"
    overallNote?: string;
}

export type SessionUpdateData = Partial<Pick<SessionData, 'date' | 'overallNote' | 'selectedDayExerciseId' | 'selectedDayExerciseTitle'>>;

export interface ExerciseResultInput {
    exerciseId: string; // ID of the MasterExercise (Day Card)
    plannedReps?: string;
    doneReps: number;
    rating: number;
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
