
import { auth, db } from '@/firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, where, orderBy, Timestamp, doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import type { Horse, TrainingBlock } from '@/types/firestore';
import { getTrainingBlocks, getBlockById } from './firestore'; // Assuming getBlockById is also exported


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

  const newHorseData: Omit<Horse, 'id' | 'photoUrl' | 'notes' | 'activePlanId' | 'activePlanStartDate' | 'currentBlockId' | 'currentBlockStartDate' | 'planProgress'> & { ownerUid: string; createdAt: Timestamp; updatedAt?: Timestamp } = {
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
    currentBlockStartDate: serverTimestamp() as Timestamp,
    planProgress: {}, 
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
    
  try {
    const horseSnap = await getDoc(horseDocRef);
    if (!horseSnap.exists()) {
        console.error(`[HorseService] updateDayCompletionStatus: Horse with ID ${horseId} not found.`);
        throw new Error(`Horse with ID ${horseId} not found.`);
    }
    const horseData = horseSnap.data() as Horse;
    
    const currentPlanProgress = horseData.planProgress || {};
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
        delete currentPlanProgress[currentBlockId][dayExerciseId].completedAt;
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

function parseDurationToDays(durationString?: string | null): number | null {
  if (!durationString) return null;
  const match = durationString.match(/(\d+)\s*d[íi]as?/i); 
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  return null;
}

export async function advanceHorseToNextBlock(horseId: string): Promise<{ advanced: boolean; newBlockId?: string; planCompleted: boolean; reason?: 'duration_not_met' | 'no_next_block' | 'not_all_days_completed'; daysRemaining?: number }> {
  console.log(`[HorseService] advanceHorseToNextBlock called for horseId: ${horseId}`);
  const horseDocRef = doc(db, 'horses', horseId);

  try {
    const horseSnap = await getDoc(horseDocRef);
    if (!horseSnap.exists()) {
      console.error(`[HorseService] advanceHorseToNextBlock: Horse ${horseId} not found.`);
      throw new Error("Caballo no encontrado.");
    }

    const horseData = horseSnap.data() as Horse;
    if (!horseData.activePlanId || !horseData.currentBlockId) {
      console.warn(`[HorseService] advanceHorseToNextBlock: Horse ${horseId} does not have an active plan or current block.`);
      return { advanced: false, planCompleted: false, reason: 'no_next_block' };
    }

    const currentBlockDetails = await getBlockById(horseData.currentBlockId);
    if (!currentBlockDetails) {
        console.error(`[HorseService] advanceHorseToNextBlock: Current block data for ${horseData.currentBlockId} not found.`);
        return { advanced: false, planCompleted: false, reason: 'no_next_block' };
    }

    // Check if all days in the current block are completed
    const currentBlockProgress = horseData.planProgress?.[horseData.currentBlockId];
    const daysInCurrentBlock = currentBlockDetails.exerciseReferences || [];
    const allDaysCompleted = daysInCurrentBlock.every(dayRef => currentBlockProgress?.[dayRef.exerciseId]?.completed);

    if (!allDaysCompleted) {
        console.log(`[HorseService] advanceHorseToNextBlock: Not all days completed for block ${horseData.currentBlockId}.`);
        return { advanced: false, planCompleted: false, reason: 'not_all_days_completed' };
    }

    const requiredDurationDays = parseDurationToDays(currentBlockDetails.duration);
    if (requiredDurationDays && horseData.currentBlockStartDate) {
      const startDate = horseData.currentBlockStartDate.toDate();
      const currentDate = new Date();
      const safeStartDate = startDate > currentDate ? currentDate : startDate;
      const elapsedMilliseconds = currentDate.getTime() - safeStartDate.getTime();
      const elapsedDays = elapsedMilliseconds / (1000 * 3600 * 24);
      
      console.log(`[HorseService] Duration check for block ${currentBlockDetails.id} (${currentBlockDetails.title}): Required=${requiredDurationDays}, StartDate=${safeStartDate.toISOString()}, CurrentDate=${currentDate.toISOString()}, ElapsedDays=${elapsedDays.toFixed(2)}`);

      if (elapsedDays < requiredDurationDays) {
        const daysRemaining = Math.ceil(requiredDurationDays - elapsedDays);
        console.log(`[HorseService] advanceHorseToNextBlock: Duration for block ${horseData.currentBlockId} not met. ${daysRemaining} days remaining.`);
        return { advanced: false, reason: 'duration_not_met', daysRemaining: daysRemaining, planCompleted: false };
      }
    } else if (requiredDurationDays) {
        console.warn(`[HorseService] advanceHorseToNextBlock: Block ${horseData.currentBlockId} has duration ${currentBlockDetails.duration} but horse has no currentBlockStartDate. Duration check skipped.`);
    }

    const allBlocksForPlan = await getTrainingBlocks(horseData.activePlanId);
     const sortedAllBlocks = allBlocksForPlan.sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity));

    if (sortedAllBlocks.length === 0) {
        console.warn(`[HorseService] advanceHorseToNextBlock: No blocks found for plan ${horseData.activePlanId}.`);
        return { advanced: false, planCompleted: false, reason: 'no_next_block' };
    }

    const currentBlockIndex = sortedAllBlocks.findIndex(block => block.id === horseData.currentBlockId);

    if (currentBlockIndex === -1) {
      console.error(`[HorseService] advanceHorseToNextBlock: Current block ${horseData.currentBlockId} not found in plan ${horseData.activePlanId}.`);
      return { advanced: false, planCompleted: false, reason: 'no_next_block' };
    }

    if (currentBlockIndex < sortedAllBlocks.length - 1) {
      const nextBlock = sortedAllBlocks[currentBlockIndex + 1];
      await updateDoc(horseDocRef, {
        currentBlockId: nextBlock.id,
        currentBlockStartDate: serverTimestamp() as Timestamp, 
        updatedAt: serverTimestamp() as Timestamp,
      });
      console.log(`[HorseService] advanceHorseToNextBlock: Horse ${horseId} advanced to block ${nextBlock.id} (${nextBlock.title}).`);
      return { advanced: true, newBlockId: nextBlock.id, planCompleted: false };
    } else {
      console.log(`[HorseService] advanceHorseToNextBlock: Horse ${horseId} has completed the last block of plan ${horseData.activePlanId}.`);
      await updateDoc(horseDocRef, { 
        // Consider how to mark plan as "completed" vs just no active block
        // For now, let's keep currentBlockId as the last one, but indicate completion
        updatedAt: serverTimestamp() as Timestamp,
       });
      return { advanced: false, planCompleted: true, reason: 'no_next_block' };
    }
  } catch (error) {
    console.error(`[HorseService] advanceHorseToNextBlock: Error advancing horse ${horseId} to next block:`, error);
    throw error;
  }
}

