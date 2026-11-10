import {
  PAYMENT_STATUS_LABEL,
  TRANSACTION_DIRECTION,
  TRANSACTION_TYPE_LABEL,
  UNIT_TYPE_LABEL,
  unitLabel,
} from '@/constants/labels';
import { repos } from '@/database/repositories';
import type { Expense, Transaction } from '@/types';
import { formatDateRange, formatDateShort } from '@/utils/date';
import { AppError } from '@/utils/errors';
import { formatMoney } from '@/utils/money';
import { sortTransactionsDesc } from '@/utils/sort';
import { summarizeObligations, summarizeTransactions, withRunningBalance } from '../finance/calculations';
import { filterTransactions, type TransactionFilters } from '../finance/filters';
import { getPeriodDetail, getPeriodsSorted, getUnitHistory } from '../reports/queries';
import type { ReportDoc, ReportSection } from './types';

const statusText = (s: 'paid' | 'unpaid') => PAYMENT_STATUS_LABEL[s];

function periodSummaryItems(detail: NonNullable<Awaited<ReturnType<typeof getPeriodDetail>>>) {
  const s = detail.summary;
  return [
    { label: 'إجمالي المطلوب', value: formatMoney(s.required) },
    { label: 'إجمالي المحصّل', value: formatMoney(s.collected) },
    { label: 'المتبقي', value: formatMoney(s.remaining) },
    { label: 'نسبة التحصيل', value: `${s.percent}%` },
    { label: 'المصروفات المدفوعة', value: formatMoney(detail.paidExpensesTotal) },
    { label: 'المصروفات غير المدفوعة', value: formatMoney(detail.unpaidExpensesTotal) },
  ];
}

function unitRowsSection(
  detail: NonNullable<Awaited<ReturnType<typeof getPeriodDetail>>>,
  title: string,
): ReportSection {
  const rows = detail.rows.map(({ unit, obligation }) => [
    unitLabel(unit),
    unit.name || '—',
    formatMoney(obligation.amount),
    statusText(obligation.status),
    obligation.paidAt ? formatDateShort(obligation.paidAt) : '—',
  ]);
  return {
    title,
    table: {
      headers: ['الوحدة', 'الساكن / المنشأة', 'المبلغ المطلوب', 'الحالة', 'تاريخ الدفع'],
      widths: [1.2, 2.2, 1.5, 1.1, 1.3],
      align: ['start', 'start', 'center', 'center', 'center'],
      rows,
      totals: ['الإجمالي', '', formatMoney(detail.summary.required), '', ''],
    },
    emptyText: 'لا توجد وحدات في هذه الفترة.',
  };
}

async function requirePeriodDetail(periodId: string) {
  const detail = await getPeriodDetail(periodId);
  if (!detail) throw new AppError('NOT_FOUND', 'هذه الفترة غير موجودة.');
  return detail;
}

/** A. Period collection report */
export async function buildPeriodCollectionReport(periodId: string): Promise<ReportDoc> {
  const detail = await requirePeriodDetail(periodId);
  return {
    title: 'تقرير تحصيل الفترة',
    subtitle: detail.period.name,
    fileSlug: 'period-collection',
    meta: [
      { label: 'اسم الفترة', value: detail.period.name },
      { label: 'المدة', value: formatDateRange(detail.period.startDate, detail.period.endDate) },
    ],
    sections: [
      {
        title: 'ملخص التحصيل',
        summary: [
          { label: 'إجمالي المطلوب', value: formatMoney(detail.summary.required) },
          { label: 'إجمالي المحصّل', value: formatMoney(detail.summary.collected) },
          { label: 'المتبقي', value: formatMoney(detail.summary.remaining) },
        ],
      },
      unitRowsSection(detail, 'كشف الشقق والمنشآت'),
    ],
  };
}

