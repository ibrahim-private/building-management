import { repos } from '@/database/repositories';
import type { FinancialPeriod, PaymentStatus } from '@/types';
import { todayISO } from '@/utils/date';
import { formatPlain } from '@/utils/money';
import { signedAmount, summarizeTransactions } from '../finance/calculations';
import { getPeriodDetail } from './queries';
import { footerLines } from './sheetLayout';

/** One printed row. Apartments show their number; facilities are written after the last apartment. */
export interface SheetRow {
  key: string;
  label: string;
  /** Text of the selected-period cell: the amount when paid, "لم يسدد" otherwise. */
  cell: string;
  status: PaymentStatus;
  note: string;
}

export interface SubscriptionSheetModel {
  period: FinancialPeriod;
  rows: SheetRow[];
  footer: string[];
}

/**
 * Builds everything the printed sheet needs for one period. The numbers are final;
 * the screen then lets the administrator edit any text before printing.
 */
export async function getSubscriptionSheet(periodId: string): Promise<SubscriptionSheetModel | null> {
  const detail = await getPeriodDetail(periodId);
  if (!detail) return null;

  // Apartments first (by number), facilities after them. (The app screens keep facilities first.)
  const apartments = detail.rows.filter((r) => r.unit.type === 'apartment');
  const facilities = detail.rows.filter((r) => r.unit.type === 'facility');
  const ordered = [...apartments, ...facilities];

  const rows: SheetRow[] = ordered.map(({ unit, obligation }) => ({
    key: obligation.id,
    label: unit.type === 'apartment' ? unit.number : `محل ${unit.number}`,
    cell: obligation.status === 'paid' ? `${formatPlain(obligation.amount)} ج` : 'لم يسدد',
    status: obligation.status,
    note: obligation.periodNote,
  }));

  const transactions = await repos.transactions.all();
  const before = transactions.filter((t) => t.date < detail.period.startDate);
  const previousBalance = before.reduce((total, tx) => total + signedAmount(tx), 0);

  return {
    period: detail.period,
    rows,
    footer: footerLines({
      paidCount: detail.summary.paidCount,
      collected: detail.summary.collected,
      paidExpenses: detail.paidExpensesTotal,
      previousBalance,
      currentBalance: summarizeTransactions(transactions).balance,
      today: todayISO(),
    }),
  };
}
