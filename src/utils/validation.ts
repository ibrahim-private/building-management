import { z } from 'zod';
import { isValidISODate } from './date';
import { parseMoneyInput } from './money';

/** Money typed by the user (text) that must parse to a positive amount. */
export const positiveMoneyInput = z
  .string()
  .trim()
  .min(1, 'أدخل المبلغ')
  .refine((v) => parseMoneyInput(v) !== null, 'مبلغ غير صالح (أرقام فقط، وحتى خانتين بعد الفاصلة)')
  .refine((v) => (parseMoneyInput(v) ?? 0) > 0, 'المبلغ يجب أن يكون أكبر من صفر');

/** Money typed by the user that may be zero (e.g. opening balance). */
export const nonNegativeMoneyInput = z
  .string()
  .trim()
  .min(1, 'أدخل المبلغ (اكتب 0 إن لم يكن هناك رصيد)')
  .refine((v) => parseMoneyInput(v) !== null, 'مبلغ غير صالح (أرقام فقط، وحتى خانتين بعد الفاصلة)');

export const dateInput = z.string().refine(isValidISODate, 'اختر تاريخاً صحيحاً');

/** Parses already-validated money text. Throws if called with unvalidated input. */
export function moneyToMinor(text: string): number {
  const minor = parseMoneyInput(text);
  if (minor === null) throw new Error('Invalid money input');
  return minor;
}