/** B. Financial period report */
export async function buildFinancialPeriodReport(periodId: string): Promise<ReportDoc> {
  const detail = await requirePeriodDetail(periodId);
  const unitsById = new Map(detail.rows.map((r) => [r.unit.id, r.unit]));

  const collectionRows = detail.collectionTransactions.map((tx) => {
    const unit = tx.unitId ? unitsById.get(tx.unitId) : undefined;
    return [formatDateShort(tx.date), unit ? unitLabel(unit) : '—', unit?.name || '—', formatMoney(tx.amount)];
  });
  const expenseRows = detail.expenses.map((e) => [
    e.title,
    formatDateShort(e.date),
    statusText(e.status),
    formatMoney(e.amount),
  ]);

  return {
    title: 'التقرير المالي للفترة',
    subtitle: detail.period.name,
    fileSlug: 'financial-period',
    meta: [
      { label: 'اسم الفترة', value: detail.period.name },
      { label: 'المدة', value: formatDateRange(detail.period.startDate, detail.period.endDate) },
    ],
    sections: [
      { title: 'ملخص الفترة', summary: periodSummaryItems(detail) },
      unitRowsSection(detail, 'سجل تحصيل الوحدات'),
      {
        title: 'حركات التحصيل',
        table: {
          headers: ['التاريخ', 'الوحدة', 'الاسم', 'المبلغ'],
          widths: [1.2, 1.2, 2.4, 1.4],
          align: ['start', 'start', 'start', 'center'],
          rows: collectionRows,
          totals: ['الإجمالي', '', '', formatMoney(detail.summary.collected)],
        },
        emptyText: 'لا توجد حركات تحصيل في هذه الفترة.',
      },
      {
        title: 'سجل المصروفات',
        table: {
          headers: ['المصروف', 'التاريخ', 'الحالة', 'المبلغ'],
          widths: [3, 1.2, 1.1, 1.4],
          align: ['start', 'center', 'center', 'center'],
          rows: expenseRows,
          totals: [
            'الإجمالي (مدفوع + غير مدفوع)',
            '',
            '',
            formatMoney(detail.paidExpensesTotal + detail.unpaidExpensesTotal),
          ],
        },
        emptyText: 'لا توجد مصروفات في هذه الفترة.',
      },
      {
        title: 'الإجماليات',
        summary: [
          { label: 'المحصّل', value: formatMoney(detail.summary.collected) },
          { label: 'المصروفات المدفوعة', value: formatMoney(detail.paidExpensesTotal) },
          { label: 'صافي الفترة', value: formatMoney(detail.summary.collected - detail.paidExpensesTotal) },
        ],
      },
    ],
  };
}

/** C. Expense report (all periods, or one) */
export async function buildExpenseReport(periodId?: string): Promise<ReportDoc> {
  const [all, periods] = await Promise.all([repos.expenses.all(), getPeriodsSorted()]);
  const periodsById = new Map(periods.map((p) => [p.id, p]));
  const expenses: Expense[] = all
    .filter((e) => !e.archived && (!periodId || e.periodId === periodId))
    .sort((a, b) => b.date.localeCompare(a.date));

  const paid = expenses.filter((e) => e.status === 'paid').reduce((t, e) => t + e.amount, 0);
  const unpaid = expenses.filter((e) => e.status === 'unpaid').reduce((t, e) => t + e.amount, 0);
  const period = periodId ? periodsById.get(periodId) : undefined;

  return {
    title: 'تقرير المصروفات',
    subtitle: period ? period.name : 'كل الفترات',
    fileSlug: 'expenses',
    meta: [
      { label: 'النطاق', value: period ? period.name : 'كل الفترات' },
      { label: 'عدد المصروفات', value: String(expenses.length) },
    ],
    sections: [
      {
        title: 'الإجماليات',
        summary: [
          { label: 'المدفوع', value: formatMoney(paid) },
          { label: 'غير المدفوع', value: formatMoney(unpaid) },
          { label: 'الإجمالي', value: formatMoney(paid + unpaid) },
        ],
      },
      {
        title: 'قائمة المصروفات',
        table: {
          headers: ['المصروف', 'التاريخ', 'الفترة', 'الحالة', 'المبلغ'],
          widths: [2.6, 1.1, 1.8, 1, 1.3],
          align: ['start', 'center', 'start', 'center', 'center'],
          rows: expenses.map((e) => [
            e.title,
            formatDateShort(e.date),
            e.periodId ? (periodsById.get(e.periodId)?.name ?? '—') : '—',
            statusText(e.status),
            formatMoney(e.amount),
          ]),
          totals: ['الإجمالي', '', '', '', formatMoney(paid + unpaid)],
        },
        emptyText: 'لا توجد مصروفات.',
      },
    ],
  };
}

