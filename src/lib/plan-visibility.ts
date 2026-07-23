import type { TrainingPlan } from '@/data/training-plans';

// Fallback list used only for accounts that don't have an explicit
// `allowedPlanIds` field yet in Firestore (e.g. accounts created before
// per-student plan assignment existed). Once an admin sets allowedPlanIds
// on a user doc (even to an empty array), that value takes over completely.
export const DEFAULT_STUDENT_PLAN_IDS = [
  'taller-metodo-mente-movimiento',
  'etapa-2-basico-montado',
] as const;

const STUDENT_PLAN_OVERRIDES: Record<string, { name?: string; description?: string }> = {
  'taller-metodo-mente-movimiento': {
    name: 'Etapa 1 - Basico Manejo',
    description:
      'Primer acercamiento al caballo con enfoque de manejo basico, calma y comunicacion.',
  },
  'etapa-2-basico-montado': {
    name: 'Etapa 2 - Basico Montado',
    description:
      'Patrones montados fundamentales para desarrollar ritmo, control, equilibrio y comunicacion despues de la Etapa 1.',
  },
};

const DEFAULT_ADMIN_EMAILS = ['loli@rebltech.com'];

const ADMIN_EMAILS = [
  ...new Set(
    [...DEFAULT_ADMIN_EMAILS, ...(process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? '').split(',')]
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  ),
];

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

export function isAdminUser(user: { email?: string | null } | null | undefined): boolean {
  return isAdminEmail(user?.email);
}

// `allowedPlanIds` is `null`/`undefined` when the user doc has no explicit
// assignment yet (fall back to the default list). Pass `[]` explicitly to
// mean "this student has no plans assigned".
function resolveAllowedPlanIds(allowedPlanIds: string[] | null | undefined): readonly string[] {
  if (allowedPlanIds == null) return DEFAULT_STUDENT_PLAN_IDS;
  return allowedPlanIds;
}

export function canUserAccessPlan(
  planId: string,
  isAdmin: boolean,
  allowedPlanIds?: string[] | null
): boolean {
  if (isAdmin) return true;
  return resolveAllowedPlanIds(allowedPlanIds).includes(planId);
}

export function getVisiblePlans(
  plans: TrainingPlan[],
  isAdmin: boolean,
  allowedPlanIds?: string[] | null
): TrainingPlan[] {
  if (isAdmin) return plans;
  return plans.filter((plan) => canUserAccessPlan(plan.id, false, allowedPlanIds));
}

export function getPlanDisplayName(planId: string, defaultName: string, isAdmin: boolean): string {
  if (isAdmin) return defaultName;
  return STUDENT_PLAN_OVERRIDES[planId]?.name ?? defaultName;
}

export function getPlanDisplayDescription(
  planId: string,
  defaultDescription: string,
  isAdmin: boolean
): string {
  if (isAdmin) return defaultDescription;
  return STUDENT_PLAN_OVERRIDES[planId]?.description ?? defaultDescription;
}
