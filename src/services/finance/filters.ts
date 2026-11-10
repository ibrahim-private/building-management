import type { Transaction, TransactionType } from '@/types';

export interface TransactionFilters {
  type?: TransactionType | 'all';
  periodId?: string | 'all';
  unitId?: string | 'all';
  from?: string;
  to?: string;
  search?: string;
}

/** Pure filter used by the treasury and records screens. */
export function filterTransactions<T extends Transaction>(
  transactions: readonly T[],
  filters: TransactionFilters,
): T[] {
  const search = filters.search?.trim().toLowerCase();
  return transactions.filter((tx) => {
    if (filters.type && filters.type !== 'all' && tx.type !== filters.type) return false;
    if (filters.periodId && filters.periodId !== 'all' && tx.periodId !== filters.periodId) return false;
    if (filters.unitId && filters.unitId !== 'all' && tx.unitId !== filters.unitId) return false;
    if (filters.from && tx.date < filters.from) return false;
    if (filters.to && tx.date > filters.to) return false;
    if (search && !tx.description.toLowerCase().includes(search)) return false;
    return true;
  });
}
