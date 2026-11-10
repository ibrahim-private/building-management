import { repos } from '@/database/repositories';
import type {
  AppSettings,
  Expense,
  FinancialPeriod,
  Obligation,
  PeriodCard,
  PeriodCollectionSummary,
  PeriodDetail,
  Transaction,
  TreasurySummary,
  Unit,
  UnitCollectionRow,
  UnitWithObligation,
} from '@/types';
import { sortTransactionsDesc, sortUnits } from '@/utils/sort';
import { summarizeObligations, summarizeTransactions } from '../finance/calculations';

/**
 * Read models: assemble data from repositories into the shapes screens and
 * PDF reports need. Pure reads, no writes, no UI.
 */

const byStartDesc = (a: FinancialPeriod, b: FinancialPeriod) => b.startDate.localeCompare(a.startDate);

export async function getPeriodsSorted(): Promise<FinancialPeriod[]> {
  return (await repos.periods.all()).sort(byStartDesc);
}

// ---------------------------------------------------------------- dashboard

export interface DashboardData {
  settings: AppSettings;
  activePeriod: FinancialPeriod | null;
  pendingReviewPeriod: FinancialPeriod | null;
  treasury: TreasurySummary;
  periodCollections: number;
  periodPaidExpenses: number;
  activeUnitCount: number;
  collection: PeriodCollectionSummary;
  recentTransactions: Transaction[];
}

export async function getDashboardData(): Promise<DashboardData> {
  const [settings, activePeriod, units, transactions] = await Promise.all([
    repos.settings.get(),
    repos.periods.getActive(),
    repos.units.all(),
    repos.transactions.all(),
  ]);
  const obligations = activePeriod ? await repos.obligations.byPeriod(activePeriod.id) : [];
  const pendingReviewPeriod = settings.pendingReviewPeriodId
    ? ((await repos.periods.get(settings.pendingReviewPeriodId)) ?? null)
    : null;

  const periodTx = activePeriod ? transactions.filter((t) => t.periodId === activePeriod.id) : [];
  const periodSummary = summarizeTransactions(periodTx);

  return {
    settings,
    activePeriod: activePeriod ?? null,
    pendingReviewPeriod,
    treasury: summarizeTransactions(transactions),
    periodCollections: periodSummary.collections,
    periodPaidExpenses: periodSummary.paidExpenses,
    activeUnitCount: units.filter((u) => u.status === 'active').length,
    collection: summarizeObligations(obligations),
    recentTransactions: sortTransactionsDesc(transactions).slice(0, 5),
  };
}

// -------------------------------------------------------------------- units

export interface UnitsOverview {
  activePeriod: FinancialPeriod | null;
  units: UnitWithObligation[];
}

/** Every unit (archived included) with its obligation in the current period, if any. */
export async function getUnitsOverview(): Promise<UnitsOverview> {
  const [activePeriod, units] = await Promise.all([repos.periods.getActive(), repos.units.all()]);
  const obligations = activePeriod ? await repos.obligations.byPeriod(activePeriod.id) : [];
  const byUnit = new Map(obligations.map((o) => [o.unitId, o]));
  return {
    activePeriod: activePeriod ?? null,
    units: sortUnits(units).map((unit) => ({ unit, obligation: byUnit.get(unit.id) })),
  };
}

export interface UnitHistoryRow {
  period: FinancialPeriod;
  obligation: Obligation;
}

export interface UnitHistory {
  unit: Unit;
  rows: UnitHistoryRow[];
  totalRequired: number;
  totalPaid: number;
  totalRemaining: number;
}

