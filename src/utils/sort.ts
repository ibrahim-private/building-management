import type { Transaction, Unit } from '@/types';

const collator = new Intl.Collator('ar', { numeric: true, sensitivity: 'base' });

/** Facilities first, then apartments; numeric-aware by unit number. */
export function sortUnits<T extends { type: Unit['type']; number: string }>(units: readonly T[]): T[] {
  const rank = (t: Unit['type']) => (t === 'facility' ? 0 : 1);
  return [...units].sort((a, b) => rank(a.type) - rank(b.type) || collator.compare(a.number, b.number));
}

/** Newest first (by date, then by creation time). */
export function sortTransactionsDesc<T extends Transaction>(txs: readonly T[]): T[] {
  return [...txs].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
}

/** Oldest first; opening balance always leads for the same date. */
export function sortTransactionsAsc<T extends Transaction>(txs: readonly T[]): T[] {
  const openingFirst = (t: Transaction) => (t.type === 'opening' ? 0 : 1);
  return [...txs].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      openingFirst(a) - openingFirst(b) ||
      a.createdAt.localeCompare(b.createdAt),
  );
}
