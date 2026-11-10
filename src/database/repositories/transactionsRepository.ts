import { db } from '../db';
import type { Transaction } from '@/types';

export const transactionsRepository = {
  all: (): Promise<Transaction[]> => db.transactions.toArray(),
  get: (id: string): Promise<Transaction | undefined> => db.transactions.get(id),
  byPeriod: (periodId: string): Promise<Transaction[]> =>
    db.transactions.where('periodId').equals(periodId).toArray(),
  byUnit: (unitId: string): Promise<Transaction[]> =>
    db.transactions.where('unitId').equals(unitId).toArray(),
  getByObligation: (obligationId: string): Promise<Transaction | undefined> =>
    db.transactions.where('obligationId').equals(obligationId).first(),
  getByExpense: (expenseId: string): Promise<Transaction | undefined> =>
    db.transactions.where('expenseId').equals(expenseId).first(),
  getOpening: (): Promise<Transaction | undefined> =>
    db.transactions.where('type').equals('opening').first(),
  add: async (tx: Transaction): Promise<void> => {
    await db.transactions.add(tx);
  },
  put: async (tx: Transaction): Promise<void> => {
    await db.transactions.put(tx);
  },
  remove: async (id: string): Promise<void> => {
    await db.transactions.delete(id);
  },
};
