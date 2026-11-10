import { db } from '../db';
import type { Unit, UnitType } from '@/types';

export const unitsRepository = {
  all: (): Promise<Unit[]> => db.units.toArray(),
  get: (id: string): Promise<Unit | undefined> => db.units.get(id),
  findByTypeAndNumber: (type: UnitType, number: string): Promise<Unit | undefined> =>
    db.units.where('[type+number]').equals([type, number]).first(),
  add: async (unit: Unit): Promise<void> => {
    await db.units.add(unit);
  },
  put: async (unit: Unit): Promise<void> => {
    await db.units.put(unit);
  },
};
