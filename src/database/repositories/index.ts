import { expensesRepository } from './expensesRepository';
import { obligationsRepository } from './obligationsRepository';
import { periodsRepository } from './periodsRepository';
import { settingsRepository } from './settingsRepository';
import { transactionsRepository } from './transactionsRepository';
import { unitsRepository } from './unitsRepository';

/**
 * The only door to persistence. Services depend on this object, never on Dexie
 * directly, so a remote backend (Firebase / Supabase) can later provide the same
 * methods without touching services or UI.
 */
export const repos = {
  units: unitsRepository,
  periods: periodsRepository,
  obligations: obligationsRepository,
  expenses: expensesRepository,
  transactions: transactionsRepository,
  settings: settingsRepository,
};

export type Repositories = typeof repos;
