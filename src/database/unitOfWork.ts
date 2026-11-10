import { db } from './db';

/**
 * Runs `work` inside one atomic read/write transaction over every table.
 * If anything throws (or the tab is closed mid-way) nothing is committed,
 * so related financial records can never be left half-written.
 *
 * Repository calls made inside `work` automatically join this transaction.
 * When replacing IndexedDB with a remote backend, this is the single place
 * to swap in that backend's transaction mechanism.
 */
export function runInTransaction<T>(work: () => Promise<T>): Promise<T> {
  return db.transaction(
    'rw',
    [db.units, db.periods, db.obligations, db.expenses, db.transactions, db.settings],
    work,
  );
}
