
import { auth, db } from '@/firebase';
import { collection, addDoc, serverTimestamp, Timestamp, doc, writeBatch, getDoc, getDocs, updateDoc, query } from 'firebase/firestore';
import type { SessionData, ExerciseResult, SessionDataInput, ExerciseResultInput } from '@/types/firestore';

/**
 * Creates a new training session for a horse in the top-level 'sessions' collection.
 * @param sessionInput Data for the new session.
 * @returns The ID of the newly created session document.
 */
export const createSession = async (sessionInput: SessionDataInput): Promise<string> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Usuario no autenticado. Por favor, inicie sesión.");
  }
  if (!sessionInput.horseId) {
    throw new Error("Se requiere el ID del caballo.");
  }

  const sessionCollectionRef = collection(db, 'sessions');
  
  const newSessionData: Omit<SessionData, 'id'> = {
    ...sessionInput,
    userId: user.uid,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
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
 * ExerciseResults are stored as a subcollection of the session.
 * @param sessionId The ID of the session.
 * @param exerciseResultInput Data for the exercise result.
 * @returns The ID of the newly created exercise result document.
 */
export const addExerciseResult = async (
  sessionId: string,
  exerciseResultInput: ExerciseResultInput
): Promise<string> => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Usuario no autenticado. Por favor, inicie sesión.");
  }
  if (!sessionId) {
    throw new Error("Se requiere el ID de la sesión.");
  }

  const exerciseResultCollectionRef = collection(db, 'sessions', sessionId, 'exerciseResults');
  
  const newExerciseResultData: Omit<ExerciseResult, 'id'> = {
    ...exerciseResultInput,
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


export const getSession = async (sessionId: string): Promise<SessionData | null> => {
  if (!sessionId) {
    console.warn("sessionId is required to fetch a session.");
    return null;
  }
  try {
    const sessionDocRef = doc(db, 'sessions', sessionId);
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

export const getExerciseResults = async (sessionId: string): Promise<ExerciseResult[]> => {
  if (!sessionId) {
    console.warn("sessionId is required to fetch exercise results.");
    return [];
  }
  try {
    const exerciseResultsRef = collection(db, 'sessions', sessionId, 'exerciseResults');
    const q = query(exerciseResultsRef); // Potentially order by createdAt if needed
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

export const updateSession = async (sessionId: string, data: Partial<Omit<SessionData, 'id' | 'createdAt' | 'userId' | 'horseId'>>): Promise<void> => {
  if (!sessionId) {
    throw new Error("sessionId is required for updating a session.");
  }
  try {
    const sessionDocRef = doc(db, 'sessions', sessionId);
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
  sessionId: string,
  exerciseResultId: string,
  data: Partial<Omit<ExerciseResult, 'id' | 'createdAt'>>
): Promise<void> => {
  if (!sessionId || !exerciseResultId) {
    throw new Error("sessionId and exerciseResultId are required for updating an exercise result.");
  }
  try {
    const exerciseResultDocRef = doc(db, 'sessions', sessionId, 'exerciseResults', exerciseResultId);
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
