
import { collection, getDocs, query, where, addDoc, serverTimestamp, Timestamp, doc, getDoc, orderBy, limit, writeBatch } from "firebase/firestore";
import { db } from "@/firebase";
import type { TrainingPlan, TrainingBlock, Exercise, TrainingPlanInput, TrainingBlockInput, ExerciseInput } from "@/types/firestore";

export async function getTrainingPlans(): Promise<TrainingPlan[]> {
  console.log("Fetching training plans");
  try {
    const trainingPlansRef = collection(db, "trainingPlans");
    const q = query(trainingPlansRef);
    const querySnapshot = await getDocs(q);
    const trainingPlans: TrainingPlan[] = [];
    querySnapshot.forEach((doc) => {
      trainingPlans.push({ id: doc.id, ...doc.data() } as TrainingPlan);
    });
    return trainingPlans;
  } catch (error) {
    console.error("Error fetching training plans:", error);
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
    console.log("Training plan added with ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error adding training plan:", error);
    throw error;
  }
}

export async function getTrainingBlocks(planId: string): Promise<TrainingBlock[]> {
  console.log(`[Firestore Service] getTrainingBlocks called for planId: ${planId}`);
  if (!planId) {
    console.warn("[Firestore Service] getTrainingBlocks: planId is null or empty. Returning empty array.");
    return [];
  }
  try {
    const trainingBlocksRef = collection(db, "trainingBlocks");
    // Query without explicit ordering first to see if blocks are found based on planId
    const q = query(trainingBlocksRef, where("planId", "==", planId));
    console.log(`[Firestore Service] Querying trainingBlocks with planId: "${planId}" (NO explicit order)`);

    const querySnapshot = await getDocs(q);
    const trainingBlocks: TrainingBlock[] = [];
    console.log(`[Firestore Service] Query snapshot for planId "${planId}" has ${querySnapshot.size} documents.`);

    querySnapshot.forEach((docSnap) => {
      const blockData = docSnap.data();
      console.log(`[Firestore Service]   Block found: ID=${docSnap.id}, Title="${blockData.title}", planId="${blockData.planId}", createdAt exists: ${blockData.hasOwnProperty('createdAt')}`);
      // We still want to ensure client-side that the planId matches, though 'where' clause should handle this.
      if (blockData.planId === planId) {
        trainingBlocks.push({ id: docSnap.id, ...blockData } as TrainingBlock);
      } else {
        console.warn(`[Firestore Service]   Block ID=${docSnap.id} with planId="${blockData.planId}" was fetched but does not match target planId="${planId}". This should not happen with a 'where' clause.`);
      }
    });

    // If blocks were found, sort them by createdAt if the field exists, otherwise by title as a fallback.
    if (trainingBlocks.length > 0) {
        trainingBlocks.sort((a, b) => {
            if (a.createdAt && b.createdAt) {
                return a.createdAt.toMillis() - b.createdAt.toMillis();
            } else if (a.createdAt) {
                return -1; // a comes first if b doesn't have createdAt
            } else if (b.createdAt) {
                return 1; // b comes first if a doesn't have createdAt
            }
            return a.title.localeCompare(b.title); // Fallback sort by title
        });
        console.log(`[Firestore Service] Sorted ${trainingBlocks.length} blocks. First block after sort: ${trainingBlocks[0]?.title}`);
    }


    if (trainingBlocks.length === 0 && querySnapshot.size > 0) {
        console.error(`[Firestore Service] No blocks were added to the 'trainingBlocks' array for planId "${planId}", but the query snapshot was NOT empty. This indicates a potential issue with the data structure or the 'as TrainingBlock' type assertion, or the secondary client-side filter.`);
    } else if (trainingBlocks.length === 0 && querySnapshot.size === 0) {
        console.log(`[Firestore Service] NO blocks matched the query for planId: "${planId}". Double-check the 'planId' field value and existence in your 'trainingBlocks' collection in Firestore. Ensure it is exactly "${planId}".`);
    }
    console.log(`[Firestore Service] getTrainingBlocks for planId "${planId}" is returning ${trainingBlocks.length} blocks.`);
    return trainingBlocks;
  } catch (error) {
    console.error(`[Firestore Service] Error fetching training blocks for plan ${planId}:`, error);
    throw error;
  }
}

