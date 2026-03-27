export const PRICING = {
  trialDays: 30,
} as const;

export function getTrialNotice(): string {
  return `Prueba gratis por ${PRICING.trialDays} días. Sin costo durante este período. Los planes de pago estarán disponibles próximamente.`;
}
