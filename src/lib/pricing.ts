export const PRICING = {
  trialDays: 30,
} as const;

export function getTrialNotice(): string {
  return `Prueba gratis por ${PRICING.trialDays} días. Sin costo durante este período. Los planes de pago estarán disponibles próximamente.`;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type TrialStatus = {
  totalDays: number;
  elapsedDays: number;
  remainingDays: number;
  startedAt: Date | null;
  endsAt: Date | null;
  isExpired: boolean;
};

export type TrialLockStage = 'active' | 'feedback_required' | 'pending_admin';

type TrialStatusOptions = {
  extraDays?: number;
};

export function getTrialStatus(
  startedAtInput: string | Date | null | undefined,
  options?: TrialStatusOptions
): TrialStatus {
  const parsedExtraDays = Number(options?.extraDays ?? 0);
  const extraDays = Number.isFinite(parsedExtraDays) ? Math.max(0, Math.floor(parsedExtraDays)) : 0;
  const totalDays = PRICING.trialDays + extraDays;

  const startedAt =
    startedAtInput instanceof Date
      ? startedAtInput
      : typeof startedAtInput === 'string' && startedAtInput.trim().length > 0
        ? new Date(startedAtInput)
        : null;

  const hasValidStart = startedAt !== null && Number.isFinite(startedAt.getTime());
  if (!hasValidStart) {
    return {
      totalDays,
      elapsedDays: 0,
      remainingDays: totalDays,
      startedAt: null,
      endsAt: null,
      isExpired: false,
    };
  }

  const nowMs = Date.now();
  const startMs = startedAt.getTime();
  const elapsedDays = Math.max(0, Math.floor((nowMs - startMs) / MS_PER_DAY));
  const remainingDays = Math.max(0, totalDays - elapsedDays);
  const endsAt = new Date(startMs + totalDays * MS_PER_DAY);

  return {
    totalDays,
    elapsedDays,
    remainingDays,
    startedAt,
    endsAt,
    isExpired: remainingDays === 0,
  };
}

type TrialLockStageOptions = {
  lastFeedbackAt?: Date | null;
  simulate?: 'expired' | 'pending' | null;
};

export function getTrialLockStage(
  trialStatus: TrialStatus | null,
  options?: TrialLockStageOptions
): TrialLockStage {
  if (!trialStatus) return 'active';

  if (options?.simulate === 'pending') return 'pending_admin';
  if (options?.simulate === 'expired') return 'feedback_required';

  if (!trialStatus.isExpired) return 'active';
  if (!trialStatus.endsAt) return 'feedback_required';

  const lastFeedbackAt = options?.lastFeedbackAt ?? null;
  if (!lastFeedbackAt || !Number.isFinite(lastFeedbackAt.getTime())) {
    return 'feedback_required';
  }

  return lastFeedbackAt.getTime() >= trialStatus.endsAt.getTime()
    ? 'pending_admin'
    : 'feedback_required';
}
