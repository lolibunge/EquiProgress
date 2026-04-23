export type Signal = {
  label: string;
  details?: string;
};

export interface Exercise {
  id: string;
  name: string;
  image?: string;
  // LEGADO
  description?: string;
  longDescription?: string;

  // NUEVO (ficha técnica)
  objective?: string;
  focus?: string;
  method?: string[];
  observe?: string;
  cues?: string[];
  gear?: string[];
  duration?: string;
  reps?: string;
  prerequisites?: string[];
  safety?: string[];
  progressSigns?: Signal[];
  advanceCriteria?: string[];
  commonMistakes?: string[];
  instructorTips?: string[];
  transitionTo?: string[];
}

export type PlanStage = {
  week: number;
  title?: string;
  description: string;
  exerciseIds?: string[];
  dayPlans?: string[][];
};

export type Category = 'Unbroke' | 'Retraining' | 'Continuing Training';

export type TrainingPlan = {
  id: string;
  name: string;
  description: string;
  longDescription?: string;
  goal?: string;
  forWhom?: string;
  keyPoints?: string[];
  duration: string;
  weeks: number;
  image?: string;
  category: Category;
  exercises: Exercise[];
  stages?: PlanStage[];
  progressionNote?: string;
  successIndicators?: string[];
};

export const CATEGORY_LABELS_ES: Record<Category, string> = {
  Unbroke: 'Manejo básico del caballo',
  Retraining: 'Reentrenamiento',
  'Continuing Training': 'Entrenamiento continuado',
};

export const CATEGORIES = [
  'Unbroke',
  'Retraining',
  'Continuing Training',
] as const satisfies readonly Category[];

export const CATEGORY_LABELS = CATEGORY_LABELS_ES;

export const getCategoryLabel = (category: Category) =>
  CATEGORY_LABELS[category] ?? category;
