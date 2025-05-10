
import { auth, db } from '@/firebase';
import { collection, addDoc, serverTimestamp, Timestamp, doc, writeBatch, getDoc, getDocs, updateDoc, query } from 'firebase/firestore';
import type { SessionData, ExerciseResult } from '@/types/firestore';

/**
 * Creates a new training session for a horse.
 * @param horseId The ID of the horse.
 * @param sessionData Data for the new session.
 * @returns The ID of the newly created session document.
 */
export const createSession = async (horseId: string, sessionData: Omit<SessionData, 'id' | 'horseId' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Usuario no autenticado. Por favor, inicie sesión.");
  }
  if (!horseId) {
    throw new Error("Se requiere el ID del caballo.");
  }

  const sessionCollectionRef = collection(db, 'horses', horseId, 'sessions');
  
  const newSessionData: Omit<SessionData, 'id'> = {
    ...sessionData,
    horseId: horseId, // Storing horseId with the session
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };

  try {
    const docRef = await addDoc(sessionCollectionRef, newSessionData);
    console.log('Session document written with ID: ', docRef.id);
    // Retrieve the document to get the ID correctly associated with the data
    // const newSessionSnap = await getDoc(docRef);
    // if (newSessionSnap.exists()) {
    //   return { id: newSessionSnap.id, ...newSessionSnap.data() } as SessionData;
    // } else {
    //   throw new Error("Failed to create session document or retrieve it.");
    // }
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
  exerciseResultData: Omit<ExerciseResult, 'id' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Usuario no autenticado. Por favor, inicie sesión.");
  }
  if (!horseId || !sessionId) {
    throw new Error("Se requieren los IDs del caballo y de la sesión.");
  }

  const exerciseResultCollectionRef = collection(db, 'horses', horseId, 'sessions', sessionId, 'exerciseResults');
  
  const newExerciseResultData: Omit<ExerciseResult, 'id'> = {
    ...exerciseResultData,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
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


export const getSession = async (horseId: string, sessionId: string): Promise<SessionData | null> => {
  if (!horseId || !sessionId) {
    console.warn("horseId and sessionId are required to fetch a session.");
    return null;
  }
  try {
    const sessionDocRef = doc(db, 'horses', horseId, 'sessions', sessionId);
    const sessionSnap = await getDoc(sessionDocRef);
    if (sessionSnap.exists()) {
      return { id: sessionSnap.id, ...sessionSnap.data() } as SessionData;
    } else {
      console.log("No such session document!");
      return null;
    }
  } catch (error) {
    console.error("Error fetching session:", error);
    throw error;
  }
};

export const getExerciseResults = async (horseId: string, sessionId: string): Promise<ExerciseResult[]> => {
  if (!horseId || !sessionId) {
    console.warn("horseId and sessionId are required to fetch exercise results.");
    return [];
  }
  try {
    const exerciseResultsRef = collection(db, 'horses', horseId, 'sessions', sessionId, 'exerciseResults');
    // Potentially order by createdAt if needed
    const q = query(exerciseResultsRef);
    const querySnapshot = await getDocs(q);
    const results: ExerciseResult[] = [];
    querySnapshot.forEach((doc) => {
      results.push({ id: doc.id, ...doc.data() } as ExerciseResult);
    });
    return results;
  } catch (error) {
    console.error("Error fetching exercise results:", error);
    throw error;
  }
};

export const updateSession = async (horseId: string, sessionId: string, data: Partial<SessionData>): Promise<void> => {
  if (!horseId || !sessionId) {
    throw new Error("horseId and sessionId are required for updating a session.");
  }
  try {
    const sessionDocRef = doc(db, 'horses', horseId, 'sessions', sessionId);
    await updateDoc(sessionDocRef, {
        ...data,
        updatedAt: serverTimestamp() as Timestamp,
    });
    console.log("Session updated successfully");
  } catch (error) {
    console.error("Error updating session:", error);
    throw error;
  }
};

export const updateExerciseResult = async (
  horseId: string,
  sessionId: string,
  exerciseResultId: string,
  data: Partial<ExerciseResult>
): Promise<void> => {
  if (!horseId || !sessionId || !exerciseResultId) {
    throw new Error("horseId, sessionId, and exerciseResultId are required for updating an exercise result.");
  }
  try {
    const exerciseResultDocRef = doc(db, 'horses', horseId, 'sessions', sessionId, 'exerciseResults', exerciseResultId);
    await updateDoc(exerciseResultDocRef, {
        ...data,
        updatedAt: serverTimestamp() as Timestamp,
    });
    console.log("Exercise result updated successfully");
  } catch (error) {
    console.error("Error updating exercise result:", error);
    throw error;
  }
};
