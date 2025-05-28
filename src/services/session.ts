
import { auth, db } from '@/firebase';
import type { SessionData, SessionDataInput, ExerciseResult, ExerciseResultInput, ExerciseResultObservations, SessionUpdateData, ExerciseResultUpdateData } from '@/types/firestore';
import { collection, addDoc, getDoc, getDocs, doc, serverTimestamp, Timestamp, query, where, orderBy, updateDoc, writeBatch, deleteDoc } from 'firebase/firestore';
import type { User } from 'firebase/auth';

/**
 * Creates a new training session for a horse.
 * @param sessionData The data for the new session.
 * @returns The ID of the newly created session.
 */
export async function createSession(sessionData: SessionDataInput): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("User not authenticated. Please sign in.");
  }
  if (!sessionData.horseId) {
    throw new Error("Horse ID is required to create a session.");
  }

  const sessionsCollectionRef = collection(db, 'horses', sessionData.horseId, 'sessions');
  
  const newSessionDoc: Omit<SessionData, 'id' | 'createdAt' | 'updatedAt'> & { createdAt: Timestamp, updatedAt: Timestamp, userId: string } = {
    ...sessionData,
    userId: user.uid,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };

  try {
    const docRef = await addDoc(sessionsCollectionRef, newSessionDoc);
    console.log('Session created with ID: ', docRef.id);
    return docRef.id;
  } catch (e) {
    console.error('Error creating session: ', e);
    throw e;
  }
}

/**
 * Adds an exercise result to a specific training session.
 * @param horseId The ID of the horse.
 * @param sessionId The ID of the session.
 * @param exerciseResultData The data for the exercise result.
 * @returns The ID of the newly created exercise result.
 */
export async function addExerciseResult(horseId: string, sessionId: string, exerciseResultData: ExerciseResultInput): Promise<string> {
  if (!horseId || !sessionId) {
    throw new Error("Horse ID and Session ID are required to add an exercise result.");
  }
  const exerciseResultsCollectionRef = collection(db, 'horses', horseId, 'sessions', sessionId, 'exerciseResults');
  
  const observationsToSave = exerciseResultData.observations && Object.values(exerciseResultData.observations).some(v => v !== null && v !== undefined && String(v).trim() !== '')
    ? exerciseResultData.observations
    : null;

  const newExerciseResultDoc: Omit<ExerciseResult, 'id' | 'createdAt' | 'updatedAt'> & { createdAt: Timestamp, updatedAt: Timestamp } = {
    ...exerciseResultData,
    observations: observationsToSave,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };

  try {
    const docRef = await addDoc(exerciseResultsCollectionRef, newExerciseResultDoc);
    console.log('Exercise result added with ID: ', docRef.id);
    return docRef.id;
  } catch (e) {
    console.error('Error adding exercise result: ', e);
    throw e;
  }
}


/**
 * Updates fields for a specific exercise result within a session.
 * @param horseId The ID of the horse.
 * @param sessionId The ID of the session.
 * @param exerciseResultId The ID of the exercise result to update.
 * @param data The data to update.
 */
export async function updateExerciseResult(
  horseId: string,
  sessionId: string,
  exerciseResultId: string,
  data: ExerciseResultUpdateData
): Promise<void> {
  if (!horseId || !sessionId || !exerciseResultId) {
    throw new Error("Horse ID, Session ID, and Exercise Result ID are required.");
  }
  const exerciseResultDocRef = doc(db, 'horses', horseId, 'sessions', sessionId, 'exerciseResults', exerciseResultId);
  try {
    await updateDoc(exerciseResultDocRef, {
      ...data,
      updatedAt: serverTimestamp() as Timestamp,
    });
    console.log(`Exercise result ${exerciseResultId} updated successfully.`);
  } catch (e) {
    console.error(`Error updating exercise result ${exerciseResultId}:`, e);
    throw e;
  }
}


/**
 * Fetches a specific training session.
 * @param horseId The ID of the horse.
 * @param sessionId The ID of the session.
 * @returns The session data or null if not found.
 */
