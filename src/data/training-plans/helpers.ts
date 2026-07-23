import type { PlanStage, TrainingPlan } from './types';

const DEFAULT_STAGE_WORK_DAYS = 5;

function mapPlanExercisesById(
  plan: TrainingPlan,
  exerciseIds: string[]
): TrainingPlan['exercises'] {
  return exerciseIds
    .map((exerciseId) => plan.exercises.find((exercise) => exercise.id === exerciseId))
    .filter((exercise): exercise is TrainingPlan['exercises'][number] => Boolean(exercise));
}

export function getPlanStage(plan: TrainingPlan, week: number): PlanStage | null {
  return plan.stages?.find((stage) => stage.week === week) ?? null;
}

export function getPlanWeekExercises(
  plan: TrainingPlan,
  week: number
): TrainingPlan['exercises'] {
  const mapped = mapPlanExercisesById(plan, getPlanStage(plan, week)?.exerciseIds ?? []);
  if (mapped.length > 0) return mapped;
  return plan.exercises.slice(0, DEFAULT_STAGE_WORK_DAYS);
}

export function getPlanDayExercises(
  plan: TrainingPlan,
  week: number,
  dayNumber: number
): TrainingPlan['exercises'] {
  const dayIndex = Math.max(0, Math.floor(dayNumber) - 1);
  const explicitDayPlan = getPlanStage(plan, week)?.dayPlans?.[dayIndex] ?? null;

  if (explicitDayPlan && explicitDayPlan.length > 0) {
    const mapped = mapPlanExercisesById(plan, explicitDayPlan);
    if (mapped.length > 0) return mapped;
  }

  const weekExercises = getPlanWeekExercises(plan, week);
  const focusExercise = weekExercises[dayIndex % Math.max(1, weekExercises.length)];
  return focusExercise ? [focusExercise] : [];
}

export function weekUsesMultiExerciseDays(plan: TrainingPlan, week: number): boolean {
  return Boolean(getPlanStage(plan, week)?.dayPlans?.some((dayPlan) => dayPlan.length > 1));
}
