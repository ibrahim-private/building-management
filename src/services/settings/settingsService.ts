import { repos } from '@/database/repositories';
import { runInTransaction } from '@/database/unitOfWork';
import type { AppSettings } from '@/types';
import { appSettingsSchema } from '@/types';
import { AppError } from '@/utils/errors';

export function getSettings(): Promise<AppSettings> {
  return repos.settings.get();
}

export function updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  return runInTransaction(async () => {
    const current = await repos.settings.get();
    const parsed = appSettingsSchema.safeParse({ ...current, ...patch });
    if (!parsed.success) {
      throw new AppError('VALIDATION', 'قيمة الإعدادات غير صالحة.');
    }
    await repos.settings.save(parsed.data);
    return parsed.data;
  });
}
