
import { auth, db } from '@/firebase';
import { collection, addDoc, serverTimestamp, Timestamp, doc, writeBatch, getDoc } from 'firebase/firestore';
import type { SessionData, ExerciseResult } from '@/types/firestore';

/**
 * Creates a new training session for a horse.
 * @param horseId The ID of the horse.
 * @param sessionData Data for the new session.
 * @returns The ID of the newly created session document.
 */
export const createSession = async (horseId: string, sessionData: Omit<SessionData, 'id'>): Promise<string> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Usuario no autenticado. Por favor, inicie sesión.");
  }
  if (!horseId) {
    throw new Error("Se requiere el ID del caballo.");
  }

  const sessionCollectionRef = collection(db, 'horses', horseId, 'sessions');
  
  const newSessionData = {
    ...sessionData,
    // ownerUid: user.uid, // Not typically needed here if horse already has ownerUid
    createdAt: serverTimestamp() as Timestamp, // Firestore will convert this
  };

  try {
    const docRef = await addDoc(sessionCollectionRef, newSessionData);
    console.log('Session document written with ID: ', docRef.id);
    return docRef.id;
  } catch (e) {
    console.error('Error adding session document: ', e);
    throw e;
  }
};

/**
 * Adds an exercise result to a specific training session.
 * @param horseId The ID of the horse.
 * @param sessionId The ID of the session.
 * @param exerciseResultData Data for the exercise result.
 * @returns The ID of the newly created exercise result document.
 */
export const addExerciseResult = async (
  horseId: string, 
  sessionId: string, 
  exerciseResultData: Omit<ExerciseResult, 'id'>
): Promise<string> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Usuario no autenticado. Por favor, inicie sesión.");
  }
  if (!horseId || !sessionId) {
    throw new Error("Se requieren los IDs del caballo y de la sesión.");
  }

  const exerciseResultCollectionRef = collection(db, 'horses', horseId, 'sessions', sessionId, 'exerciseResults');
  
  const newExerciseResultData = {
    ...exerciseResultData,
    createdAt: serverTimestamp() as Timestamp, // Firestore will convert this
  };

  try {
    const docRef = await addDoc(exerciseResultCollectionRef, newExerciseResultData);
    console.log('ExerciseResult document written with ID: ', docRef.id);
    return docRef.id;
  } catch (e) {
    console.error('Error adding ExerciseResult document: ', e);
    throw e;
  }
};

// Potentially add functions to get sessions, get exercise results, etc.
// Example:
// export const getSession = async (horseId: string, sessionId: string): Promise<SessionData | null> => {
//   const sessionDocRef = doc(db, 'horses', horseId, 'sessions', sessionId);
//   const sessionSnap = await getDoc(sessionDocRef);
//   if (sessionSnap.exists()) {
//     return { id: sessionSnap.id, ...sessionSnap.data() } as SessionData;
//   }
//   return null;
// };

    