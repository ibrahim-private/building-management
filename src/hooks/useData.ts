import { useLiveQuery } from 'dexie-react-hooks';
import { getSettings } from '@/services/settings/settingsService';
import { resolvePeriodForDate } from '@/services/period/periodResolution';
import { getPeriodDraft } from '@/services/period/periodService';
import {
  getDashboardData,
  getExpensesOverview,
  getPeriodCards,
  getPeriodDetail,
  getPeriodsSorted,
  getTreasuryOverview,
  getUnitHistory,
  getUnitsOverview,
} from '@/services/reports/queries';

/**
 * Live data hooks. Each wraps a read model from the services layer in a Dexie
 * live query, so screens update automatically after any write.
 * `undefined` means "still loading".
 */

export const useSettings = () => useLiveQuery(() => getSettings(), []);
export const useDashboardData = () => useLiveQuery(() => getDashboardData(), []);
export const useUnitsOverview = () => useLiveQuery(() => getUnitsOverview(), []);
export const useUnitHistory = (unitId: string) =>
  useLiveQuery(async () => (await getUnitHistory(unitId)) ?? null, [unitId]);
export const usePeriods = () => useLiveQuery(() => getPeriodsSorted(), []);
export const usePeriodCards = () => useLiveQuery(() => getPeriodCards(), []);
export const usePeriodDetail = (periodId: string) =>
  useLiveQuery(async () => (await getPeriodDetail(periodId)) ?? null, [periodId]);
export const useExpensesOverview = () => useLiveQuery(() => getExpensesOverview(), []);
export const useTreasuryOverview = () => useLiveQuery(() => getTreasuryOverview(), []);
export const usePeriodDraft = () => useLiveQuery(() => getPeriodDraft(), []);

/** Which period(s) contain this date (for the expense form). */
export const usePeriodResolution = (date: string) =>
  useLiveQuery(() => resolvePeriodForDate(date), [date]);
