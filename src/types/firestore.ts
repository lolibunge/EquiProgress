
import type { Timestamp } from 'firebase/firestore';

export interface UserProfile {
    uid: string;
    email?: string | null;
    displayName?: string | null;
    photoURL?: string | null;
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
}

export interface TrainingBlock {
    id: string; // Unique ID for the block, typically the Firestore document ID
    planId: string; // ID of the plan this block belongs to
    title: string;
    notes?: string; // Subtitle or additional notes for the block
    duration?: string; // Optional duration for the block, e.g., "1 semana"
    goal?: string; // Optional goal for the training block
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

export interface Exercise {
    id: string; // Unique ID for the exercise, typically the Firestore document ID
    planId: string; // ID of the plan this exercise belongs to
    blockId: string; // ID of the block this exercise belongs to
    title: string;
    description?: string;
    suggestedReps?: string | null;
    objective?: string;
    order?: number; // Order of the exercise within the block
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
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

export interface ExerciseResult {
    id: string; // Firestore document ID, added when fetched
    // sessionId is implicit as this is a subcollection of a session
    exerciseId: string; // Reference to the Exercise document
    plannedReps?: string; // Number of reps planned for this specific instance
    doneReps: number;
    rating: number; // 1-5
    comment: string;
    createdAt: Timestamp;
    updatedAt?: Timestamp;

    // Add a nested structure for observations related to this exercise
    observations?: {
        ears?: string; // Status/emoji/color for ears
        eyes?: string;
        neck?: string;
        withers?: string; // Cruz
        back?: string;
        loins?: string; // Riñones
        croup?: string; // Grupa
        legs?: string; // Patas/Manos
        hooves?: string; // Cascos
        overallBehavior?: string; // General behavior notes for this exercise
        additionalNotes?: string; // Any other notes for this exercise
    };
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
}

export interface TrainingBlockInput {
  title: string;
  notes?: string;
  duration?: string;
  goal?: string; // Optional goal for the training block
}

export interface ExerciseInput {
  title: string;
  description?: string;
  suggestedReps?: string | null;
  objective?: string;
  order?: number; // Order of the exercise within the block
}

// Input type for creating new SessionData
export interface SessionDataInput {
    horseId: string;
    date: Timestamp;
    blockId: string;
    overallNote?: string;
}

// Input type for creating new ExerciseResult
export interface ExerciseResultInput {
    exerciseId: string;
    plannedReps?: string;
    doneReps: number;
    rating: number;
    comment: string;
     observations?: {
        ears?: string;
        eyes?: string;
        neck?: string;
        withers?: string;
        back?: string;
        loins?: string;
        croup?: string;
        legs?: string;
        hooves?: string;
        overallBehavior?: string;
        additionalNotes?: string;
    };
}

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
