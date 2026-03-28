import type { TrainingPlan } from '@/data/training-plans';

const STUDENT_ALLOWED_PLAN_IDS = ['taller-metodo-mente-movimiento'] as const;

const STUDENT_PLAN_OVERRIDES: Record<string, { name?: string; description?: string }> = {
  'taller-metodo-mente-movimiento': {
    name: 'Taller Metodo Mente y Movimiento',
    description:
      'Primer acercamiento al caballo con enfoque de manejo basico, calma y comunicacion.',
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

export function canUserAccessPlan(planId: string, isAdmin: boolean): boolean {
  if (isAdmin) return true;
  return STUDENT_ALLOWED_PLAN_IDS.includes(planId as (typeof STUDENT_ALLOWED_PLAN_IDS)[number]);
}

export function getVisiblePlans(plans: TrainingPlan[], isAdmin: boolean): TrainingPlan[] {
  if (isAdmin) return plans;
  return plans.filter((plan) => canUserAccessPlan(plan.id, false));
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
