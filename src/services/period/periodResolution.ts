import { repos } from '@/database/repositories';
import type { FinancialPeriod } from '@/types';

export type PeriodResolution =
  | { kind: 'single'; period: FinancialPeriod }
  | { kind: 'none' }
  | { kind: 'multiple'; periods: FinancialPeriod[] };

/**
 * Finds which financial period(s) contain a date.
 * The caller must NOT silently pick a period for `none` or `multiple`:
 * the administrator has to choose explicitly.
 */
export async function resolvePeriodForDate(date: string): Promise<PeriodResolution> {
  const periods = (await repos.periods.findContaining(date)).sort((a, b) =>
    b.startDate.localeCompare(a.startDate),
  );
  if (periods.length === 0) return { kind: 'none' };
  if (periods.length === 1) return { kind: 'single', period: periods[0] };
  return { kind: 'multiple', periods };
}
