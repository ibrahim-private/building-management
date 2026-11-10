import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/database/db';
import { repos } from '@/database/repositories';
import { createBackup, parseBackup, restoreBackup } from '../backup/backupService';
import { checkDataIntegrity } from '../backup/integrity';
import { readCurrentSnapshot } from '../backup/backupService';
import { createPeriod, runAutoPeriodCreation, updatePeriod } from '../period/periodService';
import { setObligationAmount } from '../period/obligationService';
import { completeSetup } from '../settings/setupService';
import { updateSettings } from '../settings/settingsService';
import { createUnit, archiveUnit } from '../units/unitService';
import { recordCollection, undoCollection } from './collectionService';
import { createExpense, payExpense, undoExpensePayment } from './expenseService';
import { addManualAdjustment, getBalance } from './treasuryService';

async function reset() {
  await Promise.all([
    db.units.clear(), db.periods.clear(), db.obligations.clear(),
    db.expenses.clear(), db.transactions.clear(), db.settings.clear(),
  ]);
}

async function seed() {
  await completeSetup(100000, '2026-09-01'); // 1,000.00
  const apt1 = await createUnit({ type: 'apartment', number: '1', name: 'أحمد', notes: '' });
  const shop = await createUnit({ type: 'facility', number: '1', name: 'صيدلية', notes: '' });
  const period = await createPeriod({
    name: 'سبتمبر – أكتوبر 2026',
    startDate: '2026-09-01',
    endDate: '2026-10-31',
    defaultAmount: 15000,
  });
  const obs = await repos.obligations.byPeriod(period.id);
  const obApt = obs.find((o) => o.unitId === apt1.id)!;
  const obShop = obs.find((o) => o.unitId === shop.id)!;
  return { apt1, shop, period, obApt, obShop };
}

beforeEach(reset);

describe('collections', () => {
  it('records a payment atomically and updates the treasury', async () => {
    const { obApt } = await seed();
    await recordCollection(obApt.id, '2026-09-05');
    expect(await getBalance()).toBe(115000);
    const updated = (await repos.obligations.get(obApt.id))!;
    expect(updated.status).toBe('paid');
    expect(updated.transactionId).toBeTruthy();
  });

  it('rejects a duplicate payment (double tap) without a second transaction', async () => {
    const { obApt } = await seed();
    await recordCollection(obApt.id, '2026-09-05');
    await expect(recordCollection(obApt.id, '2026-09-05')).rejects.toMatchObject({ code: 'ALREADY_PAID' });
    expect((await repos.transactions.all()).filter((t) => t.type === 'collection')).toHaveLength(1);
  });

  it('undo restores unpaid status and the balance, and cannot run twice', async () => {
    const { obApt } = await seed();
    await recordCollection(obApt.id, '2026-09-05');
    await undoCollection(obApt.id);
    expect(await getBalance()).toBe(100000);
    const updated = (await repos.obligations.get(obApt.id))!;
    expect(updated.status).toBe('unpaid');
    expect(updated.transactionId).toBeUndefined();
    await expect(undoCollection(obApt.id)).rejects.toMatchObject({ code: 'NOT_PAID' });
    expect(await getBalance()).toBe(100000);
  });

  it('can be paid again after an undo', async () => {
    const { obApt } = await seed();
    await recordCollection(obApt.id, '2026-09-05');
    await undoCollection(obApt.id);
    await recordCollection(obApt.id, '2026-09-06');
    expect(await getBalance()).toBe(115000);
  });

  it('does not change the amount of a paid obligation', async () => {
    const { obApt } = await seed();
    await recordCollection(obApt.id, '2026-09-05');
    await expect(setObligationAmount(obApt.id, 20000)).rejects.toMatchObject({ code: 'VALIDATION' });
  });
});

describe('expenses', () => {
  it('does not affect the treasury until paid, then deducts and can be undone', async () => {
    const { period } = await seed();
    const expense = await createExpense({ title: 'كهرباء السلم', amount: 30000, notes: '', date: '2026-09-10', periodId: null });
    expect(expense.periodId).toBe(period.id); // auto-assigned from the date
    expect(await getBalance()).toBe(100000);

    await payExpense(expense.id, '2026-09-11');
    expect(await getBalance()).toBe(70000);
    await expect(payExpense(expense.id, '2026-09-11')).rejects.toMatchObject({ code: 'ALREADY_PAID' });

    await undoExpensePayment(expense.id);
    expect(await getBalance()).toBe(100000);
    expect((await repos.expenses.get(expense.id))!.status).toBe('unpaid');
  });

  it('refuses to pay more than the available treasury balance', async () => {
    await seed();
    const expense = await createExpense({ title: 'مصعد', amount: 500000, notes: '', date: '2026-09-10', periodId: null });
    await expect(payExpense(expense.id, '2026-09-11')).rejects.toMatchObject({ code: 'INSUFFICIENT_FUNDS' });
    expect(await getBalance()).toBe(100000);
  });

  it('asks for a period when the date is outside every period', async () => {
    await seed();
    await expect(
      createExpense({ title: 'قديم', amount: 1000, notes: '', date: '2025-01-01', periodId: null }),
    ).rejects.toMatchObject({ code: 'PERIOD_REQUIRED' });
  });
});

