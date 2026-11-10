import type { AppSettings } from '@/types';

export const APP_NAME = 'إدارة العمارة';
export const DB_NAME = 'building-manager';

/** Bump when the IndexedDB schema changes (and add a migration). */
export const CURRENT_SCHEMA_VERSION = 1;

/** Bump when the backup file layout changes (and add a step in migrateBackup). */
export const BACKUP_FORMAT = 'building-backup';
export const CURRENT_BACKUP_VERSION = 1;

export const SETTINGS_KEY = 'app';

export const DEFAULT_SETTINGS: AppSettings = {
  setupCompleted: false,
  theme: 'light',
  primaryColor: 'emerald',
  defaultDurationDays: 60,
  autoCreatePeriods: false,
  pendingReviewPeriodId: null,
};

export const PRIMARY_COLOR_OPTIONS: { value: AppSettings['primaryColor']; label: string; swatch: string }[] = [
  { value: 'emerald', label: 'أخضر', swatch: '#059669' },
  { value: 'teal', label: 'تركواز', swatch: '#0d9488' },
  { value: 'blue', label: 'أزرق', swatch: '#2563eb' },
  { value: 'violet', label: 'بنفسجي', swatch: '#7c3aed' },
];
