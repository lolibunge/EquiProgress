
import { collection, getDocs, query, where, addDoc, serverTimestamp, Timestamp, doc, getDoc, orderBy, limit, writeBatch, updateDoc, deleteDoc, runTransaction, arrayUnion, arrayRemove, FieldValue } from "firebase/firestore";
import { db } from "@/firebase";
import type { TrainingPlan, TrainingBlock, TrainingPlanInput, TrainingBlockInput, MasterExercise, MasterExerciseInput, ExerciseReference, BlockExerciseDisplay } from "@/types/firestore";

// --- TrainingPlan Functions ---
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

export async function deleteTrainingPlan(planId: string): Promise<void> {
  console.log(`[Firestore Service] Attempting to delete plan ${planId} and its blocks.`);
  const batch = writeBatch(db);

  const blocksRef = collection(db, "trainingBlocks");
  const blocksQuery = query(blocksRef, where("planId", "==", planId));
  const blocksSnapshot = await getDocs(blocksQuery);

  blocksSnapshot.forEach((blockDoc) => {
    batch.delete(doc(db, "trainingBlocks", blockDoc.id));
  });
  console.log(`[Firestore Service] Found ${blocksSnapshot.size} blocks for plan ${planId} to delete.`);

  const planDocRef = doc(db, "trainingPlans", planId);
  batch.delete(planDocRef);

  try {
    await batch.commit();
    console.log(`[Firestore Service] Successfully deleted plan ${planId} and its associated blocks.`);
  } catch (error) {
    console.error(`[Firestore Service] Error deleting plan ${planId}:`, error);
    throw error;
  }
}


