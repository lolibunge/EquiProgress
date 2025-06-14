
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
    currentBlockStartDate: serverTimestamp() as Timestamp, // Set start date for the first block
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

    const dayKey = String(dayNumber);

    if (!currentPlanProgress[currentBlockId][dayKey]) {
        currentPlanProgress[currentBlockId][dayKey] = { completed: false };
    }

    currentPlanProgress[currentBlockId][dayKey].completed = completed;
    if (completed) {
        currentPlanProgress[currentBlockId][dayKey].completedAt = serverTimestamp() as Timestamp;
    } else {
        // Keep completedAt if it exists, or remove if you want to clear it on uncheck
        // delete currentPlanProgress[currentBlockId][dayKey].completedAt;
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
  const dayMatch = durationString.match(/(\d+)\s*d[íi]as?/i);
  if (dayMatch && dayMatch[1]) {
    const numDays = parseInt(dayMatch[1], 10);
    return isNaN(numDays) ? 0 : numDays;
  }
  const weekMatch = durationString.match(/(\d+)\s*semanas?/i);
  if (weekMatch && weekMatch[1]) {
    const numWeeks = parseInt(weekMatch[1], 10);
    return isNaN(numWeeks) ? 0 : numWeeks * 7;
  }
  console.warn(`[HorseService parseDurationToDays] Could not parse duration string: "${durationString}". Defaulting to 0 days.`);
  return 0;
}

