import { repos } from '@/database/repositories';
import { runInTransaction } from '@/database/unitOfWork';
import type { Transaction, TreasurySummary } from '@/types';
import { isValidISODate, nowISO } from '@/utils/date';
import { AppError } from '@/utils/errors';
import { newId } from '@/utils/id';
import { formatMoney } from '@/utils/money';
import { computeBalance, summarizeTransactions } from './calculations';

/** Cumulative balance, derived from every transaction (never stored). */
export async function getBalance(): Promise<number> {
  return computeBalance(await repos.transactions.all());
}

/** Summary over all transactions, or only those of one period. */
export async function getTreasurySummary(periodId?: string): Promise<TreasurySummary> {
  const txs = periodId ? await repos.transactions.byPeriod(periodId) : await repos.transactions.all();
  return summarizeTransactions(txs);
}

function assertAmount(amount: number): void {
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new AppError('VALIDATION', 'المبلغ يجب أن يكون أكبر من صفر.');
  }
}

/** Records the existing treasury balance once, during first-time setup. */
export function recordOpeningBalance(amount: number, date: string): Promise<void> {
  return runInTransaction(async () => {
    if (!Number.isSafeInteger(amount) || amount < 0) {
      throw new AppError('VALIDATION', 'الرصيد الافتتاحي غير صالح.');
    }
    if (!isValidISODate(date)) throw new AppError('VALIDATION', 'التاريخ غير صالح.');
    if (amount === 0) return;
    if (await repos.transactions.getOpening()) {
      throw new AppError('DUPLICATE', 'تم تسجيل الرصيد الافتتاحي من قبل.');
    }
    await repos.transactions.add({
      id: newId(),
      type: 'opening',
      amount,
      date,
      description: 'الرصيد الافتتاحي للخزينة',
      periodId: null,
      createdAt: nowISO(),
    });
  });
}

export interface ManualAdjustmentInput {
  direction: 'in' | 'out';
  amount: number;
  date: string;
  reason: string;
}

export function addManualAdjustment(input: ManualAdjustmentInput): Promise<Transaction> {
  return runInTransaction(async () => {
    assertAmount(input.amount);
    if (!isValidISODate(input.date)) throw new AppError('VALIDATION', 'التاريخ غير صالح.');
    const reason = input.reason.trim();
    if (!reason) throw new AppError('VALIDATION', 'اكتب سبب التعديل.');

    if (input.direction === 'out') {
      const balance = await getBalance();
      if (input.amount > balance) {
        throw new AppError(
          'INSUFFICIENT_FUNDS',
          `لا يمكن خصم هذا المبلغ، الرصيد المتاح ${formatMoney(balance)} فقط.`,
        );
      }
    }

    const tx: Transaction = {
      id: newId(),
      type: input.direction === 'in' ? 'manual_in' : 'manual_out',
      amount: input.amount,
      date: input.date,
      description: reason,
      periodId: null,
      createdAt: nowISO(),
    };
    await repos.transactions.add(tx);
    return tx;
  });
}

/** Removes a mistaken manual adjustment, as long as the balance stays valid. */
export function removeManualAdjustment(id: string): Promise<void> {
  return runInTransaction(async () => {
    const tx = await repos.transactions.get(id);
    if (!tx) throw new AppError('NOT_FOUND', 'هذه الحركة غير موجودة.');
    if (tx.type !== 'manual_in' && tx.type !== 'manual_out') {
      throw new AppError('VALIDATION', 'يمكن حذف التعديلات اليدوية فقط.');
    }
    if (tx.type === 'manual_in') {
      const balance = await getBalance();
      if (balance - tx.amount < 0) {
        throw new AppError(
          'NEGATIVE_BALANCE',
          'لا يمكن حذف هذه الإضافة لأن رصيد الخزينة سيصبح سالباً.',
        );
      }
    }
    await repos.transactions.remove(id);
  });
}
