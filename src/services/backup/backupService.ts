import { z } from 'zod';
import { BACKUP_FORMAT, CURRENT_BACKUP_VERSION, CURRENT_SCHEMA_VERSION } from '@/constants/app';
import { db } from '@/database/db';
import { repos } from '@/database/repositories';
import { runInTransaction } from '@/database/unitOfWork';
import { dataSnapshotSchema, type DataSnapshot } from '@/types';
import { nowISO, todayISO } from '@/utils/date';
import { AppError } from '@/utils/errors';
import { checkDataIntegrity } from './integrity';

/**
 * Backup file layout (versioned):
 * {
 *   format: "building-backup",
 *   version: 1,                // backup layout version
 *   schemaVersion: 1,          // IndexedDB schema version it was exported from
 *   exportedAt: ISO timestamp,
 *   counts: { units, periods, obligations, expenses, transactions },
 *   data: { units, periods, obligations, expenses, transactions, settings }
 * }
 */
const countsSchema = z.object({
  units: z.number(),
  periods: z.number(),
  obligations: z.number(),
  expenses: z.number(),
  transactions: z.number(),
});

const backupFileSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  version: z.number().int().positive(),
  schemaVersion: z.number().int().positive().optional(),
  exportedAt: z.string(),
  counts: countsSchema,
  data: z.unknown(),
});

export interface BackupFile {
  format: typeof BACKUP_FORMAT;
  version: number;
  schemaVersion: number;
  exportedAt: string;
  counts: z.infer<typeof countsSchema>;
  data: DataSnapshot;
}

export async function readCurrentSnapshot(): Promise<DataSnapshot> {
  const [units, periods, obligations, expenses, transactions, settings] = await Promise.all([
    repos.units.all(),
    repos.periods.all(),
    repos.obligations.all(),
    repos.expenses.all(),
    repos.transactions.all(),
    repos.settings.get(),
  ]);
  return { units, periods, obligations, expenses, transactions, settings };
}

function countsOf(data: DataSnapshot) {
  return {
    units: data.units.length,
    periods: data.periods.length,
    obligations: data.obligations.length,
    expenses: data.expenses.length,
    transactions: data.transactions.length,
  };
}

/** Builds the full JSON backup as a Blob with a descriptive file name. */
export async function createBackup(): Promise<{ blob: Blob; filename: string; counts: BackupFile['counts'] }> {
  // Read everything in ONE read transaction so the backup is a consistent snapshot.
  const data = await db.transaction(
    'r',
    [db.units, db.periods, db.obligations, db.expenses, db.transactions, db.settings],
    readCurrentSnapshot,
  );
  const file: BackupFile = {
    format: BACKUP_FORMAT,
    version: CURRENT_BACKUP_VERSION,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: nowISO(),
    counts: countsOf(data),
    data,
  };
  return {
    blob: new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' }),
    filename: `building-backup-${todayISO()}.json`,
    counts: file.counts,
  };
}

/**
 * Upgrades older backup layouts to the current one.
 * Add a step per version bump, e.g. `if (version === 1) { raw = upgradeV1toV2(raw); version = 2; }`
 */
function migrateBackup(raw: unknown, version: number): unknown {
  let current = raw;
  // No older layouts exist yet.
  void version;
  return current;
}

/**
 * Reads, validates and cross-checks a backup. Throws AppError('INVALID_BACKUP')
 * with a clear Arabic message when the file cannot be trusted. Does NOT touch the database.
 */
export function parseBackup(text: string): BackupFile {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new AppError('INVALID_BACKUP', 'الملف ليس نسخة احتياطية صالحة (تعذرت قراءة محتواه).');
  }

  const header = backupFileSchema.safeParse(json);
  if (!header.success) {
    throw new AppError('INVALID_BACKUP', 'هذا الملف ليس نسخة احتياطية من هذا التطبيق.');
  }
  if (header.data.version > CURRENT_BACKUP_VERSION) {
    throw new AppError(
      'INVALID_BACKUP',
      'هذه النسخة أُنشئت بإصدار أحدث من التطبيق. حدّث التطبيق ثم أعد المحاولة.',
    );
  }

  const migrated = migrateBackup(header.data.data, header.data.version);
  const data = dataSnapshotSchema.safeParse(migrated);
  if (!data.success) {
    throw new AppError('INVALID_BACKUP', 'بيانات النسخة الاحتياطية ناقصة أو تالفة.');
  }

  const counts = countsOf(data.data);
  const declared = header.data.counts;
  if (
    counts.units !== declared.units ||
    counts.periods !== declared.periods ||
    counts.obligations !== declared.obligations ||
    counts.expenses !== declared.expenses ||
    counts.transactions !== declared.transactions
  ) {
    throw new AppError('INVALID_BACKUP', 'عدد السجلات في الملف لا يطابق المعلن عنه، قد يكون الملف تالفاً.');
  }

  const problems = checkDataIntegrity(data.data);
  if (problems.length > 0) {
    throw new AppError('INVALID_BACKUP', `العلاقات بين البيانات غير سليمة:\n- ${problems.join('\n- ')}`);
  }

  return {
    format: BACKUP_FORMAT,
    version: header.data.version,
    schemaVersion: header.data.schemaVersion ?? CURRENT_SCHEMA_VERSION,
    exportedAt: header.data.exportedAt,
    counts,
    data: data.data,
  };
}

/**
 * Replaces ALL local data with the backup, atomically. After writing, the data is read
 * back and re-verified INSIDE the same transaction; if anything is off the whole
 * restore is rolled back and the current data stays untouched.
 */
export function restoreBackup(backup: BackupFile): Promise<void> {
  return runInTransaction(async () => {
    const { data } = backup;
    await Promise.all([
      db.units.clear(),
      db.periods.clear(),
      db.obligations.clear(),
      db.expenses.clear(),
      db.transactions.clear(),
      db.settings.clear(),
    ]);
    await db.units.bulkAdd(data.units);
    await db.periods.bulkAdd(data.periods);
    await db.obligations.bulkAdd(data.obligations);
    await db.expenses.bulkAdd(data.expenses);
    await db.transactions.bulkAdd(data.transactions);
    await repos.settings.save(data.settings);

    const restored = await readCurrentSnapshot();
    const counts = countsOf(restored);
    const expected = countsOf(data);
    const sameCounts = (Object.keys(expected) as (keyof typeof expected)[]).every(
      (key) => counts[key] === expected[key],
    );
    const problems = checkDataIntegrity(restored);
    if (!sameCounts || problems.length > 0) {
      throw new AppError('INVALID_BACKUP', 'فشل التحقق من البيانات بعد الاستعادة. لم يتم تغيير أي شيء.');
    }
  });
}

/** Integrity report of the data currently on this device. */
export async function checkCurrentData(): Promise<string[]> {
  return checkDataIntegrity(await readCurrentSnapshot());
}
