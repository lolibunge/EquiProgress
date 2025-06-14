
import { auth, db } from '@/firebase';
import { collection, addDoc, getDocs, serverTimestamp, query, where, orderBy, Timestamp, doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import type { Horse, TrainingBlock } from '@/types/firestore';
import { getTrainingBlocks, getBlockById } from './firestore';


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

// Updated to handle numbered days
export async function updateDayCompletionStatus(horseId: string, currentBlockId: string, dayNumber: number, completed: boolean): Promise<void> {
  console.log(`[HorseService] updateDayCompletionStatus called for horseId: ${horseId}, blockId: ${currentBlockId}, dayNumber: ${dayNumber}, completed: ${completed}`);
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
    
    const dayKey = String(dayNumber); // Use string key for Firestore map

    if (!currentPlanProgress[currentBlockId][dayKey]) {
        currentPlanProgress[currentBlockId][dayKey] = { completed: false };
    }
    
    currentPlanProgress[currentBlockId][dayKey].completed = completed;
    if (completed) {
        currentPlanProgress[currentBlockId][dayKey].completedAt = serverTimestamp() as Timestamp;
    } else {
        delete currentPlanProgress[currentBlockId][dayKey].completedAt;
    }

    await updateDoc(horseDocRef, {
        planProgress: currentPlanProgress,
        updatedAt: serverTimestamp() as Timestamp
    });

    console.log(`[HorseService] updateDayCompletionStatus: Day ${dayNumber} in block ${currentBlockId} for horse ${horseId} marked as ${completed ? 'complete' : 'incomplete'}.`);
  } catch (e) {
    console.error(`[HorseService] updateDayCompletionStatus: Error updating day completion for horse ${horseId}:`, e);
    throw e;
  }
}

export function parseDurationToDays(durationString?: string | null): number {
  if (!durationString) return 0;
  const match = durationString.match(/(\d+)\s*d[íi]as?/i); 
  if (match && match[1]) {
    const numDays = parseInt(match[1], 10);
    return isNaN(numDays) ? 0 : numDays;
  }
  const weekMatch = durationString.match(/(\d+)\s*semanas?/i);
  if (weekMatch && weekMatch[1]) {
    const numWeeks = parseInt(weekMatch[1], 10);
    return isNaN(numWeeks) ? 0 : numWeeks * 7;
  }
  return 0; // Default to 0 if parsing fails
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

    const totalDaysInBlockDuration = parseDurationToDays(currentBlockDetails.duration);
    const blockProgress = horseData.planProgress?.[horseData.currentBlockId] || {};
    let completedDaysCount = 0;
    for (let i = 1; i <= totalDaysInBlockDuration; i++) {
        if (blockProgress[String(i)]?.completed) {
            completedDaysCount++;
        }
    }
    
    if (totalDaysInBlockDuration > 0 && completedDaysCount < totalDaysInBlockDuration) {
        console.log(`[HorseService] advanceHorseToNextBlock: Not all ${totalDaysInBlockDuration} numbered days completed for block ${horseData.currentBlockId}. Found ${completedDaysCount} completed.`);
        return { advanced: false, planCompleted: false, reason: 'not_all_days_completed' };
    }
    if (totalDaysInBlockDuration === 0 && (currentBlockDetails.exerciseReferences && currentBlockDetails.exerciseReferences.length > 0)) {
      console.warn(`[HorseService] advanceHorseToNextBlock: Block ${currentBlockDetails.id} has duration 0 but has suggested exercises. Assuming it cannot be "completed" by days. Please set a duration.`);
       // return { advanced: false, planCompleted: false, reason: 'not_all_days_completed' }; // Or handle as immediately completable if no duration
    }


    const requiredDurationDays = parseDurationToDays(currentBlockDetails.duration); // Already have this as totalDaysInBlockDuration
    if (requiredDurationDays && horseData.currentBlockStartDate) {
      const startDate = horseData.currentBlockStartDate.toDate();
      const currentDate = new Date();
      const safeStartDate = startDate > currentDate ? currentDate : startDate; // Prevent future start dates from causing issues
      const elapsedMilliseconds = currentDate.getTime() - safeStartDate.getTime();
      const elapsedDays = Math.floor(elapsedMilliseconds / (1000 * 3600 * 24)); // Use Math.floor
      
      console.log(`[HorseService] Duration check for block ${currentBlockDetails.id} (${currentBlockDetails.title}): Required=${requiredDurationDays}, StartDate=${safeStartDate.toISOString()}, CurrentDate=${currentDate.toISOString()}, ElapsedDays=${elapsedDays}`);

      if (elapsedDays < requiredDurationDays) {
        const daysRemaining = requiredDurationDays - elapsedDays;
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
      // This might happen if the block was deleted. Reset horse's plan.
       await updateDoc(horseDocRef, {
        currentBlockId: null,
        currentBlockStartDate: null,
        activePlanId: null, // Or keep activePlanId and let user restart? For now, clear.
        activePlanStartDate: null,
        planProgress: {},
        updatedAt: serverTimestamp() as Timestamp,
      });
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
      // Optionally, you might want to clear activePlanId, currentBlockId here or set a 'completedPlan' flag.
      // For now, just indicate plan completion.
      await updateDoc(horseDocRef, { 
        updatedAt: serverTimestamp() as Timestamp,
       });
      return { advanced: false, planCompleted: true, reason: 'no_next_block' };
    }
  } catch (error) {
    console.error(`[HorseService] advanceHorseToNextBlock: Error advancing horse ${horseId} to next block:`, error);
    throw error;
  }
}
