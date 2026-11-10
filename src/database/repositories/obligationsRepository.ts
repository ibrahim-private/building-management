import { db } from '../db';
import type { Obligation } from '@/types';

export const obligationsRepository = {
  all: (): Promise<Obligation[]> => db.obligations.toArray(),
  get: (id: string): Promise<Obligation | undefined> => db.obligations.get(id),
  byPeriod: (periodId: string): Promise<Obligation[]> =>
    db.obligations.where('periodId').equals(periodId).toArray(),
  byUnit: (unitId: string): Promise<Obligation[]> =>
    db.obligations.where('unitId').equals(unitId).toArray(),
  getByUnitAndPeriod: (unitId: string, periodId: string): Promise<Obligation | undefined> =>
    db.obligations.where('[unitId+periodId]').equals([unitId, periodId]).first(),
  add: async (obligation: Obligation): Promise<void> => {
    await db.obligations.add(obligation);
  },
  bulkAdd: async (obligations: Obligation[]): Promise<void> => {
    await db.obligations.bulkAdd(obligations);
  },
  /** Full replacement (never partial) so removed optional fields really disappear. */
  put: async (obligation: Obligation): Promise<void> => {
    await db.obligations.put(obligation);
  },
  remove: async (id: string): Promise<void> => {
    await db.obligations.delete(id);
  },
};
