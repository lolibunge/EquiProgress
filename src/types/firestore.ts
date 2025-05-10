
import type { Timestamp } from 'firebase/firestore';

export interface UserProfile {
    uid: string;
    email?: string | null;
    displayName?: string | null;
    photoURL?: string | null;
    // Add any other user-specific fields here
}

export interface Horse {
  id?: string; // Document ID
  name: string;
    age: number; // Age of the horse
    sex: "Macho" | "Hembra" | "Castrado"; // Sex of the horse
    color: string; // Color of the horse
    photoUrl?: string; // URL to image in Firebase Storage
    ownerUid: string; // UID of the user who owns this horse
    createdAt: Timestamp;
    notes?: string; // General health notes or other remarks
}

export interface TrainingPlan {
    id: string; // Document ID - ensure this is always present
    title: string;
    createdAt: Timestamp;
    template: boolean; // True if this is a base template, false if it's a customized plan for a horse
    // blocks: TrainingBlock[]; // Array of training blocks - This was changed in the guide to be an array of block IDs
    horseId?: string;
}

export interface TrainingBlock {
    id: string; // Unique ID for the block, typically the Firestore document ID
    planId: string; // ID of the plan this block belongs to
    title: string;
    // exercises: Exercise[]; // Array of exercises in this block - This was changed in the guide to be an array of exercise IDs
}

export interface Exercise {
    id: string; // Unique ID for the exercise, typically the Firestore document ID
    planId: string; // ID of the plan this exercise belongs to
    blockId: string; // ID of the block this exercise belongs to
    title: string;
    description?: string;
    suggestedReps?: number;
}

export interface SessionData { // Renamed from Session for clarity with Session service
    id?: string; // Firestore document ID
    date: Timestamp;
    blockId: string; 
    // exerciseId: string; // This is now part of ExerciseResult
    // repsPlanned?: string; // This is now part of ExerciseResult
    // repsDone?: number; // This is now part of ExerciseResult
    // rating?: number; // This is now part of ExerciseResult
    overallNote?: string; // General notes for the session
    // horseId is implicit as this is a subcollection of a horse
}

export interface ExerciseResult {
    id?: string; // Firestore document ID for this specific result entry
    exerciseId: string; // Reference to the Exercise document
    plannedReps?: string; // Number of reps planned for this specific instance
    doneReps: number;
    rating: number;
    comment: string;
    // sessionId is implicit as this is a subcollection of a session
}

    