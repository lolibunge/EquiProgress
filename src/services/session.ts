
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
  console.log("[SessionService] createSession called with data:", sessionData);
  const user = auth.currentUser;
  if (!user) {
    console.error("[SessionService] createSession: User not authenticated.");
    throw new Error("User not authenticated. Please sign in.");
  }
  if (!sessionData.horseId) {
    console.error("[SessionService] createSession: Horse ID is required.");
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
    console.log('[SessionService] createSession: Session created with ID: ', docRef.id);
    return docRef.id;
  } catch (e) {
    console.error('[SessionService] createSession: Error creating session: ', e);
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
  console.log(`[SessionService] addExerciseResult called for horseId: ${horseId}, sessionId: ${sessionId}, data:`, exerciseResultData);
  if (!horseId || !sessionId) {
    console.error("[SessionService] addExerciseResult: Horse ID and Session ID are required.");
    throw new Error("Horse ID and Session ID are required to add an exercise result.");
  }
  const exerciseResultsCollectionRef = collection(db, 'horses', horseId, 'sessions', sessionId, 'exerciseResults');
  
  const observationsToSave = exerciseResultData.observations && Object.values(exerciseResultData.observations).some(v => v !== null && v !== undefined && String(v).trim() !== '')
    ? exerciseResultData.observations
    : null;

  const newExerciseResultDoc: Omit<ExerciseResult, 'id' | 'createdAt' | 'updatedAt'> & { createdAt: Timestamp, updatedAt: Timestamp } = {
    exerciseId: exerciseResultData.exerciseId,
    plannedReps: exerciseResultData.plannedReps,
    doneReps: exerciseResultData.doneReps,
    rating: exerciseResultData.rating,
    observations: observationsToSave,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };

  try {
    const docRef = await addDoc(exerciseResultsCollectionRef, newExerciseResultDoc);
    console.log('[SessionService] addExerciseResult: Exercise result added with ID: ', docRef.id);
    return docRef.id;
  } catch (e) {
    console.error('[SessionService] addExerciseResult: Error adding exercise result: ', e);
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
  console.log(`[SessionService] updateExerciseResult called for horseId: ${horseId}, sessionId: ${sessionId}, exerciseResultId: ${exerciseResultId}, data:`, data);
  if (!horseId || !sessionId || !exerciseResultId) {
     console.error("[SessionService] updateExerciseResult: Horse ID, Session ID, and Exercise Result ID are required.");
    throw new Error("Horse ID, Session ID, and Exercise Result ID are required.");
  }
  const exerciseResultDocRef = doc(db, 'horses', horseId, 'sessions', sessionId, 'exerciseResults', exerciseResultId);
  
  const updateData: any = { ...data };
  if (data.observations && Object.keys(data.observations).length === 0) {
    updateData.observations = null;
  } else if (data.observations) {
    updateData.observations = data.observations;
  }


  try {
    await updateDoc(exerciseResultDocRef, {
      ...updateData,
      updatedAt: serverTimestamp() as Timestamp,
    });
    console.log(`[SessionService] updateExerciseResult: Exercise result ${exerciseResultId} updated successfully.`);
  } catch (e) {
    console.error(`[SessionService] updateExerciseResult: Error updating exercise result ${exerciseResultId}:`, e);
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
  console.log(`[SessionService] getSession called for horseId: ${horseId}, sessionId: ${sessionId}`);
  if (!horseId || !sessionId) {
    console.warn("[SessionService] getSession: Horse ID and Session ID are required. Returning null.");
    return null;
  }
  try {
    const sessionDocRef = doc(db, 'horses', horseId, 'sessions', sessionId);
    const sessionDocSnap = await getDoc(sessionDocRef);
    if (sessionDocSnap.exists()) {
      const sessionData = { id: sessionDocSnap.id, ...sessionDocSnap.data() } as SessionData;
      console.log(`[SessionService] getSession: Found session for ID ${sessionId}:`, sessionData);
      return sessionData;
    } else {
      console.log(`[SessionService] getSession: No such session document for ID: ${sessionId}`);
      return null;
    }
  } catch (e) {
    console.error(`[SessionService] getSession: Error fetching session document for ID ${sessionId}:`, e);
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
   console.log(`[SessionService] getExerciseResults called for horseId: ${horseId}, sessionId: ${sessionId}`);
   if (!horseId || !sessionId) {
    console.warn("[SessionService] getExerciseResults: Horse ID and Session ID are required. Returning empty array.");
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
    console.log(`[SessionService] getExerciseResults: Fetched ${results.length} exercise results for session ${sessionId}.`);
    return results;
  } catch (e: any) {
    console.error(`[SessionService] getExerciseResults: Error fetching exercise results for session ${sessionId}:`, e);
    if (e.code === 'failed-precondition' && e.message.includes('index')) {
      console.error(`[SessionService] INDEX_REQUIRED: Firestore query for getExerciseResults (sessionId: ${sessionId}, orderBy: createdAt asc) likely needs an index. Please check the Firebase console for a link to create it. Link: ${e.message.substring(e.message.indexOf('https://'))}`);
    }
    throw e;
  }
}

/**
 * Fetches all sessions for a specific horse, ordered by date.
 * @param horseId The ID of the horse.
 * @returns An array of session data.
 */
export async function getSessionsByHorseId(horseId: string): Promise<SessionData[]> {
  console.log(`[SessionService] getSessionsByHorseId called for horseId: ${horseId}`);
  if (!horseId) {
    console.warn("[SessionService] getSessionsByHorseId: Horse ID is required. Returning empty array.");
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
    console.log(`[SessionService] getSessionsByHorseId: Fetched ${sessions.length} sessions for horse ${horseId}.`);
    return sessions;
  } catch (e: any) {
    console.error(`[SessionService] getSessionsByHorseId: Error fetching sessions for horse ${horseId}:`, e);
    if (e.code === 'failed-precondition' && e.message.includes('index')) {
      console.error(`[SessionService] INDEX_REQUIRED: Firestore query for getSessionsByHorseId (horseId: ${horseId}, orderBy: date desc) likely needs an index. Please check the Firebase console for a link to create it. Link: ${e.message.substring(e.message.indexOf('https://'))}`);
    }
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
  console.log(`[SessionService] updateSession called for horseId: ${horseId}, sessionId: ${sessionId}, data:`, data);
  if (!horseId || !sessionId) {
     console.error("[SessionService] updateSession: Horse ID and Session ID are required.");
    throw new Error("Horse ID and Session ID are required.");
  }
  const sessionDocRef = doc(db, 'horses', horseId, 'sessions', sessionId);
  try {
    await updateDoc(sessionDocRef, {
      ...data,
      updatedAt: serverTimestamp() as Timestamp,
    });
    console.log(`[SessionService] updateSession: Session ${sessionId} updated successfully.`);
  } catch (e) {
    console.error(`[SessionService] updateSession: Error updating session ${sessionId}:`, e);
    throw e;
  }
}

/**
 * Deletes a specific training session and all its exercise results.
 * @param horseId The ID of the horse.
 * @param sessionId The ID of the session to delete.
 */
export async function deleteSession(horseId: string, sessionId: string): Promise<void> {
  console.log(`[SessionService] deleteSession: Attempting to delete session ${sessionId} for horse ${horseId}`);
  if (!horseId || !sessionId) {
    console.error("[SessionService] deleteSession: Horse ID and Session ID are required.");
    throw new Error("Horse ID and Session ID are required to delete a session.");
  }

  const sessionDocRef = doc(db, 'horses', horseId, 'sessions', sessionId);
  const exerciseResultsRef = collection(db, 'horses', horseId, 'sessions', sessionId, 'exerciseResults');

  try {
    const batch = writeBatch(db);

    const exerciseResultsSnapshot = await getDocs(exerciseResultsRef);
    exerciseResultsSnapshot.forEach((resultDoc) => {
      batch.delete(resultDoc.ref);
    });
    console.log(`[SessionService] deleteSession: Found ${exerciseResultsSnapshot.size} exercise results to delete for session ${sessionId}.`);

    batch.delete(sessionDocRef);

    await batch.commit();
    console.log(`[SessionService] deleteSession: Successfully deleted session ${sessionId} and its exercise results.`);
  } catch (error) {
    console.error(`[SessionService] deleteSession: Error deleting session ${sessionId}:`, error);
    throw error;
  }
}

