import { describe, expect, it } from 'vitest';
import type { Obligation, Transaction } from '@/types';
import { computeBalance, summarizeObligations, summarizeTransactions, withRunningBalance } from './calculations';

const tx = (type: Transaction['type'], amount: number, date = '2026-01-01', id = Math.random().toString()): Transaction => ({
  id,
  type,
  amount,
  date,
  description: '',
  createdAt: `${date}T00:00:00.000Z`,
});

const ob = (amount: number, status: Obligation['status']): Obligation => ({
  id: Math.random().toString(),
  unitId: 'u',
  periodId: 'p',
  amount,
  status,
  periodNote: '',
  createdAt: '',
  updatedAt: '',
});

describe('treasury balance', () => {
  it('= opening + collections - paid expenses + manual in - manual out', () => {
    const txs = [
      tx('opening', 100000),
      tx('collection', 15000),
      tx('collection', 20000),
      tx('expense', 30000),
      tx('manual_in', 5000),
      tx('manual_out', 2000),
    ];
    expect(computeBalance(txs)).toBe(100000 + 35000 - 30000 + 5000 - 2000);
    const s = summarizeTransactions(txs);
    expect(s).toMatchObject({ opening: 100000, collections: 35000, paidExpenses: 30000, manualIn: 5000, manualOut: 2000 });
    expect(s.balance).toBe(108000);
  });

  it('builds a running balance in chronological order', () => {
    const rows = withRunningBalance([
      tx('expense', 3000, '2026-01-03'),
      tx('opening', 10000, '2026-01-01'),
      tx('collection', 5000, '2026-01-02'),
    ]);
    expect(rows.map((r) => r.runningBalance)).toEqual([10000, 15000, 12000]);
  });
});

describe('obligation summary', () => {
  it('computes totals, counts and percentage from integers', () => {
    const s = summarizeObligations([ob(15000, 'paid'), ob(20000, 'unpaid'), ob(15000, 'paid')]);
    expect(s).toMatchObject({ required: 50000, collected: 30000, remaining: 20000, paidCount: 2, unpaidCount: 1, percent: 60 });
  });

  it('handles an empty period', () => {
    expect(summarizeObligations([]).percent).toBe(0);
  });
});
