import { db } from '../db';
import type { FinancialPeriod } from '@/types';

export const periodsRepository = {
  all: (): Promise<FinancialPeriod[]> => db.periods.toArray(),
  get: (id: string): Promise<FinancialPeriod | undefined> => db.periods.get(id),
  listActive: (): Promise<FinancialPeriod[]> => db.periods.where('status').equals('active').toArray(),
  /** The current collection period (the newest active one if data is unusual). */
  getActive: async (): Promise<FinancialPeriod | undefined> => {
    const active = await db.periods.where('status').equals('active').toArray();
    return active.sort((a, b) => b.startDate.localeCompare(a.startDate))[0];
  },
  add: async (period: FinancialPeriod): Promise<void> => {
    await db.periods.add(period);
  },
  put: async (period: FinancialPeriod): Promise<void> => {
    await db.periods.put(period);
  },
  /** Periods whose date range contains the given day. */
  findContaining: (date: string): Promise<FinancialPeriod[]> =>
    db.periods
      .where('startDate')
      .belowOrEqual(date)
      .filter((p) => p.endDate >= date)
      .toArray(),
};
