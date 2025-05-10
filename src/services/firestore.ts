
import { collection, getDocs, query, where, addDoc, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "@/firebase";
import type { TrainingPlan, TrainingBlock, Exercise, TrainingPlanInput, TrainingBlockInput, ExerciseInput } from "@/types/firestore";

export async function getTrainingPlans(): Promise<TrainingPlan[]> {
  console.log("Fetching training plans");
  try {
    const trainingPlansRef = collection(db, "trainingPlans");
    const q = query(trainingPlansRef); // Potentially order by createdAt or title
    const querySnapshot = await getDocs(q);
    const trainingPlans: TrainingPlan[] = [];
    querySnapshot.forEach((doc) => {
      trainingPlans.push({ id: doc.id, ...doc.data() } as TrainingPlan);
    });
    return trainingPlans;
  } catch (error) {
    console.error("Error fetching training plans:", error);
    throw error; // Re-throw to be caught by caller
  }
}

export async function addTrainingPlan(planData: TrainingPlanInput): Promise<string> {
  const planCollectionRef = collection(db, "trainingPlans");
  const newPlanData = {
    ...planData,
    createdAt: serverTimestamp() as Timestamp,
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
  console.log(`Fetching training blocks for plan: ${planId}`);
  try {
    const trainingBlocksRef = collection(db, "trainingBlocks");
    const q = query(trainingBlocksRef, where("planId", "==", planId)); // Potentially order by a sequence number or title
    const querySnapshot = await getDocs(q);
    const trainingBlocks: TrainingBlock[] = [];
    querySnapshot.forEach((doc) => {
      trainingBlocks.push({ id: doc.id, ...doc.data() } as TrainingBlock);
    });
    return trainingBlocks;
  } catch (error) {
    console.error(`Error fetching training blocks for plan ${planId}:`, error);
    throw error; 
  }
}

export async function addTrainingBlock(planId: string, blockData: TrainingBlockInput): Promise<string> {
  const blockCollectionRef = collection(db, "trainingBlocks");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const newBlockData: { [key: string]: any } = {
    title: blockData.title,
    planId: planId,
    // createdAt: serverTimestamp() as Timestamp, // Optional: if you want to track block creation time
  };

  if (blockData.notes !== undefined && blockData.notes.trim() !== "") {
    newBlockData.notes = blockData.notes;
  }

  if (blockData.duration !== undefined && blockData.duration.trim() !== "") {
    newBlockData.duration = blockData.duration;
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
  console.log(`Fetching exercises for plan: ${planId}, block: ${blockId}`);
  try {
    const exercisesRef = collection(db, "exercises");
    const q = query(
      exercisesRef,
      where("planId", "==", planId),
      where("blockId", "==", blockId)
      // Potentially order by a sequence number or title
    );
    const querySnapshot = await getDocs(q);
    const exercises: Exercise[] = [];
    querySnapshot.forEach((doc) => {
      exercises.push({ id: doc.id, ...doc.data() } as Exercise);
    });
    return exercises;
  } catch (error) {
    console.error(`Error fetching exercises for plan ${planId}, block ${blockId}:`, error);
    throw error;
  }
}

export async function addExerciseToBlock(planId: string, blockId: string, exerciseData: ExerciseInput): Promise<string> {
  const exerciseCollectionRef = collection(db, "exercises");
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dataToSave: { [key: string]: any } = {
    planId: planId,
    blockId: blockId,
    title: exerciseData.title,
    // createdAt: serverTimestamp() as Timestamp, // Optional: if you want to track exercise creation time
  };

  if (exerciseData.description !== undefined && exerciseData.description.trim() !== "") {
    dataToSave.description = exerciseData.description;
  }
  
  if (exerciseData.objective !== undefined && exerciseData.objective.trim() !== "") {
    dataToSave.objective = exerciseData.objective;
  }

  if (exerciseData.suggestedReps !== undefined && exerciseData.suggestedReps !== null && exerciseData.suggestedReps.trim() !== "") {
    dataToSave.suggestedReps = exerciseData.suggestedReps;
  } else {
    dataToSave.suggestedReps = null; 
  }


  try {
    const docRef = await addDoc(exerciseCollectionRef, dataToSave);
    console.log("Exercise added with ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error adding exercise:", error);
    throw error;
  }
}

