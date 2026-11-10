import { repos } from '@/database/repositories';
import { runInTransaction } from '@/database/unitOfWork';
import type { Expense, Transaction } from '@/types';
import { isValidISODate, nowISO } from '@/utils/date';
import { AppError } from '@/utils/errors';
import { newId } from '@/utils/id';
import { formatMoney } from '@/utils/money';
import { resolvePeriodForDate } from '../period/periodResolution';
import { getBalance } from './treasuryService';

export interface ExpenseInput {
  title: string;
  /** piastres */
  amount: number;
  notes: string;
  date: string;
  /** Explicit choice from the administrator; required when the date does not map to exactly one period. */
  periodId: string | null;
}

function validateInput(input: ExpenseInput): void {
  if (!input.title.trim()) throw new AppError('VALIDATION', 'اكتب عنوان المصروف.');
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0) {
    throw new AppError('VALIDATION', 'المبلغ يجب أن يكون أكبر من صفر.');
  }
  if (!isValidISODate(input.date)) throw new AppError('VALIDATION', 'التاريخ غير صالح.');
}

/**
 * Decides the period of an expense:
 *  - exactly one period contains the date  -> use it automatically
 *  - none / several                        -> the administrator must have chosen one
 *  - no periods exist at all               -> allowed without a period
 */
async function resolveExpensePeriod(input: ExpenseInput): Promise<string | null> {
  if (input.periodId) {
    const period = await repos.periods.get(input.periodId);
    if (!period) throw new AppError('NOT_FOUND', 'الفترة المختارة غير موجودة.');
    return period.id;
  }
  const resolution = await resolvePeriodForDate(input.date);
  if (resolution.kind === 'single') return resolution.period.id;
  if (resolution.kind === 'multiple') {
    throw new AppError('PERIOD_REQUIRED', 'هذا التاريخ يقع ضمن أكثر من فترة، اختر الفترة المناسبة.');
  }
  const anyPeriod = (await repos.periods.all()).length > 0;
  if (anyPeriod) {
    throw new AppError('PERIOD_REQUIRED', 'هذا التاريخ لا يقع ضمن أي فترة مالية، اختر الفترة المناسبة.');
  }
  return null;
}

export function createExpense(input: ExpenseInput): Promise<Expense> {
  return runInTransaction(async () => {
    validateInput(input);
    const periodId = await resolveExpensePeriod(input);
    const now = nowISO();
    const expense: Expense = {
      id: newId(),
      title: input.title.trim(),
      amount: input.amount,
      notes: input.notes.trim(),
      date: input.date,
      periodId,
      status: 'unpaid',
      archived: false,
      createdAt: now,
      updatedAt: now,
    };
    await repos.expenses.add(expense);
    return expense;
  });
}

/**
 * Unpaid expenses are fully editable.
 * Paid expenses only allow title/notes: amount, date and period are tied to the
 * treasury transaction, so undo the payment first to change them.
 */
export function updateExpense(id: string, input: ExpenseInput): Promise<Expense> {
  return runInTransaction(async () => {
    const expense = await repos.expenses.get(id);
    if (!expense) throw new AppError('NOT_FOUND', 'هذا المصروف غير موجود.');
    if (!input.title.trim()) throw new AppError('VALIDATION', 'اكتب عنوان المصروف.');

    if (expense.status === 'paid') {
      const next: Expense = {
        ...expense,
        title: input.title.trim(),
        notes: input.notes.trim(),
        updatedAt: nowISO(),
      };
      await repos.expenses.put(next);
      if (expense.transactionId) {
        const tx = await repos.transactions.get(expense.transactionId);
        if (tx) {
          // Keep the treasury description in sync with the title.
          await repos.transactions.put({ ...tx, description: `مصروف: ${next.title}` });
        }
      }
      return next;
    }

    validateInput(input);
    const periodId = await resolveExpensePeriod(input);
    const next: Expense = {
      ...expense,
      title: input.title.trim(),
      amount: input.amount,
      notes: input.notes.trim(),
      date: input.date,
      periodId,
      updatedAt: nowISO(),
    };
    await repos.expenses.put(next);
    return next;
  });
}

/** Removes a mistaken UNPAID expense from the lists (kept in storage, flagged archived). */
export function archiveExpense(id: string): Promise<void> {
  return runInTransaction(async () => {
    const expense = await repos.expenses.get(id);
    if (!expense) throw new AppError('NOT_FOUND', 'هذا المصروف غير موجود.');
    if (expense.status === 'paid') {
      throw new AppError('VALIDATION', 'لا يمكن حذف مصروف مدفوع. تراجع عن الدفع أولاً.');
    }
    await repos.expenses.put({ ...expense, archived: true, updatedAt: nowISO() });
  });
}

/**
 * Confirms payment of an expense: checks funds, marks it paid and records the
 * outgoing treasury transaction atomically. A second call fails with ALREADY_PAID.
 */
export function payExpense(id: string, paidAt: string): Promise<Transaction> {
  return runInTransaction(async () => {
    if (!isValidISODate(paidAt)) throw new AppError('VALIDATION', 'تاريخ الدفع غير صالح.');
    const expense = await repos.expenses.get(id);
    if (!expense || expense.archived) throw new AppError('NOT_FOUND', 'هذا المصروف غير موجود.');
    if (expense.status === 'paid') {
      throw new AppError('ALREADY_PAID', 'تم تسجيل دفع هذا المصروف بالفعل.');
    }
    if (await repos.transactions.getByExpense(expense.id)) {
      throw new AppError('ALREADY_PAID', 'يوجد دفع مسجل لهذا المصروف بالفعل.');
    }

    const balance = await getBalance();
    if (expense.amount > balance) {
      throw new AppError(
        'INSUFFICIENT_FUNDS',
        `رصيد الخزينة (${formatMoney(balance)}) لا يكفي لدفع ${formatMoney(expense.amount)}.`,
      );
    }

    const tx: Transaction = {
      id: newId(),
      type: 'expense',
      amount: expense.amount,
      date: paidAt,
      description: `مصروف: ${expense.title}`,
      expenseId: expense.id,
      periodId: expense.periodId,
      createdAt: nowISO(),
    };
    await repos.transactions.add(tx);
    await repos.expenses.put({ ...expense, status: 'paid', transactionId: tx.id, updatedAt: nowISO() });
    return tx;
  });
}

/** Reverts an expense to Unpaid and removes its outgoing transaction (balance is restored). */
export function undoExpensePayment(id: string): Promise<void> {
  return runInTransaction(async () => {
    const expense = await repos.expenses.get(id);
    if (!expense) throw new AppError('NOT_FOUND', 'هذا المصروف غير موجود.');
    if (expense.status !== 'paid') {
      throw new AppError('NOT_PAID', 'هذا المصروف غير مسجل كمدفوع.');
    }
    const linked =
      (expense.transactionId && (await repos.transactions.get(expense.transactionId))) ||
      (await repos.transactions.getByExpense(expense.id));
    if (linked) await repos.transactions.remove(linked.id);

    const { transactionId: _transactionId, ...rest } = expense;
    await repos.expenses.put({ ...rest, status: 'unpaid', updatedAt: nowISO() });
  });
}
