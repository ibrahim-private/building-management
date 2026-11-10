import { TRANSACTION_DIRECTION } from '@/constants/labels';
import type {
  Obligation,
  PeriodCollectionSummary,
  Transaction,
  TransactionWithBalance,
  TreasurySummary,
} from '@/types';
import { sortTransactionsAsc } from '@/utils/sort';

/**
 * Centralised, pure financial calculations. Nothing else in the app is allowed
 * to add or subtract money; the treasury balance is ALWAYS derived from the
 * transaction list through these functions.
 */

/** +amount for money in, -amount for money out. */
export function signedAmount(tx: Pick<Transaction, 'type' | 'amount'>): number {
  return TRANSACTION_DIRECTION[tx.type] === 'in' ? tx.amount : -tx.amount;
}

/** Current Balance = Opening + Collections - Paid Expenses + Manual In - Manual Out */
export function computeBalance(transactions: readonly Pick<Transaction, 'type' | 'amount'>[]): number {
  return transactions.reduce((total, tx) => total + signedAmount(tx), 0);
}

export function summarizeTransactions(transactions: readonly Transaction[]): TreasurySummary {
  const summary: TreasurySummary = {
    opening: 0,
    collections: 0,
    paidExpenses: 0,
    manualIn: 0,
    manualOut: 0,
    balance: 0,
  };
  for (const tx of transactions) {
    switch (tx.type) {
      case 'opening':
        summary.opening += tx.amount;
        break;
      case 'collection':
        summary.collections += tx.amount;
        break;
      case 'expense':
        summary.paidExpenses += tx.amount;
        break;
      case 'manual_in':
        summary.manualIn += tx.amount;
        break;
      case 'manual_out':
        summary.manualOut += tx.amount;
        break;
    }
  }
  summary.balance = computeBalance(transactions);
  return summary;
}

export function summarizeObligations(obligations: readonly Obligation[]): PeriodCollectionSummary {
  let required = 0;
  let collected = 0;
  let paidCount = 0;
  for (const ob of obligations) {
    required += ob.amount;
    if (ob.status === 'paid') {
      collected += ob.amount;
      paidCount += 1;
    }
  }
  const totalCount = obligations.length;
  return {
    required,
    collected,
    remaining: required - collected,
    paidCount,
    unpaidCount: totalCount - paidCount,
    totalCount,
    percent: required > 0 ? Math.min(100, Math.round((collected / required) * 100)) : 0,
  };
}

/** Transactions oldest-first, each carrying the cumulative balance after it. */
export function withRunningBalance(transactions: readonly Transaction[]): TransactionWithBalance[] {
  let running = 0;
  return sortTransactionsAsc(transactions).map((tx) => {
    running += signedAmount(tx);
    return { ...tx, runningBalance: running };
  });
}
