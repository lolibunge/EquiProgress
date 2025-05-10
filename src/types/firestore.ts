
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
    createdAt?: Timestamp;
    updatedAt?: Timestamp;
}

export interface SessionData {
    id: string; // Firestore document ID, added when fetched
    horseId: string; // ID of the horse this session belongs to
    date: Timestamp;
    blockId: string;
    overallNote?: string; // General notes for the session
    createdAt: Timestamp;
    updatedAt?: Timestamp;
}

export interface ExerciseResult {
    id: string; // Firestore document ID, added when fetched
    exerciseId: string; // Reference to the Exercise document
    plannedReps?: string; // Number of reps planned for this specific instance
    doneReps: number;
    rating: number; // 1-5
    comment: string;
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
}

export interface ExerciseInput {
  title: string;
  description?: string;
  suggestedReps?: string | null;
  objective?: string;
}
