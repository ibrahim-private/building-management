import { unitFullLabel } from '@/constants/labels';
import { repos } from '@/database/repositories';
import { runInTransaction } from '@/database/unitOfWork';
import type { Obligation, Transaction } from '@/types';
import { isValidISODate, nowISO } from '@/utils/date';
import { AppError } from '@/utils/errors';
import { newId } from '@/utils/id';
import { formatMoney } from '@/utils/money';
import { getBalance } from './treasuryService';

/**
 * Records a full payment for one obligation.
 * Atomic: the transaction row and the obligation status change together or not at all.
 * Idempotent: a second call (double tap) fails with ALREADY_PAID and changes nothing.
 */
export function recordCollection(obligationId: string, paidAt: string): Promise<Transaction> {
  return runInTransaction(async () => {
    if (!isValidISODate(paidAt)) throw new AppError('VALIDATION', 'تاريخ الدفع غير صالح.');

    const obligation = await repos.obligations.get(obligationId);
    if (!obligation) {
      throw new AppError('NOT_FOUND', 'لا يوجد التزام لهذه الوحدة في هذه الفترة.');
    }
    if (obligation.status === 'paid') {
      throw new AppError('ALREADY_PAID', 'تم تسجيل دفع هذه الوحدة بالفعل.');
    }
    if (obligation.amount <= 0) {
      throw new AppError('VALIDATION', 'المبلغ المطلوب لهذه الوحدة يساوي صفراً.');
    }
    // Defence in depth: never create a second collection for the same obligation.
    if (await repos.transactions.getByObligation(obligation.id)) {
      throw new AppError('ALREADY_PAID', 'يوجد تحصيل مسجل لهذه الوحدة بالفعل.');
    }

    const [unit, period] = await Promise.all([
      repos.units.get(obligation.unitId),
      repos.periods.get(obligation.periodId),
    ]);
    if (!unit || !period) throw new AppError('NOT_FOUND', 'بيانات الوحدة أو الفترة غير موجودة.');

    const tx: Transaction = {
      id: newId(),
      type: 'collection',
      amount: obligation.amount,
      date: paidAt,
      description: `تحصيل ${unitFullLabel(unit)} - ${period.name}`,
      unitId: unit.id,
      obligationId: obligation.id,
      periodId: period.id,
      createdAt: nowISO(),
    };
    await repos.transactions.add(tx);

    const paid: Obligation = {
      ...obligation,
      status: 'paid',
      paidAt,
      transactionId: tx.id,
      updatedAt: nowISO(),
    };
    await repos.obligations.put(paid);
    return tx;
  });
}

/**
 * Reverses a wrongly recorded payment: the collection transaction is removed and
 * the obligation returns to Unpaid, so the derived treasury balance drops by exactly that amount.
 * Blocked if it would push the treasury below zero (money already spent).
 */
export function undoCollection(obligationId: string): Promise<void> {
  return runInTransaction(async () => {
    const obligation = await repos.obligations.get(obligationId);
    if (!obligation) throw new AppError('NOT_FOUND', 'لا يوجد التزام لهذه الوحدة.');
    if (obligation.status !== 'paid') {
      throw new AppError('NOT_PAID', 'هذه الوحدة غير مسجلة كمدفوعة.');
    }

    const balance = await getBalance();
    if (balance - obligation.amount < 0) {
      throw new AppError(
        'NEGATIVE_BALANCE',
        `لا يمكن التراجع عن هذا الدفع لأن رصيد الخزينة (${formatMoney(balance)}) أقل من المبلغ ` +
          `(${formatMoney(obligation.amount)}). تراجع أولاً عن مصروف مدفوع أو أضف رصيداً.`,
      );
    }

    const linked =
      (obligation.transactionId && (await repos.transactions.get(obligation.transactionId))) ||
      (await repos.transactions.getByObligation(obligation.id));
    if (linked) await repos.transactions.remove(linked.id);

    // Rebuild without the payment fields so they truly disappear from storage.
    const { paidAt: _paidAt, transactionId: _transactionId, ...rest } = obligation;
    await repos.obligations.put({ ...rest, status: 'unpaid', updatedAt: nowISO() });
  });
}
