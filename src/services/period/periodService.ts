import { repos } from '@/database/repositories';
import { runInTransaction } from '@/database/unitOfWork';
import type { FinancialPeriod, Obligation, Unit } from '@/types';
import {
  addDaysISO,
  diffDaysISO,
  isValidISODate,
  nowISO,
  rangesOverlap,
  suggestPeriodName,
  todayISO,
} from '@/utils/date';
import { AppError } from '@/utils/errors';
import { newId } from '@/utils/id';
import { sortUnits } from '@/utils/sort';

export interface PeriodFormInput {
  name: string;
  startDate: string;
  endDate: string;
  /** piastres; used for units added later and as the default for every unit now */
  defaultAmount: number;
}

export interface CreatePeriodInput extends PeriodFormInput {
  /** Per-unit overrides (unit id -> piastres). Units not listed get `defaultAmount`. */
  unitAmounts?: Record<string, number>;
  /** Make it the current period (closing the previous active one). Default true. */
  makeActive?: boolean;
  /** The administrator has seen the overlap warning and confirmed. */
  allowOverlap?: boolean;
}

function validate(input: PeriodFormInput): void {
  if (!input.name.trim()) throw new AppError('VALIDATION', 'اكتب اسم الفترة.');
  if (!isValidISODate(input.startDate) || !isValidISODate(input.endDate)) {
    throw new AppError('VALIDATION', 'تاريخ البداية أو النهاية غير صالح.');
  }
  if (input.endDate < input.startDate) {
    throw new AppError('VALIDATION', 'تاريخ النهاية يجب أن يكون بعد تاريخ البداية.');
  }
  if (!Number.isSafeInteger(input.defaultAmount) || input.defaultAmount <= 0) {
    throw new AppError('VALIDATION', 'مبلغ الاشتراك يجب أن يكون أكبر من صفر.');
  }
}

export async function findOverlappingPeriods(
  start: string,
  end: string,
  excludeId?: string,
): Promise<FinancialPeriod[]> {
  const all = await repos.periods.all();
  return all.filter((p) => p.id !== excludeId && rangesOverlap(start, end, p.startDate, p.endDate));
}

async function assertNoUnconfirmedOverlap(
  start: string,
  end: string,
  allowOverlap: boolean | undefined,
  excludeId?: string,
): Promise<void> {
  if (allowOverlap) return;
  const overlaps = await findOverlappingPeriods(start, end, excludeId);
  if (overlaps.length > 0) {
    throw new AppError('OVERLAP', `هذه الفترة تتداخل مع: ${overlaps.map((p) => p.name).join('، ')}.`);
  }
}

export interface PeriodDraft {
  name: string;
  startDate: string;
  endDate: string;
  defaultAmount: number;
  units: { unit: Unit; amount: number }[];
  previousPeriod?: FinancialPeriod;
  /** Unpaid obligations still open in older periods (informational warning). */
  openUnpaidCount: number;
}

/** Suggested values for a new period: next dates and amounts carried forward per unit. */
export async function getPeriodDraft(): Promise<PeriodDraft> {
  const [periods, units, settings, obligations] = await Promise.all([
    repos.periods.all(),
    repos.units.all(),
    repos.settings.get(),
    repos.obligations.all(),
  ]);
  const previous = [...periods].sort((a, b) => b.startDate.localeCompare(a.startDate))[0];
  const startDate = previous ? addDaysISO(previous.endDate, 1) : todayISO();
  const endDate = addDaysISO(startDate, settings.defaultDurationDays - 1);
  const previousByUnit = new Map<string, Obligation>();
  if (previous) {
    for (const ob of obligations) if (ob.periodId === previous.id) previousByUnit.set(ob.unitId, ob);
  }
  const defaultAmount = previous?.defaultAmount ?? 0;
  const activeUnits = sortUnits(units.filter((u) => u.status === 'active'));
  return {
    name: suggestPeriodName(startDate, endDate),
    startDate,
    endDate,
    defaultAmount,
    previousPeriod: previous,
    units: activeUnits.map((unit) => ({
      unit,
      amount: previousByUnit.get(unit.id)?.amount ?? defaultAmount,
    })),
    openUnpaidCount: obligations.filter((o) => o.status === 'unpaid').length,
  };
}

/**
 * Creates a NEW period and one unpaid obligation per active unit.
 * Previous periods, obligations, payments and notes are never touched
 * (except that the previous active period is marked closed).
 */
export function createPeriod(input: CreatePeriodInput): Promise<FinancialPeriod> {
  return runInTransaction(async () => {
    validate(input);
    await assertNoUnconfirmedOverlap(input.startDate, input.endDate, input.allowOverlap);

    const units = (await repos.units.all()).filter((u) => u.status === 'active');
    const overrides = input.unitAmounts ?? {};
    for (const amount of Object.values(overrides)) {
      if (!Number.isSafeInteger(amount) || amount <= 0) {
        throw new AppError('VALIDATION', 'مبلغ كل وحدة يجب أن يكون أكبر من صفر.');
      }
    }

    const makeActive = input.makeActive ?? true;
    const now = nowISO();
    if (makeActive) {
      for (const active of await repos.periods.listActive()) {
        await repos.periods.put({ ...active, status: 'closed', updatedAt: now });
      }
    }

    const period: FinancialPeriod = {
      id: newId(),
      name: input.name.trim(),
      startDate: input.startDate,
      endDate: input.endDate,
      status: makeActive ? 'active' : 'closed',
      defaultAmount: input.defaultAmount,
      createdAt: now,
      updatedAt: now,
    };
    await repos.periods.add(period);

    await repos.obligations.bulkAdd(
      units.map<Obligation>((unit) => ({
        id: newId(),
        unitId: unit.id,
        periodId: period.id,
        amount: overrides[unit.id] ?? input.defaultAmount,
        status: 'unpaid',
        periodNote: '',
        createdAt: now,
        updatedAt: now,
      })),
    );
    return period;
  });
}

