import { repos } from '@/database/repositories';
import { runInTransaction } from '@/database/unitOfWork';
import type { Unit, UnitType } from '@/types';
import { nowISO } from '@/utils/date';
import { AppError } from '@/utils/errors';
import { newId } from '@/utils/id';
import { unitLabel } from '@/constants/labels';
import { ensureObligation } from '../period/obligationService';

export interface UnitInput {
  type: UnitType;
  number: string;
  name: string;
  notes: string;
}

const MAX_BULK = 200;

function normalizeNumber(raw: string): string {
  const number = raw.trim();
  if (!number) throw new AppError('VALIDATION', 'اكتب رقم الوحدة.');
  if (number.length > 20) throw new AppError('VALIDATION', 'رقم الوحدة طويل جداً.');
  return number;
}

async function assertNumberAvailable(type: UnitType, number: string, ignoreId?: string): Promise<void> {
  const existing = await repos.units.findByTypeAndNumber(type, number);
  if (existing && existing.id !== ignoreId) {
    throw new AppError('DUPLICATE', `${unitLabel({ type, number })} مسجل بالفعل. اختر رقماً آخر.`);
  }
}

/** A unit added while a period is active immediately receives that period's obligation. */
async function attachToActivePeriod(unit: Unit): Promise<void> {
  const active = await repos.periods.getActive();
  if (active) await ensureObligation(unit, active);
}

function buildUnit(type: UnitType, number: string, name: string, notes: string): Unit {
  const now = nowISO();
  return { id: newId(), type, number, name: name.trim(), notes: notes.trim(), status: 'active', createdAt: now, updatedAt: now };
}

export function createUnit(input: UnitInput): Promise<Unit> {
  return runInTransaction(async () => {
    const number = normalizeNumber(input.number);
    await assertNumberAvailable(input.type, number);
    const unit = buildUnit(input.type, number, input.name, input.notes);
    await repos.units.add(unit);
    await attachToActivePeriod(unit);
    return unit;
  });
}

/** Adds `quantity` units numbered firstNumber, firstNumber+1, ... (names can be filled in later). */
export function createUnitsBulk(type: UnitType, quantity: number, firstNumber: number): Promise<Unit[]> {
  return runInTransaction(async () => {
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_BULK) {
      throw new AppError('VALIDATION', `الكمية يجب أن تكون بين 1 و ${MAX_BULK}.`);
    }
    if (!Number.isInteger(firstNumber) || firstNumber < 0) {
      throw new AppError('VALIDATION', 'رقم البداية يجب أن يكون رقماً صحيحاً.');
    }
    const created: Unit[] = [];
    for (let i = 0; i < quantity; i += 1) {
      const number = String(firstNumber + i);
      await assertNumberAvailable(type, number);
      const unit = buildUnit(type, number, '', '');
      await repos.units.add(unit);
      await attachToActivePeriod(unit);
      created.push(unit);
    }
    return created;
  });
}

/** The unit type is fixed once created; number, name and permanent notes can change. */
export function updateUnit(id: string, input: Omit<UnitInput, 'type'>): Promise<Unit> {
  return runInTransaction(async () => {
    const unit = await repos.units.get(id);
    if (!unit) throw new AppError('NOT_FOUND', 'هذه الوحدة غير موجودة.');
    const number = normalizeNumber(input.number);
    await assertNumberAvailable(unit.type, number, unit.id);
    const next: Unit = { ...unit, number, name: input.name.trim(), notes: input.notes.trim(), updatedAt: nowISO() };
    await repos.units.put(next);
    return next;
  });
}

/**
 * Archiving hides the unit from active lists. Every payment, transaction and
 * historical obligation stays. Only an UNPAID obligation of the current period is
 * dropped (so the unit stops counting as owing); paid ones are never touched.
 */
export function archiveUnit(id: string): Promise<void> {
  return runInTransaction(async () => {
    const unit = await repos.units.get(id);
    if (!unit) throw new AppError('NOT_FOUND', 'هذه الوحدة غير موجودة.');
    if (unit.status === 'archived') return;
    await repos.units.put({ ...unit, status: 'archived', updatedAt: nowISO() });

    const active = await repos.periods.getActive();
    if (active) {
      const obligation = await repos.obligations.getByUnitAndPeriod(unit.id, active.id);
      if (obligation && obligation.status === 'unpaid') {
        await repos.obligations.remove(obligation.id);
      }
    }
  });
}

export function restoreUnit(id: string): Promise<void> {
  return runInTransaction(async () => {
    const unit = await repos.units.get(id);
    if (!unit) throw new AppError('NOT_FOUND', 'هذه الوحدة غير موجودة.');
    if (unit.status === 'active') return;
    const next: Unit = { ...unit, status: 'active', updatedAt: nowISO() };
    await repos.units.put(next);
    await attachToActivePeriod(next);
  });
}
