import { db } from '../db';
import type { Expense } from '@/types';

export const expensesRepository = {
  all: (): Promise<Expense[]> => db.expenses.toArray(),
  get: (id: string): Promise<Expense | undefined> => db.expenses.get(id),
  byPeriod: (periodId: string): Promise<Expense[]> =>
    db.expenses.where('periodId').equals(periodId).toArray(),
  add: async (expense: Expense): Promise<void> => {
    await db.expenses.add(expense);
  },
  put: async (expense: Expense): Promise<void> => {
    await db.expenses.put(expense);
  },
};
