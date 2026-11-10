import { db } from '../db';
import { DEFAULT_SETTINGS, SETTINGS_KEY } from '@/constants/app';
import type { AppSettings } from '@/types';

export const settingsRepository = {
  /** Always returns a complete settings object (defaults fill any gaps). */
  get: async (): Promise<AppSettings> => {
    const row = await db.settings.get(SETTINGS_KEY);
    return { ...DEFAULT_SETTINGS, ...(row?.value ?? {}) };
  },
  save: async (settings: AppSettings): Promise<void> => {
    await db.settings.put({ key: SETTINGS_KEY, value: settings });
  },
};