export async function getSession(horseId: string, sessionId: string): Promise<SessionData | null> {
  if (!horseId || !sessionId) {
    console.warn("Horse ID and Session ID are required to fetch a session.");
    return null;
  }
  try {
    const sessionDocRef = doc(db, 'horses', horseId, 'sessions', sessionId);
    const sessionDocSnap = await getDoc(sessionDocRef);
    if (sessionDocSnap.exists()) {
      return { id: sessionDocSnap.id, ...sessionDocSnap.data() } as SessionData;
    } else {
      console.log("No such session document!");
      return null;
    }
  } catch (e) {
    console.error('Error fetching session document: ', e);
    throw e;
  }
}

/**
 * Fetches all exercise results for a specific training session.
 * @param horseId The ID of the horse.
 * @param sessionId The ID of the session.
 * @returns An array of exercise results.
 */
export async function getExerciseResults(horseId: string, sessionId: string): Promise<ExerciseResult[]> {
   if (!horseId || !sessionId) {
    console.warn("Horse ID and Session ID are required to fetch exercise results.");
    return [];
  }
  try {
    const exerciseResultsRef = collection(db, 'horses', horseId, 'sessions', sessionId, 'exerciseResults');
    const q = query(exerciseResultsRef, orderBy("createdAt", "asc")); 
    const querySnapshot = await getDocs(q);
    const results: ExerciseResult[] = [];
    querySnapshot.forEach((doc) => {
      results.push({ id: doc.id, ...doc.data() } as ExerciseResult);
    });
    return results;
  } catch (e) {
    console.error('Error fetching exercise results: ', e);
    throw e;
  }
}

/**
 * Fetches all sessions for a specific horse, ordered by date.
 * @param horseId The ID of the horse.
 * @returns An array of session data.
 */
export async function getSessionsByHorseId(horseId: string): Promise<SessionData[]> {
  if (!horseId) {
    console.warn("Horse ID is required to fetch sessions.");
    return [];
  }
  try {
    const sessionsRef = collection(db, 'horses', horseId, 'sessions');
    const q = query(sessionsRef, orderBy("date", "desc")); 
    const querySnapshot = await getDocs(q);
    const sessions: SessionData[] = [];
    querySnapshot.forEach((doc) => {
      sessions.push({ id: doc.id, ...doc.data() } as SessionData);
    });
    return sessions;
  } catch (e) {
    console.error('Error fetching sessions for horse: ', e);
    throw e;
  }
}

/**
 * Updates specific fields of a session document.
 * @param horseId The ID of the horse.
 * @param sessionId The ID of the session.
 * @param data The data to update (e.g., { overallNote: 'new note', date: new Timestamp(...) }).
 */
export async function updateSession(horseId: string, sessionId: string, data: SessionUpdateData): Promise<void> {
  if (!horseId || !sessionId) {
    throw new Error("Horse ID and Session ID are required.");
  }
  const sessionDocRef = doc(db, 'horses', horseId, 'sessions', sessionId);
  try {
    await updateDoc(sessionDocRef, {
      ...data,
      updatedAt: serverTimestamp() as Timestamp,
    });
    console.log(`Session ${sessionId} updated successfully.`);
  } catch (e) {
    console.error(`Error updating session ${sessionId}:`, e);
    throw e;
  }
}

/**
 * Deletes a specific training session and all its exercise results.
 * @param horseId The ID of the horse.
 * @param sessionId The ID of the session to delete.
 */
export async function deleteSession(horseId: string, sessionId: string): Promise<void> {
  if (!horseId || !sessionId) {
    throw new Error("Horse ID and Session ID are required to delete a session.");
  }
  console.log(`[Firestore Service] Attempting to delete session ${sessionId} for horse ${horseId}`);

  const sessionDocRef = doc(db, 'horses', horseId, 'sessions', sessionId);
  const exerciseResultsRef = collection(db, 'horses', horseId, 'sessions', sessionId, 'exerciseResults');

  try {
    const batch = writeBatch(db);

    // Delete all exercise results in the subcollection
    const exerciseResultsSnapshot = await getDocs(exerciseResultsRef);
    exerciseResultsSnapshot.forEach((resultDoc) => {
      batch.delete(resultDoc.ref);
    });
    console.log(`[Firestore Service] Found ${exerciseResultsSnapshot.size} exercise results to delete for session ${sessionId}.`);

    // Delete the session document itself
    batch.delete(sessionDocRef);

    await batch.commit();
    console.log(`[Firestore Service] Successfully deleted session ${sessionId} and its exercise results.`);
  } catch (error) {
    console.error(`[Firestore Service] Error deleting session ${sessionId}:`, error);
    throw error;
  }
}
