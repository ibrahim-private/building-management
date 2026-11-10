import type Dexie from 'dexie';

/**
 * Database versioning strategy
 * ----------------------------
 * - Every schema change gets a NEW `db.version(n)` block. Old blocks are never edited.
 * - Dexie only needs the stores that changed, but we repeat the full list for clarity.
 * - Data fix-ups go in `.upgrade(tx => ...)` on the new version.
 * - CURRENT_SCHEMA_VERSION in constants/app.ts must match the highest version here.
 * - Backup files carry their own format version (see services/backup) so old
 *   backups can still be imported after the schema evolves.
 *
 * Index notes:
 *  - `&` marks a unique index. Records where the indexed field is absent
 *    (e.g. an unpaid obligation has no transactionId) are simply not indexed,
 *    so uniqueness only applies to real references.
 *  - &[unitId+periodId]   -> one obligation per unit per period
 *  - &obligationId        -> one collection transaction per obligation
 *  - &expenseId           -> one payment transaction per expense
 *  - &[type+number]       -> unit numbers are unique within their type
 */
export const SCHEMA_V1 = {
  units: 'id, type, status, &[type+number]',
  periods: 'id, status, startDate, endDate',
  obligations: 'id, unitId, periodId, status, &[unitId+periodId], &transactionId',
  expenses: 'id, status, periodId, date, archived, &transactionId',
  transactions: 'id, type, date, periodId, unitId, &obligationId, &expenseId',
  settings: 'key',
} as const;

export function applyMigrations(db: Dexie): void {
  db.version(1).stores(SCHEMA_V1);

  // Example for the future:
  // db.version(2).stores({ ...SCHEMA_V1, units: 'id, type, status, floor, &[type+number]' })
  //   .upgrade(async (tx) => { await tx.table('units').toCollection().modify({ floor: null }); });
}
