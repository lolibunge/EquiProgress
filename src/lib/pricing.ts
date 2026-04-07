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

export function getTrialStatus(startedAtInput: string | Date | null | undefined): TrialStatus {
  const startedAt =
    startedAtInput instanceof Date
      ? startedAtInput
      : typeof startedAtInput === 'string' && startedAtInput.trim().length > 0
        ? new Date(startedAtInput)
        : null;

  const hasValidStart = startedAt !== null && Number.isFinite(startedAt.getTime());
  if (!hasValidStart) {
    return {
      totalDays: PRICING.trialDays,
      elapsedDays: 0,
      remainingDays: PRICING.trialDays,
      startedAt: null,
      endsAt: null,
      isExpired: false,
    };
  }

  const nowMs = Date.now();
  const startMs = startedAt.getTime();
  const elapsedDays = Math.max(0, Math.floor((nowMs - startMs) / MS_PER_DAY));
  const remainingDays = Math.max(0, PRICING.trialDays - elapsedDays);
  const endsAt = new Date(startMs + PRICING.trialDays * MS_PER_DAY);

  return {
    totalDays: PRICING.trialDays,
    elapsedDays,
    remainingDays,
    startedAt,
    endsAt,
    isExpired: remainingDays === 0,
  };
}
