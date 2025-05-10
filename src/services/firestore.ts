import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/firebase";
import type { TrainingPlan, TrainingBlock, Exercise } from "@/types/firestore";

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
    return [];
  }
}

export async function getTrainingBlocks(planId: string): Promise<TrainingBlock[]> {
  console.log(`Fetching training blocks for plan: ${planId}`);
  try {
    const trainingBlocksRef = collection(db, "trainingBlocks");
    const q = query(trainingBlocksRef, where("planId", "==", planId));
    const querySnapshot = await getDocs(q);
    const trainingBlocks: TrainingBlock[] = [];
    querySnapshot.forEach((doc) => {
      trainingBlocks.push({ id: doc.id, ...doc.data() } as TrainingBlock);
    });
    return trainingBlocks;
  } catch (error) {
    console.error(`Error fetching training blocks for plan ${planId}:`, error);
    return [];
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
    );
    const querySnapshot = await getDocs(q);
    const exercises: Exercise[] = [];
    querySnapshot.forEach((doc) => {
      exercises.push({ id: doc.id, ...doc.data() } as Exercise);
    });
    return exercises;
  } catch (error) {
    console.error(`Error fetching exercises for plan ${planId}, block ${blockId}:`, error);
    return [];
  }
}