export async function getUnitHistory(unitId: string): Promise<UnitHistory | null> {
  const unit = await repos.units.get(unitId);
  if (!unit) return null;
  const [obligations, periods] = await Promise.all([repos.obligations.byUnit(unitId), repos.periods.all()]);
  const periodsById = new Map(periods.map((p) => [p.id, p]));
  const rows = obligations
    .map((obligation) => ({ obligation, period: periodsById.get(obligation.periodId) }))
    .filter((r): r is UnitHistoryRow => r.period !== undefined)
    .sort((a, b) => byStartDesc(a.period, b.period));
  const summary = summarizeObligations(rows.map((r) => r.obligation));
  return {
    unit,
    rows,
    totalRequired: summary.required,
    totalPaid: summary.collected,
    totalRemaining: summary.remaining,
  };
}

// ------------------------------------------------------------------ records

function expenseTotals(expenses: Expense[]) {
  let paid = 0;
  let unpaid = 0;
  for (const e of expenses) {
    if (e.status === 'paid') paid += e.amount;
    else unpaid += e.amount;
  }
  return { paid, unpaid };
}

export async function getPeriodCards(): Promise<PeriodCard[]> {
  const [periods, obligations, expenses] = await Promise.all([
    getPeriodsSorted(),
    repos.obligations.all(),
    repos.expenses.all(),
  ]);
  return periods.map((period) => ({
    period,
    summary: summarizeObligations(obligations.filter((o) => o.periodId === period.id)),
    paidExpensesTotal: expenseTotals(
      expenses.filter((e) => e.periodId === period.id && !e.archived),
    ).paid,
  }));
}

export async function getPeriodDetail(periodId: string): Promise<PeriodDetail | null> {
  const period = await repos.periods.get(periodId);
  if (!period) return null;
  const [obligations, units, transactions, expenses] = await Promise.all([
    repos.obligations.byPeriod(periodId),
    repos.units.all(), // archived units included on purpose: history must stay visible
    repos.transactions.byPeriod(periodId),
    repos.expenses.byPeriod(periodId),
  ]);
  const unitsById = new Map(units.map((u) => [u.id, u]));
  const rows = obligations
    .map((obligation) => ({ obligation, unit: unitsById.get(obligation.unitId) }))
    .filter((r): r is UnitCollectionRow => r.unit !== undefined);
  const sortedUnits = sortUnits(rows.map((r) => r.unit));
  const order = new Map(sortedUnits.map((u, i) => [u.id, i]));
  rows.sort((a, b) => (order.get(a.unit.id) ?? 0) - (order.get(b.unit.id) ?? 0));

  const visibleExpenses = expenses.filter((e) => !e.archived).sort((a, b) => b.date.localeCompare(a.date));
  const totals = expenseTotals(visibleExpenses);
  return {
    period,
    rows,
    summary: summarizeObligations(obligations),
    collectionTransactions: sortTransactionsDesc(transactions.filter((t) => t.type === 'collection')),
    transactions: sortTransactionsDesc(transactions),
    expenses: visibleExpenses,
    paidExpensesTotal: totals.paid,
    unpaidExpensesTotal: totals.unpaid,
  };
}

// ---------------------------------------------------------------- expenses

export interface ExpensesOverview {
  expenses: Expense[];
  periods: FinancialPeriod[];
  balance: number;
}

export async function getExpensesOverview(): Promise<ExpensesOverview> {
  const [expenses, periods, transactions] = await Promise.all([
    repos.expenses.all(),
    getPeriodsSorted(),
    repos.transactions.all(),
  ]);
  return {
    expenses: expenses.filter((e) => !e.archived).sort((a, b) => b.date.localeCompare(a.date)),
    periods,
    balance: summarizeTransactions(transactions).balance,
  };
}

// ---------------------------------------------------------------- treasury

export interface TreasuryOverview {
  transactions: Transaction[];
  periods: FinancialPeriod[];
  units: Unit[];
  summary: TreasurySummary;
}

export async function getTreasuryOverview(): Promise<TreasuryOverview> {
  const [transactions, periods, units] = await Promise.all([
    repos.transactions.all(),
    getPeriodsSorted(),
    repos.units.all(),
  ]);
  return { transactions, periods, units: sortUnits(units), summary: summarizeTransactions(transactions) };
}
