
import { auth, db } from '@/firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, where, orderBy, Timestamp, doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import type { Horse } from '@/types/firestore';


// Interface for the data collected from the form
export interface HorseInputData {
  name: string;
  age: number;
  sex: "Macho" | "Hembra" | "Castrado";
  color: string;
}

export const addHorse = async (horseData: HorseInputData): Promise<string> => {
  console.log("[HorseService] addHorse called with data:", horseData);
  const user = auth.currentUser;
  if (!user) {
    console.error("[HorseService] addHorse: User not authenticated.");
    throw new Error("Usuario no autenticado. Por favor, inicie sesión.");
  }

  const newHorseData: Omit<Horse, 'id' | 'photoUrl' | 'notes' | 'activePlanId' | 'activePlanStartDate' | 'currentBlockId' | 'planProgress'> & { ownerUid: string; createdAt: Timestamp; updatedAt?: Timestamp } = {
    name: horseData.name,
    age: horseData.age,
    sex: horseData.sex,
    color: horseData.color,
    ownerUid: user.uid,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };

  try {
    const docRef = await addDoc(collection(db, 'horses'), newHorseData);
    console.log('[HorseService] addHorse: Document written with ID: ', docRef.id);
    return docRef.id;
  } catch (e) {
    console.error('[HorseService] addHorse: Error adding document: ', e);
    throw e;
  }
};

export const getHorses = async (ownerUid: string): Promise<Horse[]> => {
  console.log(`[HorseService] getHorses called for ownerUid: ${ownerUid}`);
  if (!ownerUid) {
    console.warn("[HorseService] getHorses: ownerUid is required. Returning empty array.");
    return [];
  }
  try {
    const q = query(
      collection(db, 'horses'),
      where("ownerUid", "==", ownerUid),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);
    const horses: Horse[] = [];
    querySnapshot.forEach((doc) => {
      horses.push({ id: doc.id, ...doc.data() } as Horse);
    });
    console.log(`[HorseService] getHorses: Fetched ${horses.length} horses for ownerUid ${ownerUid}.`);
    return horses;
  } catch (e: any) {
    console.error(`[HorseService] getHorses: Error fetching documents for ownerUid ${ownerUid}:`, e);
    if (e.code === 'failed-precondition' && e.message.includes('index')) {
      console.error(`[HorseService] INDEX_REQUIRED: Firestore query for getHorses (ownerUid: ${ownerUid}, orderBy: createdAt desc) likely needs a composite index. Please check the Firebase console for a link to create it.`);
    }
    throw e;
  }
};

export const getHorseById = async (horseId: string): Promise<Horse | null> => {
  console.log(`[HorseService] getHorseById called for horseId: ${horseId}`);
  if (!horseId) {
    console.warn("[HorseService] getHorseById: horseId is required. Returning null.");
    return null;
  }
  try {
    const horseDocRef = doc(db, 'horses', horseId);
    const horseDocSnap = await getDoc(horseDocRef);
    if (horseDocSnap.exists()) {
      const horseData = { id: horseDocSnap.id, ...horseDocSnap.data() } as Horse;
      console.log(`[HorseService] getHorseById: Found horse for ID ${horseId}:`, JSON.parse(JSON.stringify(horseData)));
      return horseData;
    } else {
      console.log(`[HorseService] getHorseById: No such horse document for ID: ${horseId}`);
      return null;
    }
  } catch (e) {
    console.error(`[HorseService] getHorseById: Error fetching horse document for ID ${horseId}:`, e);
    throw e;
  }
};

export async function startPlanForHorse(horseId: string, planId: string, firstBlockId: string): Promise<void> {
  console.log(`[HorseService] startPlanForHorse called for horseId: ${horseId}, planId: ${planId}, firstBlockId: ${firstBlockId}`);
  const horseDocRef = doc(db, 'horses', horseId);
  const updateData: Partial<Horse> = {
    activePlanId: planId,
    activePlanStartDate: serverTimestamp() as Timestamp,
    currentBlockId: firstBlockId,
    planProgress: {}, // Reset progress for the new plan
    updatedAt: serverTimestamp() as Timestamp,
  };
  try {
    await updateDoc(horseDocRef, updateData);
    console.log(`[HorseService] startPlanForHorse: Plan ${planId} started for horse ${horseId}. Current block: ${firstBlockId}.`);
  } catch (e) {
    console.error(`[HorseService] startPlanForHorse: Error starting plan for horse ${horseId}:`, e);
    throw e;
  }
}

export async function updateDayCompletionStatus(horseId: string, currentBlockId: string, dayExerciseId: string, completed: boolean): Promise<void> {
  console.log(`[HorseService] updateDayCompletionStatus called for horseId: ${horseId}, blockId: ${currentBlockId}, dayExerciseId: ${dayExerciseId}, completed: ${completed}`);
  const horseDocRef = doc(db, 'horses', horseId);

  // Construct the path for the specific day's completion status
  // Firestore field paths with variables need to be constructed carefully
  const progressFieldPath = `planProgress.${currentBlockId}.${dayExerciseId}.completed`;
  const progressTimestampPath = `planProgress.${currentBlockId}.${dayExerciseId}.completedAt`;

  const updateData: { [key: string]: any } = {
    [progressFieldPath]: completed,
    updatedAt: serverTimestamp() as Timestamp,
  };

  if (completed) {
    updateData[progressTimestampPath] = serverTimestamp() as Timestamp;
  } else {
    // If unchecking, you might want to remove completedAt or set to null
    // For simplicity, Firestore often handles non-existent paths gracefully,
    // but explicitly setting to null might be cleaner if you query by it.
    // For now, we'll just update 'completed'. If completedAt is only set when true, this is fine.
  }


  try {
    // Using updateDoc to set nested properties.
    // This requires that the `planProgress` and `planProgress[currentBlockId]` objects exist.
    // A more robust solution might use a transaction to read, modify, and write if these parent objects might not exist.
    // For now, we assume `startPlanForHorse` initializes `planProgress: {}`.
    // And when the first day in a block is completed, `planProgress[currentBlockId]` will be implicitly created by Firestore
    // if `planProgress` itself exists.
    
    // To ensure the parent path (planProgress.blockId) exists:
    const horseSnap = await getDoc(horseDocRef);
    const horseData = horseSnap.data() as Horse | undefined;
    
    const currentPlanProgress = horseData?.planProgress || {};
    if (!currentPlanProgress[currentBlockId]) {
        currentPlanProgress[currentBlockId] = {};
    }
    if (!currentPlanProgress[currentBlockId][dayExerciseId]) {
        currentPlanProgress[currentBlockId][dayExerciseId] = { completed: false };
    }
    currentPlanProgress[currentBlockId][dayExerciseId].completed = completed;
    if (completed) {
        currentPlanProgress[currentBlockId][dayExerciseId].completedAt = serverTimestamp() as Timestamp;
    } else {
        delete currentPlanProgress[currentBlockId][dayExerciseId].completedAt; // Or set to null
    }


    await updateDoc(horseDocRef, {
        planProgress: currentPlanProgress,
        updatedAt: serverTimestamp() as Timestamp
    });

    console.log(`[HorseService] updateDayCompletionStatus: Day ${dayExerciseId} in block ${currentBlockId} for horse ${horseId} marked as ${completed ? 'complete' : 'incomplete'}.`);
  } catch (e) {
    console.error(`[HorseService] updateDayCompletionStatus: Error updating day completion for horse ${horseId}:`, e);
    throw e;
  }
}
