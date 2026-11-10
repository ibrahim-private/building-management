import { repos } from '@/database/repositories';
import { runInTransaction } from '@/database/unitOfWork';
import { recordOpeningBalance } from '../finance/treasuryService';
import { AppError } from '@/utils/errors';

/** First-run setup: records the existing treasury balance and marks setup as done. */
export function completeSetup(openingBalance: number, date: string): Promise<void> {
  return runInTransaction(async () => {
    const settings = await repos.settings.get();
    if (settings.setupCompleted) {
      throw new AppError('DUPLICATE', 'تم إعداد التطبيق من قبل.');
    }
    await recordOpeningBalance(openingBalance, date);
    await repos.settings.save({ ...settings, setupCompleted: true });
  });
}