// --- TrainingBlock Functions ---
export async function getTrainingBlocks(planId: string): Promise<TrainingBlock[]> {
  const trimmedPlanId = planId.trim();
  console.log(`[Firestore Service] Attempting to fetch trainingBlocks with planId: "${trimmedPlanId}" (ordering by 'order' asc)`);
  if (!trimmedPlanId) {
    console.warn("[Firestore Service] getTrainingBlocks: planId is null or empty. Returning empty array.");
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
    
    console.log(`[Firestore Service] getTrainingBlocks for planId "${trimmedPlanId}" is returning ${trainingBlocks.length} blocks (orderBy 'order' asc).`);
    return trainingBlocks;
  } catch (error: any) {
    console.error(`[Firestore Service] Error fetching training blocks for plan ${trimmedPlanId}:`, error);
    if (error.code === 'failed-precondition') {
        console.error(`[Firestore Service] INDEX REQUIRED for trainingBlocks: The query (planId: ${trimmedPlanId}, orderBy: order) requires a composite index on 'planId' (asc) and 'order' (asc). Please create it in Firebase Firestore.`);
    }
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

export async function addTrainingBlock(planId: string, blockData: Omit<TrainingBlockInput, 'exerciseReferences' | 'order'>): Promise<string> {
  const blockCollectionRef = collection(db, "trainingBlocks");

  const q = query(
    collection(db, "trainingBlocks"),
    where("planId", "==", planId),
    orderBy("order", "desc"), 
    limit(1)
  );
  let newOrder = 0;
  try {
    const existingBlocksSnapshot = await getDocs(q);
    if (!existingBlocksSnapshot.empty) {
      const lastBlock = existingBlocksSnapshot.docs[0].data() as TrainingBlock;
      newOrder = (typeof lastBlock.order === 'number' ? lastBlock.order : -1) + 1;
    }
  
    const newBlockData: Omit<TrainingBlock, 'id' | 'createdAt' | 'updatedAt'> & { createdAt: Timestamp, updatedAt: Timestamp } = {
      planId: planId,
      title: blockData.title,
      notes: blockData.notes || undefined,
      duration: blockData.duration || undefined,
      goal: blockData.goal || undefined,
      order: newOrder,
      exerciseReferences: [], // Initialize with empty array
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
    };

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

export async function updateTrainingBlock(planId: string, blockId: string, blockData: Partial<Omit<TrainingBlockInput, 'planId' | 'order' | 'exerciseReferences'>>): Promise<void> {
  const blockDocRef = doc(db, "trainingBlocks", blockId);
  const dataToUpdate: Partial<TrainingBlockInput & { updatedAt: Timestamp }> = {
    ...blockData,
    updatedAt: serverTimestamp() as Timestamp,
  };

  try {
    await updateDoc(blockDocRef, dataToUpdate);
    console.log(`[Firestore Service] Training block ${blockId} updated successfully.`);
  } catch (error) {
    console.error(`[Firestore Service] Error updating training block ${blockId}:`, error);
    throw error;
  }
}

export async function deleteTrainingBlock(planId: string, blockId: string): Promise<void> {
  console.log(`[Firestore Service] Attempting to delete block ${blockId} from plan ${planId}. Exercise references will remain in MasterExercises.`);
  const blockDocRef = doc(db, "trainingBlocks", blockId);
  try {
    await deleteDoc(blockDocRef);
    console.log(`[Firestore Service] Successfully deleted block ${blockId}.`);
  } catch (error) {
    console.error(`[Firestore Service] Error deleting block ${blockId}:`, error);
    throw error;
  }
}

export async function updateBlocksOrder(
  planId: string,
  orderedBlocks: Array<{ id: string; order: number }>
): Promise<void> {
  console.log("[Firestore Service] Updating blocks order for plan:", planId, JSON.parse(JSON.stringify(orderedBlocks)));
  const batch = writeBatch(db);

  for (const block of orderedBlocks) {
    const blockRef = doc(db, "trainingBlocks", block.id);
    batch.update(blockRef, { order: block.order, updatedAt: serverTimestamp() });
  }

  try {
    await batch.commit();
    console.log("[Firestore Service] Blocks order updated successfully for plan:", planId);
  } catch (error) {
    console.error("[Firestore Service] Error updating blocks order for plan:", planId, error);
    throw error;
  }
}

// --- MasterExercise Functions ---
export async function addMasterExercise(exerciseData: MasterExerciseInput): Promise<string> {
  const collectionRef = collection(db, "masterExercises");
  const newExercise = {
    ...exerciseData,
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };
  try {
    const docRef = await addDoc(collectionRef, newExercise);
    console.log("[Firestore Service] MasterExercise added with ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("[Firestore Service] Error adding MasterExercise:", error);
    throw error;
  }
}

export async function getMasterExercises(): Promise<MasterExercise[]> {
  console.log("[Firestore Service] Fetching all master exercises");
  try {
    const collectionRef = collection(db, "masterExercises");
    const q = query(collectionRef, orderBy("title", "asc")); // Or orderBy createdAt
    const querySnapshot = await getDocs(q);
    const exercises: MasterExercise[] = [];
    querySnapshot.forEach((doc) => {
      exercises.push({ id: doc.id, ...doc.data() } as MasterExercise);
    });
    console.log(`[Firestore Service] Fetched ${exercises.length} master exercises.`);
    return exercises;
  } catch (error) {
    console.error("[Firestore Service] Error fetching master exercises:", error);
    throw error;
  }
}

export async function getMasterExerciseById(exerciseId: string): Promise<MasterExercise | null> {
  if (!exerciseId) return null;
  try {
    const docRef = doc(db, "masterExercises", exerciseId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as MasterExercise;
    }
    return null;
  } catch (error) {
    console.error(`[Firestore Service] Error fetching MasterExercise by ID ${exerciseId}:`, error);
    throw error;
  }
}

export async function updateMasterExercise(exerciseId: string, data: Partial<MasterExerciseInput>): Promise<void> {
  const docRef = doc(db, "masterExercises", exerciseId);
  try {
    await updateDoc(docRef, { ...data, updatedAt: serverTimestamp() });
    console.log(`[Firestore Service] MasterExercise ${exerciseId} updated.`);
  } catch (error) {
    console.error(`[Firestore Service] Error updating MasterExercise ${exerciseId}:`, error);
    throw error;
  }
}

export async function deleteMasterExercise(exerciseId: string): Promise<void> {
  // Consider implications: what if this exercise is referenced in trainingBlocks?
  // For now, simple delete. Blocks will have dangling references.
  // A more robust solution might involve checking references or using cloud functions.
  const docRef = doc(db, "masterExercises", exerciseId);
  try {
    await deleteDoc(docRef);
    console.log(`[Firestore Service] MasterExercise ${exerciseId} deleted.`);
    // TODO: Potentially find and remove this exerciseId from all trainingBlocks.exerciseReferences
    // This would require iterating through all trainingBlocks, which can be expensive.
    // Or, handle dangling references in the UI.
  } catch (error) {
    console.error(`[Firestore Service] Error deleting MasterExercise ${exerciseId}:`, error);
    throw error;
  }
}

// --- Functions for Managing Exercises within Blocks (using references) ---

export async function getExercisesForBlock(blockId: string): Promise<BlockExerciseDisplay[]> {
  console.log(`[Firestore Service] Getting exercises for blockId: ${blockId}`);
  const block = await getBlockById(blockId);
  if (!block || !block.exerciseReferences || block.exerciseReferences.length === 0) {
    return [];
  }

  const exercises: BlockExerciseDisplay[] = [];
  for (const ref of block.exerciseReferences) {
    const masterEx = await getMasterExerciseById(ref.exerciseId);
    if (masterEx) {
      exercises.push({
        ...masterEx,
        orderInBlock: ref.order,
      });
    } else {
      console.warn(`[Firestore Service] MasterExercise with ID ${ref.exerciseId} referenced in block ${blockId} not found.`);
      // Optionally, push a placeholder or skip
    }
  }
  // Ensure they are sorted by the order in the reference array, though getMasterExerciseById is async and order of results from Promise.all might not be guaranteed
  // So explicitly sort again by ref.order
  return exercises.sort((a, b) => a.orderInBlock - b.orderInBlock);
}


export async function addExerciseToBlockReference(planId: string, blockId: string, masterExerciseId: string): Promise<void> {
  const blockDocRef = doc(db, "trainingBlocks", blockId);
  try {
    await runTransaction(db, async (transaction) => {
      const blockDoc = await transaction.get(blockDocRef);
      if (!blockDoc.exists()) {
        throw new Error(`Block ${blockId} does not exist!`);
      }
      const blockData = blockDoc.data() as TrainingBlock;
      const currentReferences = blockData.exerciseReferences || [];
      
      // Check if exercise already exists in block to prevent duplicates
      if (currentReferences.some(ref => ref.exerciseId === masterExerciseId)) {
        console.warn(`[Firestore Service] Exercise ${masterExerciseId} already exists in block ${blockId}.`);
        return; // Or throw error
      }

      const newOrder = currentReferences.length > 0 
        ? Math.max(...currentReferences.map(ref => ref.order)) + 1 
        : 0;
      
      const newReference: ExerciseReference = {
        exerciseId: masterExerciseId,
        order: newOrder,
      };
      
      transaction.update(blockDocRef, {
        exerciseReferences: arrayUnion(newReference),
        updatedAt: serverTimestamp(),
      });
    });
    console.log(`[Firestore Service] MasterExercise ${masterExerciseId} referenced in block ${blockId}.`);
  } catch (error) {
    console.error(`[Firestore Service] Error adding MasterExercise reference to block ${blockId}:`, error);
    throw error;
  }
}

export async function removeExerciseFromBlockReference(planId: string, blockId: string, masterExerciseIdToRemove: string): Promise<void> {
  const blockDocRef = doc(db, "trainingBlocks", blockId);
  try {
    await runTransaction(db, async (transaction) => {
      const blockDoc = await transaction.get(blockDocRef);
      if (!blockDoc.exists()) {
        throw new Error(`Block ${blockId} does not exist!`);
      }
      const blockData = blockDoc.data() as TrainingBlock;
      const currentReferences = blockData.exerciseReferences || [];
      
      const referenceToRemove = currentReferences.find(ref => ref.exerciseId === masterExerciseIdToRemove);
      if (!referenceToRemove) {
        console.warn(`[Firestore Service] Exercise ${masterExerciseIdToRemove} not found in block ${blockId} references.`);
        return; // Or throw error
      }
      
      // Filter out the reference and re-order the remaining ones
      const updatedReferences = currentReferences
        .filter(ref => ref.exerciseId !== masterExerciseIdToRemove)
        .sort((a, b) => a.order - b.order) // Sort by original order first
        .map((ref, index) => ({ ...ref, order: index })); // Re-assign order

      transaction.update(blockDocRef, {
        exerciseReferences: updatedReferences, // Set the new array
        updatedAt: serverTimestamp(),
      });
    });
    console.log(`[Firestore Service] MasterExercise ${masterExerciseIdToRemove} reference removed from block ${blockId} and order updated.`);
  } catch (error) {
    console.error(`[Firestore Service] Error removing MasterExercise reference from block ${blockId}:`, error);
    throw error;
  }
}


export async function updateExercisesOrderInBlock(
  blockId: string,
  orderedExerciseReferences: ExerciseReference[] // This should be the full, re-ordered list of references for the block
): Promise<void> {
  console.log("[Firestore Service] Updating exercises order for block:", blockId);
  const blockRef = doc(db, "trainingBlocks", blockId);
  try {
    // Ensure the incoming references are correctly ordered by their 'order' field before setting
    const sortedReferences = orderedExerciseReferences.sort((a,b) => a.order - b.order);
    await updateDoc(blockRef, { 
        exerciseReferences: sortedReferences, 
        updatedAt: serverTimestamp() 
    });
    console.log("[Firestore Service] Exercises order in block updated successfully.");
  } catch (error) {
    console.error("[Firestore Service] Error updating exercises order in block:", error);
    throw error;
  }
}


// --- DEPRECATED Exercise Functions (Old model: exercises as subcollection) ---
// These functions will be removed or heavily modified.
// For now, they are kept to avoid breaking existing calls until the UI is updated.

export async function getExercises(planId: string, blockId: string): Promise<any[]> { // Using any[] for now as Exercise type will change
  console.warn("[Firestore Service] DEPRECATED getExercises called. Refactor to use MasterExercises and block references.");
  return []; // Return empty or adapt if old data model still needs support
}

export async function getExercise(exerciseId: string): Promise<any | null> {
  console.warn("[Firestore Service] DEPRECATED getExercise called. Refactor to use getMasterExerciseById.");
  // Try fetching from masterExercises as a fallback if ID matches
  return getMasterExerciseById(exerciseId);
}

export async function addExerciseToBlock(planId: string, blockId: string, exerciseData: any): Promise<string> {
  console.warn("[Firestore Service] DEPRECATED addExerciseToBlock called. Refactor to use addMasterExercise and addExerciseToBlockReference.");
  // This function is problematic in the new model. What would it do? Create a master exercise and then reference it?
  // For now, let's assume it tries to create a master exercise if the data looks like MasterExerciseInput
  if (exerciseData.title) {
    const masterExId = await addMasterExercise({
        title: exerciseData.title,
        description: exerciseData.description,
        objective: exerciseData.objective,
        suggestedReps: exerciseData.suggestedReps,
    });
    await addExerciseToBlockReference(planId, blockId, masterExId);
    return masterExId; // Returning the ID of the master exercise created
  }
  throw new Error("Deprecated addExerciseToBlock requires at least a title for new MasterExercise.");
}

export async function updateExercise(planId: string, blockId: string, exerciseId: string, exerciseData: Partial<any>): Promise<void> {
   console.warn("[Firestore Service] DEPRECATED updateExercise called. Refactor to use updateMasterExercise or update exercise reference details if any.");
   // This should probably map to updateMasterExercise
   await updateMasterExercise(exerciseId, exerciseData);
}

export async function deleteExercise(exerciseId: string): Promise<void> {
  console.warn("[Firestore Service] DEPRECATED deleteExercise called. Refactor to use removeExerciseFromBlockReference or deleteMasterExercise.");
  // This should map to removeExerciseFromBlockReference if context (planId, blockId) is known,
  // or deleteMasterExercise if it's deleting from the library.
  // For now, assume it's deleting a MasterExercise.
  await deleteMasterExercise(exerciseId);
}

export async function updateExercisesOrder(
  planId: string,
  blockId: string,
  orderedExercises: Array<{ id: string; order: number }>
): Promise<void> {
  console.warn("[Firestore Service] DEPRECATED updateExercisesOrder called. Refactor to use updateExercisesOrderInBlock.");
  const newReferences: ExerciseReference[] = orderedExercises.map(ex => ({ exerciseId: ex.id, order: ex.order }));
  await updateExercisesOrderInBlock(blockId, newReferences);
}

// --- Debug Functions ---
export async function debugGetBlocksForPlan(planId: string): Promise<void> {
  console.log(`[DEBUG Firestore Service] debugGetBlocksForPlan called for plan: ${planId}`);
  try {
    const trainingBlocksRef = collection(db, "trainingBlocks");
    const q = query(trainingBlocksRef, where("planId", "==", planId.trim()), orderBy("order", "asc"));
    const querySnapshot = await getDocs(q);
    const blocks: any[] = [];
    
    console.log(`[DEBUG Firestore Service] Query snapshot for planId "${planId.trim()}" (orderBy 'order') has ${querySnapshot.size} documents.`);
    querySnapshot.forEach((docSnap) => {
      const blockData = docSnap.data();
      console.log(`[DEBUG Firestore Service] Raw block data (debug): ID=${docSnap.id}, Title=${blockData.title}, planId=${blockData.planId}, order=${blockData.order}, exerciseReferences=${JSON.stringify(blockData.exerciseReferences)}, createdAt exists: ${!!blockData.createdAt}`);
      blocks.push({ id: docSnap.id, ...blockData });
    });
    console.log(`[DEBUG Firestore Service] Found ${blocks.length} blocks for plan ${planId.trim()} (orderBy 'order'):`, JSON.parse(JSON.stringify(blocks)));

  } catch (error: any) {
    console.error(`[DEBUG Firestore Service] Error in debugGetBlocksForPlan for plan ${planId}:`, error);
    if (error.code === 'failed-precondition') {
        console.error(`[DEBUG Firestore Service] INDEX REQUIRED for debugGetBlocksForPlan (planId: ${planId}, orderBy: order). Please create an index on 'planId' (asc) and 'order' (asc) in the 'trainingBlocks' collection.`);
    }
  }
}
