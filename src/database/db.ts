import Dexie, { type Table } from 'dexie';
import { DB_NAME } from '@/constants/app';
import type { AppSettings, Expense, FinancialPeriod, Obligation, Transaction, Unit } from '@/types';
import { applyMigrations } from './migrations';

export interface SettingsRow {
  key: string;
  value: AppSettings;
}

export class BuildingDatabase extends Dexie {
  units!: Table<Unit, string>;
  periods!: Table<FinancialPeriod, string>;
  obligations!: Table<Obligation, string>;
  expenses!: Table<Expense, string>;
  transactions!: Table<Transaction, string>;
  settings!: Table<SettingsRow, string>;

  constructor(name: string = DB_NAME) {
    super(name);
    applyMigrations(this);
  }
}

export const db = new BuildingDatabase();