export async function getBlockById(blockId: string): Promise<TrainingBlock | null> {
  if (!blockId) {
    console.warn("blockId is required to fetch a block.");
    return null;
  }
  try {
    const blockDocRef = doc(db, 'trainingBlocks', blockId);
    const blockDocSnap = await getDoc(blockDocRef);
    if (blockDocSnap.exists()) {
      return { id: blockDocSnap.id, ...blockDocSnap.data() } as TrainingBlock;
    } else {
      console.log("No such block document!");
      return null;
    }
  } catch (e) {
    console.error('Error fetching block document: ', e);
    throw e;
  }
}

export async function addTrainingBlock(planId: string, blockData: TrainingBlockInput): Promise<string> {
  const blockCollectionRef = collection(db, "trainingBlocks");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const newBlockData: { [key: string]: any } = {
    title: blockData.title,
    planId: planId,
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

  try {
    const docRef = await addDoc(blockCollectionRef, newBlockData);
    console.log("Training block added with ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error adding training block:", error);
    throw error;
  }
}

export async function getExercises(planId: string, blockId: string): Promise<Exercise[]> {
  console.log(`[Firestore Service] Attempting to fetch exercises with planId: "${planId}" AND blockId: "${blockId}" (ordering by createdAt)`);
  try {
    const exercisesRef = collection(db, "exercises");
    // Temporarily ordering by createdAt to ensure visibility of older exercises
    // For custom ordering, 'order' field and its corresponding index will be needed.
    const q = query(
      exercisesRef,
      where("planId", "==", planId),
      where("blockId", "==", blockId),
      orderBy("createdAt", "asc") // Temporarily changed from "order"
    );
    const querySnapshot = await getDocs(q);
    const exercises: Exercise[] = [];
    querySnapshot.forEach((docSnap) => {
      const exerciseData = docSnap.data();
      const exercise = { id: docSnap.id, ...exerciseData } as Exercise;
      // Log the presence of 'order' field for diagnostics
      console.log(`[Firestore Service] Fetched exercise: ${exercise.title} (ID: ${exercise.id}), planId: ${exercise.planId}, blockId: ${exercise.blockId}, createdAt: ${exercise.createdAt}, order field present: ${exerciseData.hasOwnProperty('order') ? exerciseData.order : 'N/A'}`);
      exercises.push(exercise);
    });
    if (exercises.length === 0) {
        console.log(`[Firestore Service] No exercises found matching planId: "${planId}" AND blockId: "${blockId}" when ordering by "createdAt". Double-check these IDs in your 'exercises' collection in Firestore.`);
    }
    console.log(`[Firestore Service] Found ${exercises.length} exercises for plan ${planId}, block ${blockId} (ordered by 'createdAt')`);
    return exercises;
  } catch (error: any) {
    console.error(`[Firestore Service] Error fetching exercises for plan ${planId}, block ${blockId}:`, error);
    // Check if error is an instance of FirebaseError and if it's an index error
    if (error.code === 'failed-precondition') {
        console.error(`[Firestore Service] INDEX REQUIRED: The query for exercises (planId: ${planId}, blockId: ${blockId}, orderBy: createdAt) might require a composite index if 'createdAt' wasn't the first orderBy. Please check the Firebase console for a link to create it if this error persists with a different ordering.`);
    }
    throw error;
  }
}

export async function getExercise(exerciseId: string): Promise<Exercise | null> {
  if (!exerciseId) {
    console.warn("exerciseId is required to fetch an exercise.");
    return null;
  }
  try {
    const exerciseDocRef = doc(db, 'exercises', exerciseId);
    const exerciseDocSnap = await getDoc(exerciseDocRef);
    if (exerciseDocSnap.exists()) {
      return { id: exerciseDocSnap.id, ...exerciseDocSnap.data() } as Exercise;
    } else {
      console.log("No such exercise document!");
      return null;
    }
  } catch (e) {
    console.error('Error fetching exercise document: ', e);
    throw e;
  }
}


export async function addExerciseToBlock(planId: string, blockId: string, exerciseData: ExerciseInput): Promise<string> {
  console.log(`[Firestore Service] Attempting to add exercise to planId: "${planId}", blockId: "${blockId}"`);
  const exerciseCollectionRef = collection(db, "exercises");

  // Get the current highest order for this block
  const existingExercisesQuery = query(
    collection(db, "exercises"),
    where("planId", "==", planId),
    where("blockId", "==", blockId),
    orderBy("order", "desc"),
    limit(1)
  );
  let newOrder = 0;
  try {
    const existingExercisesSnapshot = await getDocs(existingExercisesQuery);
    if (!existingExercisesSnapshot.empty) {
      const lastExercise = existingExercisesSnapshot.docs[0].data() as Exercise;
      // Ensure lastExercise.order is a number, default to -1 if not or undefined
      newOrder = (typeof lastExercise.order === 'number' ? lastExercise.order : -1) + 1;
      console.log(`[Firestore Service] Found existing exercises, calculating new order based on last order (${lastExercise.order}): ${newOrder}`);
    } else {
      console.log(`[Firestore Service] No existing exercises found for planId: "${planId}", blockId: "${blockId}". Starting order from 0.`);
    }


  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dataToSave: { [key: string]: any } = {
    planId: planId,
    blockId: blockId,
    title: exerciseData.title,
    order: newOrder, // Save the calculated order
    createdAt: serverTimestamp() as Timestamp,
    updatedAt: serverTimestamp() as Timestamp,
  };

  if (exerciseData.description !== undefined && exerciseData.description.trim() !== "") {
    dataToSave.description = exerciseData.description;
  } else {
    dataToSave.description = null;
  }

  if (exerciseData.objective !== undefined && exerciseData.objective.trim() !== "") {
    dataToSave.objective = exerciseData.objective;
  } else {
    dataToSave.objective = null;
  }

  if (exerciseData.suggestedReps !== undefined && exerciseData.suggestedReps !== null && String(exerciseData.suggestedReps).trim() !== "") {
    dataToSave.suggestedReps = String(exerciseData.suggestedReps);
  } else {
    dataToSave.suggestedReps = null;
  }
  console.log("[Firestore Service] Data to save for new exercise:", dataToSave);


    const docRef = await addDoc(exerciseCollectionRef, dataToSave);
    console.log("Exercise added with ID:", docRef.id, "and order:", newOrder);
    return docRef.id;
  } catch (error) {
    console.error("[Firestore Service] Error adding exercise:", error);
    // Check if the error is due to a missing index for the 'order' field query
    if ((error as any).code === 'failed-precondition' && (error as any).message.includes('order')) {
        console.error("[Firestore Service] INDEX REQUIRED for querying 'order': The operation failed because the query for existing exercises (to determine the new order) requires an index on 'planId', 'blockId', and 'order'. Please create this index in Firebase Firestore.");
    }
    throw error;
  }
}

export async function updateExercisesOrder(
  planId: string,
  blockId: string,
  orderedExercises: Array<{ id: string; order: number }>
): Promise<void> {
  console.log("Updating exercises order for plan:", planId, "block:", blockId, orderedExercises);
  const batch = writeBatch(db);

  for (const exercise of orderedExercises) {
    const exerciseRef = doc(db, "exercises", exercise.id);
    batch.update(exerciseRef, { order: exercise.order });
  }

  try {
    await batch.commit();
    console.log("Exercises order updated successfully.");
  } catch (error) {
    console.error("Error updating exercises order:", error);
    throw error;
  }
}

// Add this function temporarily for debugging
export async function debugGetBlocksForPlan(planId: string): Promise<void> {
  console.log(`[DEBUG] Fetching blocks for plan: ${planId}`);
  try {
    const trainingBlocksRef = collection(db, "trainingBlocks");
    const q = query(trainingBlocksRef, where("planId", "==", planId));
    const querySnapshot = await getDocs(q);
    const blocks: { id: string; title: string }[] = []; // Simplified type for logging
    querySnapshot.forEach((docSnap) => {
      const blockData = docSnap.data();
      blocks.push({ id: docSnap.id, title: blockData.title });
    });
    console.log(`[DEBUG] Found ${blocks.length} blocks for plan ${planId}:`, blocks);
  } catch (error) {
    console.error(`[DEBUG] Error fetching blocks for plan ${planId}:`, error);
  }
}