describe('treasury', () => {
  it('blocks a manual deduction larger than the balance', async () => {
    await seed();
    await expect(
      addManualAdjustment({ direction: 'out', amount: 999999, date: '2026-09-02', reason: 'تجربة' }),
    ).rejects.toMatchObject({ code: 'INSUFFICIENT_FUNDS' });
  });
});

describe('periods', () => {
  it('creates a new period without touching the old one', async () => {
    const { obApt, period } = await seed();
    await recordCollection(obApt.id, '2026-09-05');
    const next = await createPeriod({
      name: 'نوفمبر – ديسمبر 2026',
      startDate: '2026-11-01',
      endDate: '2026-12-31',
      defaultAmount: 20000,
    });
    // old data intact
    expect((await repos.obligations.get(obApt.id))!.status).toBe('paid');
    expect((await repos.periods.get(period.id))!.status).toBe('closed');
    // new obligations all unpaid with the new amount
    const fresh = await repos.obligations.byPeriod(next.id);
    expect(fresh).toHaveLength(2);
    expect(fresh.every((o) => o.status === 'unpaid' && o.amount === 20000)).toBe(true);
    // balance is cumulative
    expect(await getBalance()).toBe(115000);
  });

  it('requires confirmation for overlapping periods', async () => {
    await seed();
    const input = { name: 'متداخلة', startDate: '2026-10-15', endDate: '2026-11-15', defaultAmount: 10000 };
    await expect(createPeriod(input)).rejects.toMatchObject({ code: 'OVERLAP' });
    await expect(createPeriod({ ...input, allowOverlap: true })).resolves.toBeTruthy();
  });

  it('keeps closed periods editable', async () => {
    const { period } = await seed();
    const updated = await updatePeriod(period.id, {
      name: 'معدلة', startDate: period.startDate, endDate: period.endDate, defaultAmount: period.defaultAmount,
    });
    expect(updated.name).toBe('معدلة');
  });

  it('auto-creates exactly one safe period when enabled and the active one has ended', async () => {
    const { period, obApt } = await seed();
    await recordCollection(obApt.id, '2026-09-05');
    await updateSettings({ autoCreatePeriods: true, defaultDurationDays: 60 });

    expect(await runAutoPeriodCreation('2026-10-15')).toBeNull(); // not ended yet
    const created = await runAutoPeriodCreation('2026-11-05');
    expect(created).not.toBeNull();
    expect(created!.startDate).toBe('2026-11-01');
    expect(await runAutoPeriodCreation('2026-11-06')).toBeNull(); // no duplicates
    expect((await repos.periods.get(period.id))!.status).toBe('closed');
    expect((await repos.settings.get()).pendingReviewPeriodId).toBe(created!.id);
  });
});

describe('units', () => {
  it('archiving keeps history and drops only the unpaid current obligation', async () => {
    const { apt1, shop, obApt, period } = await seed();
    await recordCollection(obApt.id, '2026-09-05');
    await archiveUnit(apt1.id); // paid: kept
    await archiveUnit(shop.id); // unpaid: dropped from the active period
    const remaining = await repos.obligations.byPeriod(period.id);
    expect(remaining.map((o) => o.unitId)).toEqual([apt1.id]);
    expect(await getBalance()).toBe(115000);
  });

  it('rejects a duplicate number within the same type but allows it across types', async () => {
    await seed();
    await expect(createUnit({ type: 'apartment', number: '1', name: '', notes: '' })).rejects.toMatchObject({ code: 'DUPLICATE' });
    await expect(createUnit({ type: 'facility', number: '2', name: '', notes: '' })).resolves.toBeTruthy();
  });
});

describe('backup and restore', () => {
  it('round-trips and verifies relationships', async () => {
    const { obApt } = await seed();
    await recordCollection(obApt.id, '2026-09-05');
    const { blob } = await createBackup();
    const backup = parseBackup(await blob.text());

    await reset();
    await restoreBackup(backup);
    expect(await getBalance()).toBe(115000);
    expect(checkDataIntegrity(await readCurrentSnapshot())).toEqual([]);
  });

  it('rejects invalid and tampered files without touching data', async () => {
    const { obApt } = await seed();
    await recordCollection(obApt.id, '2026-09-05');
    expect(() => parseBackup('not json')).toThrow();
    expect(() => parseBackup('{"format":"other"}')).toThrow();

    const { blob } = await createBackup();
    const json = JSON.parse(await blob.text());
    json.data.transactions = []; // paid obligation now has no transaction
    json.counts.transactions = 0;
    expect(() => parseBackup(JSON.stringify(json))).toThrow();
    expect(await getBalance()).toBe(115000);
  });
});
