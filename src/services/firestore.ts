
import { collection, getDocs, query, where, addDoc, serverTimestamp, Timestamp, doc, getDoc, orderBy, limit, writeBatch } from "firebase/firestore";
import { db } from "@/firebase";
import type { TrainingPlan, TrainingBlock, Exercise, TrainingPlanInput, TrainingBlockInput, ExerciseInput } from "@/types/firestore";

export async function getTrainingPlans(): Promise<TrainingPlan[]> {
  console.log("[Firestore Service] Fetching training plans");
  try {
    const trainingPlansRef = collection(db, "trainingPlans");
    const q = query(trainingPlansRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    const trainingPlans: TrainingPlan[] = [];
    querySnapshot.forEach((doc) => {
      trainingPlans.push({ id: doc.id, ...doc.data() } as TrainingPlan);
    });
    console.log(`[Firestore Service] Fetched ${trainingPlans.length} training plans.`);
    return trainingPlans;
  } catch (error) {
    console.error("[Firestore Service] Error fetching training plans:", error);
    throw error;
  }
}

export async function addTrainingPlan(planData: TrainingPlanInput): Promise<string> {
  const planCollectionRef = collection(db, "trainingPlans");
  const newPlanData = {
    ...planData,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
    template: planData.template ?? false,
  };
  try {
    const docRef = await addDoc(planCollectionRef, newPlanData);
    console.log("[Firestore Service] Training plan added with ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("[Firestore Service] Error adding training plan:", error);
    throw error;
  }
}

export async function getTrainingBlocks(planId: string): Promise<TrainingBlock[]> {
  const trimmedPlanId = planId.trim();
  console.log(`[Firestore Service] Attempting to fetch trainingBlocks with planId: "${trimmedPlanId}" (NO ordering - diagnostic)`);
  if (!trimmedPlanId) {
    console.warn("[Firestore Service] getTrainingBlocks: planId is null or empty. Returning empty array.");
    return [];
  }
  try {
    const trainingBlocksRef = collection(db, "trainingBlocks");
    // TEMPORARILY REMOVED orderBy("order", "asc") for diagnostics
    const q = query(trainingBlocksRef, where("planId", "==", trimmedPlanId));
    console.log(`[Firestore Service] Querying trainingBlocks with planId: "${trimmedPlanId}" (NO ordering - diagnostic).`);

    const querySnapshot = await getDocs(q);
    const trainingBlocks: TrainingBlock[] = [];
    console.log(`[Firestore Service] Query snapshot for planId "${trimmedPlanId}" (NO ordering - diagnostic) has ${querySnapshot.size} documents.`);

    querySnapshot.forEach((docSnap) => {
      const blockData = docSnap.data();
      const orderValue = blockData.order !== undefined ? blockData.order : 'N/A (field missing)';
      console.log(`[Firestore Service] Raw block data being processed: ID=${docSnap.id}, Title="${blockData.title}", planId="${blockData.planId}", order=${orderValue}, createdAt exists: ${!!blockData.createdAt}`);
      trainingBlocks.push({ id: docSnap.id, ...blockData } as TrainingBlock);
    });
    
    if (trainingBlocks.length === 0 && querySnapshot.size > 0) {
        console.warn(`[Firestore Service] No blocks were added to 'trainingBlocks' array for planId "${trimmedPlanId}", but query snapshot was NOT empty. This might indicate a data processing issue.`);
    } else if (querySnapshot.size === 0) {
        console.log(`[Firestore Service] NO blocks matched the query for planId: "${trimmedPlanId}". Ensure blocks have correct planId field.`);
    }
    console.log(`[Firestore Service] getTrainingBlocks for planId "${trimmedPlanId}" is returning ${trainingBlocks.length} blocks (NO ordering - diagnostic).`);
    return trainingBlocks;
  } catch (error: any) {
    console.error(`[Firestore Service] Error fetching training blocks for plan ${trimmedPlanId}:`, error);
    // Keep error for missing index if orderBy was present, but now it's removed for diagnostics.
    // if (error.code === 'failed-precondition') {
    //     console.error(`[Firestore Service] INDEX REQUIRED for trainingBlocks: The query (planId: ${trimmedPlanId}, orderBy: order) requires a composite index on 'planId' (asc) and 'order' (asc). Please create it in Firebase Firestore.`);
    // }
    throw error;
  }
}

export async function getBlockById(blockId: string): Promise<TrainingBlock | null> {
  if (!blockId) {
    console.warn("[Firestore Service] getBlockById: blockId is required.");
    return null;
  }
  try {
    const blockDocRef = doc(db, 'trainingBlocks', blockId);
    const blockDocSnap = await getDoc(blockDocRef);
    if (blockDocSnap.exists()) {
      return { id: blockDocSnap.id, ...blockDocSnap.data() } as TrainingBlock;
    } else {
      console.log(`[Firestore Service] No block document found for ID: ${blockId}`);
      return null;
    }
  } catch (e) {
    console.error(`[Firestore Service] Error fetching block document ID ${blockId}:`, e);
    throw e;
  }
}

export async function addTrainingBlock(planId: string, blockData: TrainingBlockInput): Promise<string> {
  const blockCollectionRef = collection(db, "trainingBlocks");

  const q = query(
    collection(db, "trainingBlocks"),
    where("planId", "==", planId),
    orderBy("order", "desc"), // This query is to find the current max order
    limit(1)
  );
  let newOrder = 0;
  try {
    const existingBlocksSnapshot = await getDocs(q);
    if (!existingBlocksSnapshot.empty) {
      const lastBlock = existingBlocksSnapshot.docs[0].data() as TrainingBlock;
      newOrder = (typeof lastBlock.order === 'number' ? lastBlock.order : -1) + 1;
    }
    console.log(`[Firestore Service] New order for block in plan ${planId} will be: ${newOrder}`);
  
    const newBlockData: { [key: string]: any } = {
      planId: planId,
      title: blockData.title,
      order: newOrder, // Assign calculated order
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
    };

    if (blockData.notes !== undefined && blockData.notes.trim() !== "") {
      newBlockData.notes = blockData.notes;
    }
    if (blockData.duration !== undefined && blockData.duration.trim() !== "") {
      newBlockData.duration = blockData.duration;
    }
    if (blockData.goal !== undefined && blockData.goal.trim() !== "") {
      newBlockData.goal = blockData.goal;
    }


    const docRef = await addDoc(blockCollectionRef, newBlockData);
    console.log("[Firestore Service] Training block added with ID:", docRef.id, "and order:", newOrder);
    return docRef.id;
  } catch (error: any) {
    console.error("[Firestore Service] Error adding training block:", error);
     if (error.code === 'failed-precondition' && (error.message.includes('order') || error.message.includes('planId'))) {
        console.error("[Firestore Service] INDEX REQUIRED for adding training block (determining new order): The query requires an index on 'planId' (ASC) and 'order' (DESC). Please create this index in Firebase Firestore.");
    }
    throw error;
  }
}

export async function getExercises(planId: string, blockId: string): Promise<Exercise[]> {
  const trimmedPlanId = planId.trim();
  const trimmedBlockId = blockId.trim();
  console.log(`[Firestore Service] Attempting to fetch exercises with planId: "${trimmedPlanId}" AND blockId: "${trimmedBlockId}" (NO ordering - diagnostic)`);
  try {
    const exercisesRef = collection(db, "exercises");
    // TEMPORARILY REMOVED orderBy("order", "asc") for diagnostics
    const q = query(
      exercisesRef,
      where("planId", "==", trimmedPlanId),
      where("blockId", "==", trimmedBlockId)
    );
    const querySnapshot = await getDocs(q);
    const exercises: Exercise[] = [];
    console.log(`[Firestore Service] Exercise query snapshot for planId "${trimmedPlanId}", blockId "${trimmedBlockId}" (NO ordering - diagnostic) has ${querySnapshot.size} documents.`);
    
    querySnapshot.forEach((docSnap) => {
      const exerciseData = docSnap.data();
      const exercise = { id: docSnap.id, ...exerciseData } as Exercise;
      const orderValue = exerciseData.order !== undefined ? exerciseData.order : 'N/A (field missing)';
      const createdAtValue = exerciseData.createdAt ? 'Present' : 'N/A (field missing)';
      console.log(`[Firestore Service] Raw exercise data being processed: ${exercise.title} (ID: ${exercise.id}), planId: ${exerciseData.planId}, blockId: ${exerciseData.blockId}, createdAt: ${createdAtValue}, order: ${orderValue}`);
      exercises.push(exercise);
    });

    if (exercises.length === 0 && querySnapshot.size > 0) {
        console.warn(`[Firestore Service] No exercises were added to array for planId "${trimmedPlanId}", blockId "${trimmedBlockId}", but query snapshot was NOT empty. This might indicate a data processing issue.`);
    } else if (querySnapshot.size === 0) {
        console.log(`[Firestore Service] No exercises found matching planId: "${trimmedPlanId}" AND blockId: "${trimmedBlockId}" (NO ordering - diagnostic). Ensure exercises have correct IDs.`);
    }
    return exercises;
  } catch (error: any) {
    console.error(`[Firestore Service] Error fetching exercises for plan ${trimmedPlanId}, block ${trimmedBlockId}:`, error);
    // Keep error for missing index if orderBy was present, but now it's removed for diagnostics.
    // if (error.code === 'failed-precondition') {
    //     console.error(`[Firestore Service] INDEX REQUIRED for exercises: The query (planId: ${trimmedPlanId}, blockId: ${trimmedBlockId}, orderBy: order) requires a composite index on 'planId' (asc), 'blockId' (asc), and 'order' (asc). Please create this index in Firebase Firestore.`);
    // }
    throw error;
  }
}

export async function getExercise(exerciseId: string): Promise<Exercise | null> {
  if (!exerciseId) {
    console.warn("[Firestore Service] getExercise: exerciseId is required.");
    return null;
  }
  try {
    const exerciseDocRef = doc(db, 'exercises', exerciseId);
    const exerciseDocSnap = await getDoc(exerciseDocRef);
    if (exerciseDocSnap.exists()) {
      return { id: exerciseDocSnap.id, ...exerciseDocSnap.data() } as Exercise;
    } else {
      console.log(`[Firestore Service] No exercise document found for ID: ${exerciseId}`);
      return null;
    }
  } catch (e) {
    console.error(`[Firestore Service] Error fetching exercise document ID ${exerciseId}:`, e);
    throw e;
  }
}


export async function addExerciseToBlock(planId: string, blockId: string, exerciseData: ExerciseInput): Promise<string> {
  console.log(`[Firestore Service] Attempting to add exercise to planId: "${planId}", blockId: "${blockId}"`);
  const exerciseCollectionRef = collection(db, "exercises");

  const existingExercisesQuery = query(
    collection(db, "exercises"),
    where("planId", "==", planId),
    where("blockId", "==", blockId),
    orderBy("order", "desc"), // This query is to find the current max order
    limit(1)
  );
  let newOrder = 0;
  try {
    const existingExercisesSnapshot = await getDocs(existingExercisesQuery);
    if (!existingExercisesSnapshot.empty) {
      const lastExercise = existingExercisesSnapshot.docs[0].data() as Exercise;
      newOrder = (typeof lastExercise.order === 'number' ? lastExercise.order : -1) + 1;
      console.log(`[Firestore Service] Found existing exercises for plan ${planId}, block ${blockId}. Last order: ${lastExercise.order}. New order: ${newOrder}`);
    } else {
      console.log(`[Firestore Service] No existing exercises found for planId: "${planId}", blockId: "${blockId}". Starting order for new exercise from 0.`);
    }

  const dataToSave: { [key: string]: any } = {
    planId: planId,
    blockId: blockId,
    title: exerciseData.title,
    order: newOrder, // Assign calculated order
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };

  dataToSave.description = exerciseData.description?.trim() || null;
  dataToSave.objective = exerciseData.objective?.trim() || null;
  dataToSave.suggestedReps = typeof exerciseData.suggestedReps === 'string' && exerciseData.suggestedReps.trim() !== "" ? exerciseData.suggestedReps.trim() : null;


  console.log("[Firestore Service] Data to save for new exercise:", JSON.parse(JSON.stringify(dataToSave)));

    const docRef = await addDoc(exerciseCollectionRef, dataToSave);
    console.log("[Firestore Service] Exercise added with ID:", docRef.id, "and order:", newOrder);
    return docRef.id;
  } catch (error: any) {
    console.error("[Firestore Service] Error adding exercise:", error);
     if ((error as any).code === 'failed-precondition' && (error as any).message.includes('order')) {
        console.error("[Firestore Service] INDEX REQUIRED for adding exercise (determining new order): The query requires an index on 'planId' (ASC), 'blockId' (ASC) and 'order' (DESC). Please create this index in Firebase Firestore.");
    }
    throw error;
  }
}

export async function updateExercisesOrder(
  planId: string,
  blockId: string,
  orderedExercises: Array<{ id: string; order: number }>
): Promise<void> {
  console.log("[Firestore Service] Updating exercises order for plan:", planId, "block:", blockId, JSON.parse(JSON.stringify(orderedExercises)));
  const batch = writeBatch(db);

  for (const exercise of orderedExercises) {
    const exerciseRef = doc(db, "exercises", exercise.id);
    batch.update(exerciseRef, { order: exercise.order, updatedAt: serverTimestamp() });
  }

  try {
    await batch.commit();
    console.log("[Firestore Service] Exercises order updated successfully.");
  } catch (error) {
    console.error("[Firestore Service] Error updating exercises order:", error);
    throw error;
  }
}

// Function for debugging block fetching without order clause
export async function debugGetBlocksForPlan(planId: string): Promise<void> {
  console.log(`[DEBUG Firestore Service] debugGetBlocksForPlan called for plan: ${planId}`);
  try {
    const trainingBlocksRef = collection(db, "trainingBlocks");
    const q = query(trainingBlocksRef, where("planId", "==", planId.trim())); // Removed orderBy for debug
    const querySnapshot = await getDocs(q);
    const blocks: { id: string; title: string, planId?: string; order?: number, createdAt?: any }[] = [];
    
    console.log(`[DEBUG Firestore Service] Query snapshot for planId "${planId.trim()}" (NO ordering - debug) has ${querySnapshot.size} documents.`);
    querySnapshot.forEach((docSnap) => {
      const blockData = docSnap.data();
      console.log(`[DEBUG Firestore Service] Raw block data (debug): ID=${docSnap.id}, Title=${blockData.title}, planId=${blockData.planId}, order=${blockData.order}, createdAt exists: ${!!blockData.createdAt}`);
      blocks.push({ id: docSnap.id, title: blockData.title, planId: blockData.planId, order: blockData.order, createdAt: blockData.createdAt });
    });
    console.log(`[DEBUG Firestore Service] Found ${blocks.length} blocks for plan ${planId.trim()} (NO ordering - debug):`, JSON.parse(JSON.stringify(blocks)));

  } catch (error: any) {
    console.error(`[DEBUG Firestore Service] Error in debugGetBlocksForPlan for plan ${planId}:`, error);
    // No specific index error to report here since orderBy was removed for this debug function
  }
}
    