/** Closed periods stay editable; editing never rewrites obligations or payments. */
export function updatePeriod(
  id: string,
  input: PeriodFormInput & { allowOverlap?: boolean },
): Promise<FinancialPeriod> {
  return runInTransaction(async () => {
    validate(input);
    const period = await repos.periods.get(id);
    if (!period) throw new AppError('NOT_FOUND', 'هذه الفترة غير موجودة.');
    await assertNoUnconfirmedOverlap(input.startDate, input.endDate, input.allowOverlap, id);
    const next: FinancialPeriod = {
      ...period,
      name: input.name.trim(),
      startDate: input.startDate,
      endDate: input.endDate,
      defaultAmount: input.defaultAmount,
      updatedAt: nowISO(),
    };
    await repos.periods.put(next);
    return next;
  });
}

export function closePeriod(id: string): Promise<void> {
  return runInTransaction(async () => {
    const period = await repos.periods.get(id);
    if (!period) throw new AppError('NOT_FOUND', 'هذه الفترة غير موجودة.');
    if (period.status === 'closed') return;
    await repos.periods.put({ ...period, status: 'closed', updatedAt: nowISO() });
  });
}

/** Makes a period the current one; any other active period is closed (only one is active). */
export function activatePeriod(id: string): Promise<void> {
  return runInTransaction(async () => {
    const period = await repos.periods.get(id);
    if (!period) throw new AppError('NOT_FOUND', 'هذه الفترة غير موجودة.');
    const now = nowISO();
    for (const active of await repos.periods.listActive()) {
      if (active.id !== id) await repos.periods.put({ ...active, status: 'closed', updatedAt: now });
    }
    if (period.status !== 'active') await repos.periods.put({ ...period, status: 'active', updatedAt: now });
  });
}

export async function countUnpaidInPeriod(periodId: string): Promise<number> {
  const obligations = await repos.obligations.byPeriod(periodId);
  return obligations.filter((o) => o.status === 'unpaid').length;
}

/**
 * Optional automatic creation. Predictable and safe:
 *  - runs only when the setting is on and the ACTIVE period has already ended;
 *  - creates at most ONE period per app start, beginning the day after the previous one ends;
 *  - length = default duration setting; each active unit keeps the amount it owed last period;
 *  - closes the previous period but never edits or deletes any data;
 *  - flags the new period for review (a banner on the dashboard) until the administrator confirms.
 */
export function runAutoPeriodCreation(today: string = todayISO()): Promise<FinancialPeriod | null> {
  return runInTransaction(async () => {
    const settings = await repos.settings.get();
    if (!settings.setupCompleted || !settings.autoCreatePeriods) return null;

    const active = await repos.periods.getActive();
    if (!active || active.endDate >= today) return null;

    const startDate = addDaysISO(active.endDate, 1);
    const periods = await repos.periods.all();
    // Something already starts on/after that day (manual or earlier auto run): do nothing.
    if (periods.some((p) => p.startDate >= startDate)) return null;

    const endDate = addDaysISO(startDate, Math.max(1, settings.defaultDurationDays) - 1);
    const [units, previousObligations] = await Promise.all([
      repos.units.all(),
      repos.obligations.byPeriod(active.id),
    ]);
    const previousAmount = new Map(previousObligations.map((o) => [o.unitId, o.amount]));

    const now = nowISO();
    await repos.periods.put({ ...active, status: 'closed', updatedAt: now });
    const period: FinancialPeriod = {
      id: newId(),
      name: suggestPeriodName(startDate, endDate),
      startDate,
      endDate,
      status: 'active',
      defaultAmount: active.defaultAmount,
      createdAt: now,
      updatedAt: now,
    };
    await repos.periods.add(period);
    await repos.obligations.bulkAdd(
      units
        .filter((u) => u.status === 'active')
        .map<Obligation>((unit) => ({
          id: newId(),
          unitId: unit.id,
          periodId: period.id,
          amount: previousAmount.get(unit.id) ?? active.defaultAmount,
          status: 'unpaid',
          periodNote: '',
          createdAt: now,
          updatedAt: now,
        })),
    );
    await repos.settings.save({ ...settings, pendingReviewPeriodId: period.id });
    return period;
  });
}

/** Length in days (inclusive) of a period. */
export function periodLengthDays(period: Pick<FinancialPeriod, 'startDate' | 'endDate'>): number {
  return diffDaysISO(period.startDate, period.endDate) + 1;
}