export async function advanceHorseToNextBlock(horseId: string): Promise<{ advanced: boolean; newBlockId?: string; planCompleted: boolean; reason?: 'duration_not_met' | 'no_next_block' | 'not_all_days_completed'; daysRemaining?: number }> {
  console.log(`%c[HorseService advanceHorseToNextBlock] Initiated for Horse ID: ${horseId}`, "color: blue; font-weight: bold;");
  const horseDocRef = doc(db, 'horses', horseId);

  try {
    const horseSnap = await getDoc(horseDocRef);
    if (!horseSnap.exists()) {
      console.error(`[HorseService advanceHorseToNextBlock] Horse ${horseId} not found.`);
      throw new Error("Caballo no encontrado.");
    }

    const horseData = horseSnap.data() as Horse;
    console.log(`[HorseService advanceHorseToNextBlock DEBUG] Horse Data:`, JSON.parse(JSON.stringify(horseData)));

    if (!horseData.activePlanId || !horseData.currentBlockId) {
      console.warn(`[HorseService advanceHorseToNextBlock] Horse ${horseId} does not have an active plan or current block. CurrentBlockId: ${horseData.currentBlockId}, ActivePlanId: ${horseData.activePlanId}`);
      return { advanced: false, planCompleted: false, reason: 'no_next_block' };
    }

    const currentBlockDetails = await getBlockById(horseData.currentBlockId);
    if (!currentBlockDetails) {
        console.error(`[HorseService advanceHorseToNextBlock] Current block data for ${horseData.currentBlockId} not found.`);
        return { advanced: false, planCompleted: false, reason: 'no_next_block' };
    }
    console.log(`[HorseService advanceHorseToNextBlock DEBUG] Current Block Details (fetched): ID=${currentBlockDetails.id}, Title=${currentBlockDetails.title}, Duration=${currentBlockDetails.duration}, Order=${currentBlockDetails.order}`);


    // Duration Check
    const requiredDurationDays = parseDurationToDays(currentBlockDetails.duration);
    console.log(`[HorseService advanceHorseToNextBlock DEBUG] Calculated Required Duration Days for current block: ${requiredDurationDays}`);

    if (requiredDurationDays > 0 && horseData.currentBlockStartDate) {
      const startDate = horseData.currentBlockStartDate.toDate();
      const currentDate = new Date();
      // Ensure startDate is not in the future for calculation purposes
      const safeStartDate = startDate > currentDate ? currentDate : startDate;
      const elapsedMilliseconds = currentDate.getTime() - safeStartDate.getTime();
      const elapsedDays = Math.floor(elapsedMilliseconds / (1000 * 3600 * 24));

      console.log(`[HorseService advanceHorseToNextBlock DEBUG] Duration Check: StartDate=${safeStartDate.toISOString()}, CurrentDate=${currentDate.toISOString()}, ElapsedDays=${elapsedDays}, RequiredDays=${requiredDurationDays}`);

      if (elapsedDays < requiredDurationDays) {
        const daysRemaining = requiredDurationDays - elapsedDays;
        console.log(`%c[HorseService advanceHorseToNextBlock] Duration for block ${horseData.currentBlockId} NOT MET. ${daysRemaining} days remaining. Returning 'duration_not_met'.`, "color: orange;");
        return { advanced: false, reason: 'duration_not_met', daysRemaining: Math.max(0, daysRemaining) , planCompleted: false }; // Ensure daysRemaining is not negative
      }
      console.log(`%c[HorseService advanceHorseToNextBlock DEBUG] Duration check PASSED.`, "color: green;");
    } else if (requiredDurationDays > 0 && !horseData.currentBlockStartDate) {
        console.warn(`[HorseService advanceHorseToNextBlock] Block ${horseData.currentBlockId} has duration ${currentBlockDetails.duration} but horse has no currentBlockStartDate. Duration check SKIPPED (treated as passed for now, but this is likely a data issue).`);
    } else {
        console.log(`[HorseService advanceHorseToNextBlock DEBUG] No specific duration > 0 required for this block (duration: ${currentBlockDetails.duration}), or start date missing. Duration check effectively PASSED or SKIPPED.`);
    }

    // All Days Completed Check (already implicitly done by UI before calling this, but good for robustness if ever called directly)
    // This check is primarily handled by the UI deciding to show the "Siguiente Etapa" button.
    // The service trusts that if it's called, the user intends to advance if duration allows.

    const allBlocksForPlan = await getTrainingBlocks(horseData.activePlanId);
    const sortedAllBlocks = allBlocksForPlan.sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity));
    console.log(`[HorseService advanceHorseToNextBlock DEBUG] Total blocks in plan ${horseData.activePlanId}: ${sortedAllBlocks.length}`);
    sortedAllBlocks.forEach((b, i) => console.log(`[HorseService advanceHorseToNextBlock DEBUG] Plan Block ${i}: ID=${b.id}, Title=${b.title}, Order=${b.order}`));


    if (sortedAllBlocks.length === 0) {
        console.warn(`[HorseService advanceHorseToNextBlock] No blocks found for plan ${horseData.activePlanId}. Cannot advance.`);
        return { advanced: false, planCompleted: false, reason: 'no_next_block' };
    }

    const currentBlockIndex = sortedAllBlocks.findIndex(block => block.id === horseData.currentBlockId);
    console.log(`[HorseService advanceHorseToNextBlock DEBUG] Index of current block (${horseData.currentBlockId}) in sorted plan blocks: ${currentBlockIndex}`);


    if (currentBlockIndex === -1) {
      console.error(`[HorseService advanceHorseToNextBlock] Current block ${horseData.currentBlockId} not found in plan ${horseData.activePlanId}. This might indicate a data inconsistency. Attempting to reset to the first block if available.`);
      const firstBlock = sortedAllBlocks.length > 0 ? sortedAllBlocks[0] : null;
      if (firstBlock) {
         await updateDoc(horseDocRef, {
            currentBlockId: firstBlock.id,
            currentBlockStartDate: serverTimestamp() as Timestamp,
            updatedAt: serverTimestamp() as Timestamp,
          });
          console.log(`[HorseService advanceHorseToNextBlock] Reset horse to first block: ${firstBlock.id}`);
          return { advanced: true, newBlockId: firstBlock.id, planCompleted: false };
      }
      return { advanced: false, planCompleted: false, reason: 'no_next_block' };
    }

    if (currentBlockIndex < sortedAllBlocks.length - 1) {
      const nextBlock = sortedAllBlocks[currentBlockIndex + 1];
      console.log(`%c[HorseService advanceHorseToNextBlock] Advancing to next block: ID=${nextBlock.id}, Title=${nextBlock.title}`, "color: green; font-weight: bold;");
      await updateDoc(horseDocRef, {
        currentBlockId: nextBlock.id,
        currentBlockStartDate: serverTimestamp() as Timestamp, // Reset start date for the new block
        updatedAt: serverTimestamp() as Timestamp,
      });
      return { advanced: true, newBlockId: nextBlock.id, planCompleted: false };
    } else {
      console.log(`%c[HorseService advanceHorseToNextBlock] Horse ${horseId} has completed the last block of plan ${horseData.activePlanId}. Plan is now considered complete.`, "color: green; font-weight: bold;");
      // Optionally clear activePlanId, currentBlockId, or set a planCompleted flag on the horse
      // For now, we'll just indicate completion.
      await updateDoc(horseDocRef, {
        // activePlanId: null, // Example: if you want to mark plan as no longer active
        // currentBlockId: null,
        // currentBlockStartDate: null,
        // activePlanStartDate: null, // Or keep for history
        updatedAt: serverTimestamp() as Timestamp,
       });
      return { advanced: false, planCompleted: true, reason: 'no_next_block' };
    }
  } catch (error) {
    console.error(`[HorseService advanceHorseToNextBlock] CRITICAL Error advancing horse ${horseId} to next block:`, error);
    throw error;
  }
}
