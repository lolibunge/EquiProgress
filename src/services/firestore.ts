
import { collection, getDocs, query, where, addDoc, serverTimestamp, Timestamp, doc, getDoc, orderBy, limit, writeBatch, updateDoc, deleteDoc, runTransaction, arrayUnion, arrayRemove, FieldValue } from "firebase/firestore";
import { db } from "@/firebase";
import type { TrainingPlan, TrainingBlock, TrainingPlanInput, TrainingBlockInput, MasterExercise, MasterExerciseInput, ExerciseReference, BlockExerciseDisplay } from "@/types/firestore";

// --- TrainingPlan Functions ---
export async function getTrainingPlans(): Promise<TrainingPlan[]> {
  console.log("[FirestoreService] getTrainingPlans called");
  try {
    const trainingPlansRef = collection(db, "trainingPlans");
    const q = query(trainingPlansRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    const trainingPlans: TrainingPlan[] = [];
    querySnapshot.forEach((doc) => {
      trainingPlans.push({ id: doc.id, ...doc.data() } as TrainingPlan);
    });
    console.log(`[FirestoreService] getTrainingPlans: Fetched ${trainingPlans.length} training plans.`);
    return trainingPlans;
  } catch (error: any) {
    console.error("[FirestoreService] getTrainingPlans: Error fetching training plans:", error);
     if (error.code === 'failed-precondition' && error.message.includes('index')) {
      console.error(`[FirestoreService] INDEX_REQUIRED: Firestore query for getTrainingPlans (orderBy: createdAt desc) likely needs an index. Please check the Firebase console for a link to create it. The error message usually contains a direct link to create the required index. Error: ${error.message}`);
    }
    throw error;
  }
}

export async function addTrainingPlan(planData: TrainingPlanInput): Promise<string> {
  console.log("[FirestoreService] addTrainingPlan called with data:", planData);
  const planCollectionRef = collection(db, "trainingPlans");
  const newPlanData = {
    ...planData,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
    template: planData.template ?? false,
  };
  try {
    const docRef = await addDoc(planCollectionRef, newPlanData);
    console.log("[FirestoreService] addTrainingPlan: Training plan added with ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("[FirestoreService] addTrainingPlan: Error adding training plan:", error);
    throw error;
  }
}

export async function deleteTrainingPlan(planId: string): Promise<void> {
  console.log(`[FirestoreService] deleteTrainingPlan: Attempting to delete plan ${planId} and its blocks.`);
  const batch = writeBatch(db);

  const blocksRef = collection(db, "trainingBlocks");
  const blocksQuery = query(blocksRef, where("planId", "==", planId));
  
  try {
    const blocksSnapshot = await getDocs(blocksQuery);
    blocksSnapshot.forEach((blockDoc) => {
      batch.delete(doc(db, "trainingBlocks", blockDoc.id));
    });
    console.log(`[FirestoreService] deleteTrainingPlan: Found ${blocksSnapshot.size} blocks for plan ${planId} to delete.`);

    const planDocRef = doc(db, "trainingPlans", planId);
    batch.delete(planDocRef);

    await batch.commit();
    console.log(`[FirestoreService] deleteTrainingPlan: Successfully deleted plan ${planId} and its associated blocks.`);
  } catch (error: any) {
    console.error(`[FirestoreService] deleteTrainingPlan: Error deleting plan ${planId}:`, error);
    if (error.code === 'failed-precondition' && error.message.includes('index')) {
      console.error(`[FirestoreService] INDEX_REQUIRED: Firestore query for deleting plan (finding blocks by planId) likely needs an index on 'planId'. Please check the Firebase console for a link to create it. The error message usually contains a direct link to create the required index. Error: ${error.message}`);
    }
    throw error;
  }
}


// --- TrainingBlock Functions ---
export async function getTrainingBlocks(planId: string): Promise<TrainingBlock[]> {
  const trimmedPlanId = planId.trim();
  console.log(`[FirestoreService] getTrainingBlocks called for planId: "${trimmedPlanId}" (ordering by 'order' asc)`);
  if (!trimmedPlanId) {
    console.warn("[FirestoreService] getTrainingBlocks: planId is null or empty. Returning empty array.");
    return [];
  }
  try {
    const trainingBlocksRef = collection(db, "trainingBlocks");
    const q = query(trainingBlocksRef, where("planId", "==", trimmedPlanId), orderBy("order", "asc"));
    const querySnapshot = await getDocs(q);
    const trainingBlocks: TrainingBlock[] = [];
    
    querySnapshot.forEach((docSnap) => {
      trainingBlocks.push({ id: docSnap.id, ...docSnap.data() } as TrainingBlock);
    });
    
    console.log(`[FirestoreService] getTrainingBlocks for planId "${trimmedPlanId}" fetched ${trainingBlocks.length} blocks.`);
    return trainingBlocks;
  } catch (error: any) {
    console.error(`[FirestoreService] getTrainingBlocks: Error fetching training blocks for plan ${trimmedPlanId}:`, error);
    if (error.code === 'failed-precondition' && error.message.includes('index')) {
        console.error(`[FirestoreService] INDEX_REQUIRED: Firestore query for getTrainingBlocks (planId: ${trimmedPlanId}, orderBy: order asc) needs a composite index on 'planId' (ASC) and 'order' (ASC). Please create it in Firebase Firestore. The error message usually contains a direct link to create the required index. Error: ${error.message}`);
    }
    throw error;
  }
}

export async function getBlockById(blockId: string): Promise<TrainingBlock | null> {
  console.log(`[FirestoreService] getBlockById called for blockId: ${blockId}`);
  if (!blockId) {
    console.warn("[FirestoreService] getBlockById: blockId is required. Returning null.");
    return null;
  }
  try {
    const blockDocRef = doc(db, 'trainingBlocks', blockId);
    const blockDocSnap = await getDoc(blockDocRef);
    if (blockDocSnap.exists()) {
      const blockData = { id: blockDocSnap.id, ...blockDocSnap.data() } as TrainingBlock;
      console.log(`[FirestoreService] getBlockById: Found block for ID ${blockId}:`, blockData);
      return blockData;
    } else {
      console.log(`[FirestoreService] getBlockById: No block document found for ID: ${blockId}`);
      return null;
    }
  } catch (e) {
    console.error(`[FirestoreService] getBlockById: Error fetching block document ID ${blockId}:`, e);
    throw e;
  }
}

export async function addTrainingBlock(planId: string, blockData: Omit<TrainingBlockInput, 'exerciseReferences' | 'order'>): Promise<string> {
  console.log(`[FirestoreService] addTrainingBlock called for planId: "${planId}" with data:`, blockData);
  if (!planId || planId.trim() === "") {
    console.error("[FirestoreService] addTrainingBlock: planId is missing or empty.");
    throw new Error("planId is required to add a training block.");
  }
  const blockCollectionRef = collection(db, "trainingBlocks");

  // Query to get the last block's order for the given planId
  const q = query(
    collection(db, "trainingBlocks"),
    where("planId", "==", planId),
    orderBy("order", "desc"),
    limit(1)
  );
  let newOrder = 0;
  try {
    console.log(`[FirestoreService] addTrainingBlock: Querying for last block order for planId "${planId}"`);
    const existingBlocksSnapshot = await getDocs(q);
    if (!existingBlocksSnapshot.empty) {
      const lastBlock = existingBlocksSnapshot.docs[0].data() as TrainingBlock;
      newOrder = (typeof lastBlock.order === 'number' ? lastBlock.order : -1) + 1;
      console.log(`[FirestoreService] addTrainingBlock: Last block found with order ${lastBlock.order}. New order will be ${newOrder}.`);
    } else {
      console.log(`[FirestoreService] addTrainingBlock: No existing blocks found for planId "${planId}". New order will be 0.`);
    }

    const newBlockData: Omit<TrainingBlock, 'id' | 'createdAt' | 'updatedAt'> & { createdAt: Timestamp, updatedAt: Timestamp } = {
      planId: planId,
      title: blockData.title,
      notes: blockData.notes || undefined,
      duration: blockData.duration || undefined,
      goal: blockData.goal || undefined,
      order: newOrder,
      exerciseReferences: [], 
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
    };
    console.log(`[FirestoreService] addTrainingBlock: Attempting to add new block with data:`, newBlockData);
    const docRef = await addDoc(blockCollectionRef, newBlockData);
    console.log("[FirestoreService] addTrainingBlock: Training block added with ID:", docRef.id, "and order:", newOrder);
    return docRef.id;
  } catch (error: any) {
    console.error("[FirestoreService] addTrainingBlock: Error adding training block:", error);
    if (error.code === 'failed-precondition' && (error.message.includes('index') || error.message.includes('planId') || error.message.includes('order'))) {
        console.error(`[FirestoreService] INDEX_REQUIRED: The query to determine the next block order for planId "${planId}" (orderBy 'order' DESC) likely requires a composite index on (planId ASC, order DESC) in the 'trainingBlocks' collection. Please check the Firebase console. The error message usually contains a direct link to create it. Error: ${error.message}`);
    }
    throw error;
  }
}

export async function updateTrainingBlock(planId: string, blockId: string, blockData: Partial<Omit<TrainingBlockInput, 'planId' | 'order' | 'exerciseReferences'>>): Promise<void> {
  console.log(`[FirestoreService] updateTrainingBlock called for blockId: ${blockId}, planId: ${planId}, data:`, blockData);
  const blockDocRef = doc(db, "trainingBlocks", blockId);
  const dataToUpdate: Partial<TrainingBlockInput & { updatedAt: Timestamp }> = {
    ...blockData,
    updatedAt: serverTimestamp() as Timestamp,
  };

  try {
    await updateDoc(blockDocRef, dataToUpdate);
    console.log(`[FirestoreService] updateTrainingBlock: Training block ${blockId} updated successfully.`);
  } catch (error) {
    console.error(`[FirestoreService] updateTrainingBlock: Error updating training block ${blockId}:`, error);
    throw error;
  }
}

export async function deleteTrainingBlock(planId: string, blockId: string): Promise<void> {
  console.log(`[FirestoreService] deleteTrainingBlock: Attempting to delete block ${blockId} from plan ${planId}.`);
  const blockDocRef = doc(db, "trainingBlocks", blockId);
  try {
    await deleteDoc(blockDocRef);
    console.log(`[FirestoreService] deleteTrainingBlock: Successfully deleted block ${blockId}.`);
  } catch (error) {
    console.error(`[FirestoreService] deleteTrainingBlock: Error deleting block ${blockId}:`, error);
    throw error;
  }
}

export async function updateBlocksOrder(
  planId: string,
  orderedBlocks: Array<{ id: string; order: number }>
): Promise<void> {
  console.log("[FirestoreService] updateBlocksOrder called for plan:", planId, "with data:", JSON.parse(JSON.stringify(orderedBlocks)));
  const batch = writeBatch(db);

  for (const block of orderedBlocks) {
    const blockRef = doc(db, "trainingBlocks", block.id);
    batch.update(blockRef, { order: block.order, updatedAt: serverTimestamp() });
  }

  try {
    await batch.commit();
    console.log("[FirestoreService] updateBlocksOrder: Blocks order updated successfully for plan:", planId);
  } catch (error) {
    console.error("[FirestoreService] updateBlocksOrder: Error updating blocks order for plan:", planId, error);
    throw error;
  }
}

// --- MasterExercise Functions ---
export async function addMasterExercise(exerciseData: MasterExerciseInput): Promise<string> {
  console.log("[FirestoreService] addMasterExercise called with data:", exerciseData);
  const collectionRef = collection(db, "masterExercises");
  const newExercise = {
    ...exerciseData,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };
  try {
    const docRef = await addDoc(collectionRef, newExercise);
    console.log("[FirestoreService] addMasterExercise: MasterExercise added with ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("[FirestoreService] addMasterExercise: Error adding MasterExercise:", error);
    throw error;
  }
}

export async function getMasterExercises(): Promise<MasterExercise[]> {
  console.log("[FirestoreService] getMasterExercises called");
  try {
    const collectionRef = collection(db, "masterExercises");
    const q = query(collectionRef, orderBy("title", "asc")); 
    const querySnapshot = await getDocs(q);
    const exercises: MasterExercise[] = [];
    querySnapshot.forEach((doc) => {
      exercises.push({ id: doc.id, ...doc.data() } as MasterExercise);
    });
    console.log(`[FirestoreService] getMasterExercises: Fetched ${exercises.length} master exercises.`);
    return exercises;
  } catch (error: any) {
    console.error("[FirestoreService] getMasterExercises: Error fetching master exercises:", error);
    if (error.code === 'failed-precondition' && error.message.includes('index')) {
      console.error(`[FirestoreService] INDEX_REQUIRED: Firestore query for getMasterExercises (orderBy: title asc) likely needs an index. Please check the Firebase console for a link to create it. The error message usually contains a direct link to create the required index. Error: ${error.message}`);
    }
    throw error;
  }
}

export async function getMasterExerciseById(exerciseId: string): Promise<MasterExercise | null> {
  console.log(`[FirestoreService] getMasterExerciseById called for exerciseId: ${exerciseId}`);
  if (!exerciseId) {
    console.warn("[FirestoreService] getMasterExerciseById: exerciseId is null or empty. Returning null.");
    return null;
  }
  try {
    const docRef = doc(db, "masterExercises", exerciseId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const exerciseData = { id: docSnap.id, ...docSnap.data() } as MasterExercise;
      console.log(`[FirestoreService] getMasterExerciseById: Found exercise for ID ${exerciseId}:`, exerciseData);
      return exerciseData;
    }
    console.log(`[FirestoreService] getMasterExerciseById: No master exercise found for ID ${exerciseId}.`);
    return null;
  } catch (error) {
    console.error(`[FirestoreService] getMasterExerciseById: Error fetching MasterExercise by ID ${exerciseId}:`, error);
    throw error;
  }
}

export async function updateMasterExercise(exerciseId: string, data: Partial<MasterExerciseInput>): Promise<void> {
  console.log(`[FirestoreService] updateMasterExercise called for exerciseId: ${exerciseId} with data:`, data);
  const docRef = doc(db, "masterExercises", exerciseId);
  try {
    await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
    console.log(`[FirestoreService] updateMasterExercise: MasterExercise ${exerciseId} updated.`);
  } catch (error) {
    console.error(`[FirestoreService] updateMasterExercise: Error updating MasterExercise ${exerciseId}:`, error);
    throw error;
  }
}

export async function deleteMasterExercise(exerciseId: string): Promise<void> {
  console.log(`[FirestoreService] deleteMasterExercise: Attempting to delete master exercise ${exerciseId}.`);
  const docRef = doc(db, "masterExercises", exerciseId);
  try {
    await deleteDoc(docRef);
    console.log(`[FirestoreService] deleteMasterExercise: MasterExercise ${exerciseId} deleted.`);
  } catch (error) {
    console.error(`[FirestoreService] deleteMasterExercise: Error deleting MasterExercise ${exerciseId}:`, error);
    throw error;
  }
}

// --- Functions for Managing Exercises within Blocks (using references) ---

export async function getExercisesForBlock(blockId: string): Promise<BlockExerciseDisplay[]> {
  console.log(`[FirestoreService] getExercisesForBlock called for blockId: ${blockId}`);
  const block = await getBlockById(blockId);
  if (!block) {
    console.warn(`[FirestoreService] getExercisesForBlock: Block ${blockId} not found. Returning empty array.`);
    return [];
  }
  if (!block.exerciseReferences || block.exerciseReferences.length === 0) {
    console.log(`[FirestoreService] getExercisesForBlock: Block ${blockId} has no exercise references. Returning empty array.`);
    return [];
  }
  console.log(`[FirestoreService] getExercisesForBlock: Block ${blockId} has ${block.exerciseReferences.length} references.`);

  const exercises: BlockExerciseDisplay[] = [];
  try {
    for (const ref of block.exerciseReferences) {
      console.log(`[FirestoreService] getExercisesForBlock: Fetching master exercise for ref: ${ref.exerciseId} (order: ${ref.order})`);
      const masterEx = await getMasterExerciseById(ref.exerciseId);
      if (masterEx) {
        exercises.push({
          ...masterEx,
          orderInBlock: ref.order,
        });
      } else {
        console.warn(`[FirestoreService] getExercisesForBlock: MasterExercise with ID ${ref.exerciseId} referenced in block ${blockId} not found.`);
      }
    }
    const sortedExercises = exercises.sort((a, b) => (a.orderInBlock ?? Infinity) - (b.orderInBlock ?? Infinity));
    console.log(`[FirestoreService] getExercisesForBlock: Fetched and sorted ${sortedExercises.length} exercises for block ${blockId}.`);
    return sortedExercises;
  } catch (error) {
    console.error(`[FirestoreService] getExercisesForBlock: Error fetching exercises for block ${blockId}:`, error);
    throw error; // Re-throw to be caught by the caller
  }
}


export async function addExerciseToBlockReference(planId: string, blockId: string, masterExerciseId: string): Promise<void> {
  console.log(`[FirestoreService] addExerciseToBlockReference called for planId: ${planId}, blockId: ${blockId}, masterExerciseId: ${masterExerciseId}`);
  const blockDocRef = doc(db, "trainingBlocks", blockId);
  try {
    await runTransaction(db, async (transaction) => {
      const blockDoc = await transaction.get(blockDocRef);
      if (!blockDoc.exists()) {
        console.error(`[FirestoreService] addExerciseToBlockReference: Block ${blockId} does not exist!`);
        throw new Error(`Block ${blockId} does not exist!`);
      }
      const blockData = blockDoc.data() as TrainingBlock;
      const currentReferences = blockData.exerciseReferences || [];
      
      if (currentReferences.some(ref => ref.exerciseId === masterExerciseId)) {
        console.warn(`[FirestoreService] addExerciseToBlockReference: Exercise ${masterExerciseId} already exists in block ${blockId}.`);
        return; 
      }

      const newOrder = currentReferences.length > 0 
        ? Math.max(...currentReferences.map(ref => ref.order)) + 1 
        : 0;
      console.log(`[FirestoreService] addExerciseToBlockReference: New order for exercise ${masterExerciseId} in block ${blockId} will be ${newOrder}.`);
      
      const newReference: ExerciseReference = {
        exerciseId: masterExerciseId,
        order: newOrder,
      };
      
      transaction.update(blockDocRef, {
        exerciseReferences: arrayUnion(newReference),
        updatedAt: serverTimestamp(),
      });
    });
    console.log(`[FirestoreService] addExerciseToBlockReference: MasterExercise ${masterExerciseId} referenced in block ${blockId}.`);
  } catch (error) {
    console.error(`[FirestoreService] addExerciseToBlockReference: Error adding MasterExercise reference to block ${blockId}:`, error);
    throw error;
  }
}

export async function removeExerciseFromBlockReference(planId: string, blockId: string, masterExerciseIdToRemove: string): Promise<void> {
  console.log(`[FirestoreService] removeExerciseFromBlockReference called for planId: ${planId}, blockId: ${blockId}, masterExerciseIdToRemove: ${masterExerciseIdToRemove}`);
  const blockDocRef = doc(db, "trainingBlocks", blockId);
  try {
    await runTransaction(db, async (transaction) => {
      const blockDoc = await transaction.get(blockDocRef);
      if (!blockDoc.exists()) {
         console.error(`[FirestoreService] removeExerciseFromBlockReference: Block ${blockId} does not exist!`);
        throw new Error(`Block ${blockId} does not exist!`);
      }
      const blockData = blockDoc.data() as TrainingBlock;
      const currentReferences = blockData.exerciseReferences || [];
      
      const referenceToRemove = currentReferences.find(ref => ref.exerciseId === masterExerciseIdToRemove);
      if (!referenceToRemove) {
        console.warn(`[FirestoreService] removeExerciseFromBlockReference: Exercise ${masterExerciseIdToRemove} not found in block ${blockId} references.`);
        return; 
      }
      
      const updatedReferences = currentReferences
        .filter(ref => ref.exerciseId !== masterExerciseIdToRemove)
        .sort((a, b) => a.order - b.order) 
        .map((ref, index) => ({ ...ref, order: index })); 
      console.log(`[FirestoreService] removeExerciseFromBlockReference: Updated references for block ${blockId}:`, updatedReferences);

      transaction.update(blockDocRef, {
        exerciseReferences: updatedReferences, 
        updatedAt: serverTimestamp(),
      });
    });
    console.log(`[FirestoreService] removeExerciseFromBlockReference: MasterExercise ${masterExerciseIdToRemove} reference removed from block ${blockId} and order updated.`);
  } catch (error) {
    console.error(`[FirestoreService] removeExerciseFromBlockReference: Error removing MasterExercise reference from block ${blockId}:`, error);
    throw error;
  }
}


export async function updateExercisesOrderInBlock(
  blockId: string,
  orderedExerciseReferences: ExerciseReference[] 
): Promise<void> {
  console.log("[FirestoreService] updateExercisesOrderInBlock called for block:", blockId, "with data:", JSON.parse(JSON.stringify(orderedExerciseReferences)));
  const blockRef = doc(db, "trainingBlocks", blockId);
  try {
    const sortedReferences = orderedExerciseReferences.sort((a,b) => a.order - b.order);
    await updateDoc(blockRef, { 
        exerciseReferences: sortedReferences, 
        updatedAt: serverTimestamp() 
    });
    console.log("[FirestoreService] updateExercisesOrderInBlock: Exercises order in block updated successfully.");
  } catch (error) {
    console.error("[FirestoreService] updateExercisesOrderInBlock: Error updating exercises order in block:", error);
    throw error;
  }
}


// --- DEPRECATED Exercise Functions (Old model: exercises as subcollection) ---
export async function getExercises(planId: string, blockId: string): Promise<any[]> { 
  console.warn("[FirestoreService] DEPRECATED getExercises called. Refactor to use MasterExercises and block references. Returning empty array.");
  return []; 
}

export async function getExercise(exerciseId: string): Promise<any | null> {
  console.warn("[FirestoreService] DEPRECATED getExercise called. Attempting to use getMasterExerciseById as fallback.");
  return getMasterExerciseById(exerciseId);
}

export async function addExerciseToBlock(planId: string, blockId: string, exerciseData: any): Promise<string> {
  console.warn("[FirestoreService] DEPRECATED addExerciseToBlock called. This will create a MasterExercise and reference it.");
  if (exerciseData.title) {
    const masterExId = await addMasterExercise({
        title: exerciseData.title,
        description: exerciseData.description,
        objective: exerciseData.objective,
        suggestedReps: exerciseData.suggestedReps,
    });
    await addExerciseToBlockReference(planId, blockId, masterExId);
    console.log(`[FirestoreService] DEPRECATED addExerciseToBlock: Created MasterExercise ${masterExId} and referenced in block ${blockId}.`);
    return masterExId; 
  }
  console.error("[FirestoreService] DEPRECATED addExerciseToBlock: 'title' is required to create a new MasterExercise.");
  throw new Error("Deprecated addExerciseToBlock requires at least a title for new MasterExercise.");
}

export async function updateExercise(planId: string, blockId: string, exerciseId: string, exerciseData: Partial<any>): Promise<void> {
   console.warn("[FirestoreService] DEPRECATED updateExercise called. This will attempt to update a MasterExercise.");
   await updateMasterExercise(exerciseId, exerciseData);
}

export async function deleteExercise(exerciseId: string): Promise<void> {
  console.warn("[FirestoreService] DEPRECATED deleteExercise called. This will attempt to delete a MasterExercise. If used in a block, consider removeExerciseFromBlockReference instead.");
  await deleteMasterExercise(exerciseId);
}

export async function updateExercisesOrder(
  planId: string,
  blockId: string,
  orderedExercises: Array<{ id: string; order: number }>
): Promise<void> {
  console.warn("[FirestoreService] DEPRECATED updateExercisesOrder called. Refactoring to use updateExercisesOrderInBlock.");
  const newReferences: ExerciseReference[] = orderedExercises.map(ex => ({ exerciseId: ex.id, order: ex.order }));
  await updateExercisesOrderInBlock(blockId, newReferences);
}

// --- Debug Functions ---
export async function debugGetBlocksForPlan(planId: string): Promise<void> {
  console.log(`[DEBUG FirestoreService] debugGetBlocksForPlan called for plan: ${planId}`);
  try {
    const trainingBlocksRef = collection(db, "trainingBlocks");
    const q = query(trainingBlocksRef, where("planId", "==", planId.trim()), orderBy("order", "asc"));
    const querySnapshot = await getDocs(q);
    const blocks: any[] = [];
    
    console.log(`[DEBUG FirestoreService] Query snapshot for planId "${planId.trim()}" (orderBy 'order') has ${querySnapshot.size} documents.`);
    querySnapshot.forEach((docSnap) => {
      const blockData = docSnap.data();
      console.log(`[DEBUG FirestoreService] Raw block data (debug): ID=${docSnap.id}, Title=${blockData.title}, planId=${blockData.planId}, order=${blockData.order}, exerciseReferences=${JSON.stringify(blockData.exerciseReferences)}, createdAt exists: ${!!blockData.createdAt}`);
      blocks.push({ id: docSnap.id, ...blockData });
    });
    console.log(`[DEBUG FirestoreService] Found ${blocks.length} blocks for plan ${planId.trim()} (orderBy 'order'):`, JSON.parse(JSON.stringify(blocks)));

  } catch (error: any) {
    console.error(`[DEBUG FirestoreService] Error in debugGetBlocksForPlan for plan ${planId}:`, error);
    if (error.code === 'failed-precondition') {
        console.error(`[DEBUG FirestoreService] INDEX REQUIRED for debugGetBlocksForPlan (planId: ${planId}, orderBy: order). Please create an index on 'planId' (asc) and 'order' (asc) in the 'trainingBlocks' collection.`);
    }
  }
}