/** D. Treasury report (respects the filters currently applied on screen) */
export async function buildTreasuryReport(filters: TransactionFilters = {}): Promise<ReportDoc> {
  const [all, periods] = await Promise.all([repos.transactions.all(), getPeriodsSorted()]);
  const overall = summarizeTransactions(all);
  // Running balance is computed on the FULL history, then filtered, so it stays cumulative.
  const rows: Transaction[] = filterTransactions(withRunningBalance(all), filters);
  const shown = summarizeTransactions(rows);
  const withBalance = new Map(withRunningBalance(all).map((t) => [t.id, t.runningBalance]));
  const ordered = sortTransactionsDesc(rows);

  const filterNotes: string[] = [];
  if (filters.periodId && filters.periodId !== 'all') {
    filterNotes.push(`الفترة: ${periods.find((p) => p.id === filters.periodId)?.name ?? '—'}`);
  }
  if (filters.type && filters.type !== 'all') filterNotes.push(`النوع: ${TRANSACTION_TYPE_LABEL[filters.type]}`);
  if (filters.from) filterNotes.push(`من: ${formatDateShort(filters.from)}`);
  if (filters.to) filterNotes.push(`إلى: ${formatDateShort(filters.to)}`);

  const income = shown.opening + shown.collections + shown.manualIn;
  const outgoing = shown.paidExpenses + shown.manualOut;

  return {
    title: 'تقرير الخزينة',
    subtitle: filterNotes.length ? filterNotes.join(' | ') : 'كل الحركات',
    fileSlug: 'treasury',
    meta: [
      { label: 'الرصيد الحالي للخزينة', value: formatMoney(overall.balance) },
      { label: 'عدد الحركات المعروضة', value: String(ordered.length) },
    ],
    sections: [
      {
        title: 'ملخص الحركات المعروضة',
        summary: [
          { label: 'الوارد', value: formatMoney(income) },
          { label: 'المنصرف', value: formatMoney(outgoing) },
          { label: 'الصافي', value: formatMoney(income - outgoing) },
        ],
      },
      {
        title: 'سجل الحركات المالية',
        table: {
          headers: ['التاريخ', 'النوع', 'البيان', 'وارد', 'منصرف', 'الرصيد التراكمي'],
          widths: [1.1, 1.1, 2.6, 1.1, 1.1, 1.4],
          align: ['start', 'start', 'start', 'center', 'center', 'center'],
          rows: ordered.map((tx) => {
            const isIn = TRANSACTION_DIRECTION[tx.type] === 'in';
            return [
              formatDateShort(tx.date),
              TRANSACTION_TYPE_LABEL[tx.type],
              tx.description || '—',
              isIn ? formatMoney(tx.amount) : '—',
              isIn ? '—' : formatMoney(tx.amount),
              formatMoney(withBalance.get(tx.id) ?? 0),
            ];
          }),
          totals: ['الإجمالي', '', '', formatMoney(income), formatMoney(outgoing), formatMoney(overall.balance)],
        },
        emptyText: 'لا توجد حركات مطابقة.',
      },
    ],
  };
}

/** E. Individual unit report */
export async function buildUnitReport(unitId: string): Promise<ReportDoc> {
  const history = await getUnitHistory(unitId);
  if (!history) throw new AppError('NOT_FOUND', 'هذه الوحدة غير موجودة.');
  const { unit } = history;
  return {
    title: 'كشف حساب وحدة',
    subtitle: `${unitLabel(unit)}${unit.name ? ` - ${unit.name}` : ''}`,
    fileSlug: `unit-${unit.type}-${unit.number}`.replace(/[^a-zA-Z0-9_-]/g, ''),
    meta: [
      { label: 'نوع الوحدة', value: UNIT_TYPE_LABEL[unit.type] },
      { label: 'رقم الوحدة', value: unit.number },
      { label: 'الاسم', value: unit.name || '—' },
      { label: 'الحالة', value: unit.status === 'active' ? 'نشطة' : 'مؤرشفة' },
    ],
    sections: [
      {
        title: 'ملخص الحساب',
        summary: [
          { label: 'إجمالي المطلوب', value: formatMoney(history.totalRequired) },
          { label: 'إجمالي المدفوع', value: formatMoney(history.totalPaid) },
          { label: 'المتبقي', value: formatMoney(history.totalRemaining) },
        ],
      },
      {
        title: 'السجل عبر الفترات',
        table: {
          headers: ['الفترة', 'المدة', 'المطلوب', 'الحالة', 'تاريخ الدفع', 'ملاحظة الفترة'],
          widths: [1.8, 2, 1.2, 1, 1.2, 1.8],
          align: ['start', 'start', 'center', 'center', 'center', 'start'],
          rows: history.rows.map(({ period, obligation }) => [
            period.name,
            formatDateRange(period.startDate, period.endDate),
            formatMoney(obligation.amount),
            statusText(obligation.status),
            obligation.paidAt ? formatDateShort(obligation.paidAt) : '—',
            obligation.periodNote || '—',
          ]),
          totals: ['الإجمالي', '', formatMoney(history.totalRequired), '', '', ''],
        },
        emptyText: 'لا توجد سجلات لهذه الوحدة بعد.',
      },
      ...(unit.notes
        ? [{ title: 'ملاحظات دائمة', emptyText: unit.notes } satisfies ReportSection]
        : []),
    ],
  };
}

