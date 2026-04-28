import type { TrainingPlan } from './types';

import { getPlanDayExercises, getPlanStage, getPlanWeekExercises, weekUsesMultiExerciseDays } from './helpers';
import { continuingTrainingOnePlan } from './plans/continuing-1';
import { fundationalLesson } from './plans/fundational-lesson';
import { iniciacionJovenPlan } from './plans/iniciacion-joven';
import { retrainingPlan } from './plans/retraining';
import { tallerMetodoMenteYMovimientoPlan } from './plans/taller-metodo-mente-movimiento';
import { CATEGORY_LABELS, CATEGORY_LABELS_ES, CATEGORIES, getCategoryLabel } from './types';

export type {
  Category,
  Exercise,
  ExerciseMethodSubSection,
  ExerciseMethodSection,
  PlanStage,
  Signal,
  TrainingPlan,
} from './types';
export {
  CATEGORY_LABELS,
  CATEGORY_LABELS_ES,
  CATEGORIES,
  getCategoryLabel,
  getPlanDayExercises,
  getPlanStage,
  getPlanWeekExercises,
  weekUsesMultiExerciseDays,
};

export {
  continuingTrainingOnePlan,
  fundationalLesson,
  iniciacionJovenPlan,
  retrainingPlan,
  tallerMetodoMenteYMovimientoPlan,
};

export const trainingPlans: TrainingPlan[] = [
  iniciacionJovenPlan,
  tallerMetodoMenteYMovimientoPlan,
  retrainingPlan,
  continuingTrainingOnePlan,
  fundationalLesson,
];
