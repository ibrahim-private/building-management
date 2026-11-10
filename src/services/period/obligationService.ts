import { repos } from '@/database/repositories';
import { runInTransaction } from '@/database/unitOfWork';
import type { FinancialPeriod, Obligation, Unit } from '@/types';
import { nowISO } from '@/utils/date';
import { AppError } from '@/utils/errors';
import { newId } from '@/utils/id';

/**
 * Creates the unit's obligation for a period if it does not exist yet
 * (one obligation per unit per period). Must run inside a transaction when
 * combined with other writes.
 */
export async function ensureObligation(
  unit: Unit,
  period: FinancialPeriod,
  amount?: number,
): Promise<Obligation> {
  const existing = await repos.obligations.getByUnitAndPeriod(unit.id, period.id);
  if (existing) return existing;
  const now = nowISO();
  const obligation: Obligation = {
    id: newId(),
    unitId: unit.id,
    periodId: period.id,
    amount: amount ?? period.defaultAmount,
    status: 'unpaid',
    periodNote: '',
    createdAt: now,
    updatedAt: now,
  };
  await repos.obligations.add(obligation);
  return obligation;
}

/**
 * Changes what a unit owes for ONE period (other periods are untouched).
 * A paid obligation cannot change amount, because the collection transaction
 * already holds the old amount; undo the payment first.
 */
export function setObligationAmount(obligationId: string, amount: number): Promise<void> {
  return runInTransaction(async () => {
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      throw new AppError('VALIDATION', 'المبلغ المطلوب يجب أن يكون أكبر من صفر.');
    }
    const obligation = await repos.obligations.get(obligationId);
    if (!obligation) throw new AppError('NOT_FOUND', 'الالتزام غير موجود.');
    if (obligation.status === 'paid') {
      throw new AppError('VALIDATION', 'هذه الوحدة دفعت بالفعل. تراجع عن الدفع أولاً ثم عدّل المبلغ.');
    }
    await repos.obligations.put({ ...obligation, amount, updatedAt: nowISO() });
  });
}

/** Period-specific note for a unit (stays attached to that period forever). */
export function setObligationNote(obligationId: string, note: string): Promise<void> {
  return runInTransaction(async () => {
    const obligation = await repos.obligations.get(obligationId);
    if (!obligation) throw new AppError('NOT_FOUND', 'الالتزام غير موجود.');
    await repos.obligations.put({ ...obligation, periodNote: note.trim(), updatedAt: nowISO() });
  });
}
