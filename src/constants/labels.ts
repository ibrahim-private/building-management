import type { PaymentStatus, PeriodStatus, TransactionType, Unit, UnitType } from '@/types';

export const UNIT_TYPE_LABEL: Record<UnitType, string> = {
  facility: 'منشأة تجارية',
  apartment: 'شقة',
};

export const UNIT_TYPE_GROUP_LABEL: Record<UnitType, string> = {
  facility: 'المنشآت التجارية',
  apartment: 'الشقق السكنية',
};

const UNIT_TYPE_SHORT: Record<UnitType, string> = {
  facility: 'محل',
  apartment: 'شقة',
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  paid: 'مدفوع',
  unpaid: 'غير مدفوع',
};

export const PERIOD_STATUS_LABEL: Record<PeriodStatus, string> = {
  active: 'نشطة',
  closed: 'مغلقة',
};

export const TRANSACTION_TYPE_LABEL: Record<TransactionType, string> = {
  opening: 'رصيد افتتاحي',
  collection: 'تحصيل',
  expense: 'مصروف',
  manual_in: 'إضافة يدوية',
  manual_out: 'خصم يدوي',
};

/** Money direction for each transaction type. */
export const TRANSACTION_DIRECTION: Record<TransactionType, 'in' | 'out'> = {
  opening: 'in',
  collection: 'in',
  expense: 'out',
  manual_in: 'in',
  manual_out: 'out',
};

/** "محل 3" / "شقة 12" */
export function unitLabel(unit: Pick<Unit, 'type' | 'number'>): string {
  return `${UNIT_TYPE_SHORT[unit.type]} ${unit.number}`;
}

/** "شقة 3 - أحمد علي" (name omitted when empty) */
export function unitFullLabel(unit: Pick<Unit, 'type' | 'number' | 'name'>): string {
  return unit.name.trim() ? `${unitLabel(unit)} - ${unit.name.trim()}` : unitLabel(unit);
}
