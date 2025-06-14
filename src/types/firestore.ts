
import type { Timestamp } from 'firebase/firestore';

export interface UserProfile {
    uid: string;
    email?: string | null;
    displayName?: string | null;
    photoURL?: string | null;
    role?: 'admin' | 'customer'; // Added role
    // Add any other user-specific fields here
}

export interface Horse {
  id: string; // Document ID - ensure this is always present for fetched data
  name: string;
    age: number; // Age of the horse
    sex: "Macho" | "Hembra" | "Castrado"; // Sex of the horse
    color: string; // Color of the horse
    photoUrl?: string; // URL to image in Firebase Storage
    ownerUid: string; // UID of the user who owns this horse
    createdAt: Timestamp;
    updatedAt?: Timestamp; // Optional: if you track updates
    notes?: string; // General health notes or other remarks
}

export interface TrainingPlan {
    id: string; // Document ID - ensure this is always present
    title: string;
    createdAt: Timestamp;
    updatedAt?: Timestamp;
    template: boolean; // True if this is a base template, false if it's a customized plan for a horse
    horseId?: string; // Optional: if this plan instance is specifically for one horse
    // ownerUid?: string; // Consider adding if non-template plans are specific to an admin
}

export interface ExerciseReference {
  exerciseId: string; // Refers to MasterExercise.id
  order: number;
  // plannedReps could be stored here if it's specific to the block instance
  // For now, we'll assume plannedReps comes from MasterExercise or session input
}

export interface TrainingBlock {
    id: string; // Unique ID for the block, typically the Firestore document ID
    planId: string; // ID of the plan this block belongs to
    title: string;
    notes?: string; // Subtitle or additional notes for the block
    duration?: string; // Optional duration for the block, e.g., "1 semana"
    goal?: string; // Optional goal for the training block
    order?: number; // Order of the block within the plan
    exerciseReferences?: ExerciseReference[]; // Array of references to MasterExercises
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

// This is the new central library for exercises
export interface MasterExercise {
    id: string; // Unique ID for the exercise, typically the Firestore document ID
    title: string;
    description?: string;
    suggestedReps?: string | null;
    objective?: string;
    whenToAdvance?: string; // New field: Cuándo Avanzar
    whatNotToDo?: string;   // New field: Qué no hacer
    // No 'order' here, as order is context-dependent (within a block)
    // No 'planId' or 'blockId' here
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
    // createdByUid?: string; // Optional: to track who created the master exercise
}

// This type can be used when displaying exercises within a block, merging MasterExercise with its reference data
export interface BlockExerciseDisplay extends MasterExercise {
  orderInBlock: number;
  blockId: string; // Added blockId for context
}


export interface SessionData {
    id: string; // Firestore document ID, added when fetched
    horseId: string; // ID of the horse this session belongs to
    userId: string; // ID of the user who created the session
    date: Timestamp;
    blockId: string; // ID of the training block used in this session
    overallNote?: string; // General notes for the session
    createdAt: Timestamp;
    updatedAt?: Timestamp;
}

export interface ExerciseResultObservations {
    nostrils?: string | null; // Ollares
    lips?: string | null;    // Labios
    ears?: string | null;
    eyes?: string | null;
    neck?: string | null;
    back?: string | null;    // Dorso
    croup?: string | null;   // Grupa
    limbs?: string | null;   // Miembros
    tail?: string | null;    // Cola
    additionalNotes?: string | null;
}

export interface ExerciseResult {
    id: string; // Firestore document ID, added when fetched
    // sessionId is implicit as this is a subcollection of a session
    exerciseId: string; // Reference to the MasterExercise document id
    plannedReps?: string; // Number of reps planned for this specific instance
    doneReps: number;
    rating: number; // 1-5
    createdAt: Timestamp;
    updatedAt?: Timestamp;
    observations?: ExerciseResultObservations | null;
}

export interface Observation {
  id: string; // Firestore document ID
  horseId: string; // ID of the horse, for query or denormalization
  userId: string; // ID of the user who made the observation
  date: Timestamp; // Date of the observation
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

// Input types for creating new documents
export interface TrainingPlanInput {
  title: string;
  template?: boolean;
  horseId?: string;
  // ownerUid?: string;
}

export interface TrainingBlockInput {
  title: string;
  notes?: string;
  duration?: string;
  goal?: string;
  order?: number;
  exerciseReferences?: ExerciseReference[];
}

// Input for creating a MasterExercise
export interface MasterExerciseInput {
  title: string;
  description?: string;
  suggestedReps?: string | null;
  objective?: string;
  whenToAdvance?: string; // New field
  whatNotToDo?: string;   // New field
  // createdByUid?: string;
}


// Input type for creating new SessionData
export interface SessionDataInput {
    horseId: string;
    date: Timestamp;
    blockId: string; // This block will contain references to MasterExercises
    overallNote?: string;
}

// Input type for updating existing SessionData
export type SessionUpdateData = Partial<Pick<SessionData, 'date' | 'overallNote'>>;


// Input type for creating new ExerciseResult
export interface ExerciseResultInput {
    exerciseId: string; // Refers to MasterExercise.id
    plannedReps?: string;
    doneReps: number;
    rating: number;
    observations?: ExerciseResultObservations | null;
}

// Input type for updating existing ExerciseResult
export type ExerciseResultUpdateData = Partial<Omit<ExerciseResult, 'id' | 'createdAt' | 'updatedAt' | 'exerciseId'>>;


// Input type for creating new Observation
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

// DEPRECATED Exercise related types - will be removed once refactor is complete
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
// END DEPRECATED
