export * from './schemas';

import type { Expense, FinancialPeriod, Obligation, Transaction, Unit } from './schemas';

/** Read-model types (computed views, never stored). */

export interface PeriodCollectionSummary {
  required: number;
  collected: number;
  remaining: number;
  paidCount: number;
  unpaidCount: number;
  totalCount: number;
  /** 0..100 */
  percent: number;
}

export interface TreasurySummary {
  opening: number;
  collections: number;
  paidExpenses: number;
  manualIn: number;
  manualOut: number;
  /** opening + collections - paidExpenses + manualIn - manualOut */
  balance: number;
}

export interface UnitWithObligation {
  unit: Unit;
  obligation?: Obligation;
}

export interface UnitCollectionRow {
  unit: Unit;
  obligation: Obligation;
}

export interface TransactionWithBalance extends Transaction {
  runningBalance: number;
}

export interface PeriodCard {
  period: FinancialPeriod;
  summary: PeriodCollectionSummary;
  paidExpensesTotal: number;
}

export interface PeriodDetail {
  period: FinancialPeriod;
  rows: UnitCollectionRow[];
  summary: PeriodCollectionSummary;
  collectionTransactions: Transaction[];
  /** Every transaction of the period (collections + paid expenses), newest first. */
  transactions: Transaction[];
  expenses: Expense[];
  paidExpensesTotal: number;
  unpaidExpensesTotal: number;
}
