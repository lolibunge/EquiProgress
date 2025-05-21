
import { auth, db } from '@/firebase';
import type { SessionData, SessionDataInput, ExerciseResult, ExerciseResultInput, ExerciseResultObservations } from '@/types/firestore';
import { collection, addDoc, getDoc, getDocs, doc, serverTimestamp, Timestamp, query, where, orderBy, updateDoc } from 'firebase/firestore';
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
  
  // Ensure observations is either a valid object or null/undefined, not an empty object if it has no meaningful data.
  const observationsToSave = exerciseResultData.observations && Object.values(exerciseResultData.observations).some(v => v !== null && v !== undefined && v !== '')
    ? exerciseResultData.observations
    : null;

  const newExerciseResultDoc: Omit<ExerciseResult, 'id' | 'createdAt' | 'updatedAt'> & { createdAt: Timestamp, updatedAt: Timestamp } = {
    ...exerciseResultData,
    observations: observationsToSave || undefined, // Store undefined if observationsToSave is null
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
 * Updates the observations for a specific exercise result within a session.
 * @param horseId The ID of the horse.
 * @param sessionId The ID of the session.
 * @param exerciseResultId The ID of the exercise result to update.
 * @param observations The new or updated observation data.
 */
export async function updateExerciseResultObservations(
  horseId: string,
  sessionId: string,
  exerciseResultId: string,
  observations: ExerciseResultObservations
): Promise<void> {
  if (!horseId || !sessionId || !exerciseResultId) {
    throw new Error("Horse ID, Session ID, and Exercise Result ID are required.");
  }
  const exerciseResultDocRef = doc(db, 'horses', horseId, 'sessions', sessionId, 'exerciseResults', exerciseResultId);
  try {
    await updateDoc(exerciseResultDocRef, {
      observations: observations, // This will overwrite the existing observations object
      updatedAt: serverTimestamp() as Timestamp,
    });
    console.log(`Observations for exercise result ${exerciseResultId} updated successfully.`);
  } catch (e) {
    console.error(`Error updating observations for exercise result ${exerciseResultId}:`, e);
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
    // Ordering by 'createdAt' or 'order' if you add an order to exercise results within a session
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

    