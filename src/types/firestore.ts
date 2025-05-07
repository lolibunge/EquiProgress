
// src/types/firestore.ts

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
  birthYear: number;
  photoUrl?: string; // URL to image in Firebase Storage
  ownerUid: string; // UID of the user who owns this horse
  createdAt: Timestamp;
  notes?: string; // General health notes or other remarks
}

export interface TrainingPlan {
  id?: string; // Document ID
  title: string;
  createdAt: Timestamp;
  template: boolean; // True if this is a base template, false if it's a customized plan for a horse
  blocks: TrainingBlock[]; // Array of training blocks
  // If template is false, could have horseId association
  horseId?: string; 
}

export interface TrainingBlock {
  id: string; // Unique ID for the block
  name: string;
  exercises: Exercise[];
}

export interface Exercise {
  id: string; // Unique ID for the exercise
  name: string;
  description?: string;
  suggestedReps?: number;
}

export interface TrainingSession {
  id?: string; // Document ID
  date: Timestamp; // Date of the session
  horseId: string;
  planId?: string; // Optional: if session is based on a specific plan
  blockId: string; // ID of the block from the plan or template
  exerciseId: string; // ID of the exercise performed
  repsPlanned?: number;
  repsDone: number;
  rating: 1 | 2 | 3 | 4 | 5; // User's rating of the session part
  notes?: string; // Observations during this specific exercise/session part
}

export interface TensionObservation {
  id?: string; // Document ID
  date: Timestamp;
  horseId: string;
  // Define zones for tension check. Using string for flexibility, could be enum/specific keys
  zones: {
    ears?: TensionZoneRating;
    eyes?: TensionZoneRating;
    poll?: TensionZoneRating;
    neck?: TensionZoneRating;
    withers?: TensionZoneRating;
    back?: TensionZoneRating;
    loins?: TensionZoneRating;
    croup?: TensionZoneRating;
    // Add more zones as needed
  };
  photoUrl?: string; // Optional photo of the observation
  notes?: string; // Overall notes for the observation
}

// Could be 'green', 'yellow', 'red' or numeric scale. Using string for emoji/color mapping.
export type TensionZoneRating = 'good' | 'moderate' | 'bad';
