import type { DataSnapshot } from '@/types';

/**
 * Pure referential-integrity check over a full data set.
 * Used before restoring a backup, while restoring (to abort on problems)
 * and by the "check my data" button in Settings.
 * Returns human-readable Arabic problems; an empty list means the data is sound.
 */
export function checkDataIntegrity(data: DataSnapshot): string[] {
  const problems: string[] = [];
  const add = (message: string) => {
    if (problems.length < 25) problems.push(message);
  };

  const unitsById = new Map(data.units.map((u) => [u.id, u]));
  const periodsById = new Map(data.periods.map((p) => [p.id, p]));
  const obligationsById = new Map(data.obligations.map((o) => [o.id, o]));
  const expensesById = new Map(data.expenses.map((e) => [e.id, e]));
  const txById = new Map(data.transactions.map((t) => [t.id, t]));

  const duplicateIds = (label: string, ids: string[]) => {
    if (new Set(ids).size !== ids.length) add(`معرّفات مكررة في ${label}.`);
  };
  duplicateIds('الوحدات', data.units.map((x) => x.id));
  duplicateIds('الفترات', data.periods.map((x) => x.id));
  duplicateIds('الالتزامات', data.obligations.map((x) => x.id));
  duplicateIds('المصروفات', data.expenses.map((x) => x.id));
  duplicateIds('الحركات المالية', data.transactions.map((x) => x.id));

  const unitKeys = new Set<string>();
  for (const unit of data.units) {
    const key = `${unit.type}:${unit.number}`;
    if (unitKeys.has(key)) add(`رقم وحدة مكرر: ${unit.number}.`);
    unitKeys.add(key);
  }

  for (const period of data.periods) {
    if (period.endDate < period.startDate) add(`الفترة "${period.name}" تاريخ نهايتها قبل بدايتها.`);
  }

  const obligationPairs = new Set<string>();
  for (const ob of data.obligations) {
    if (!unitsById.has(ob.unitId)) add('يوجد التزام مرتبط بوحدة غير موجودة.');
    if (!periodsById.has(ob.periodId)) add('يوجد التزام مرتبط بفترة غير موجودة.');
    const pair = `${ob.unitId}:${ob.periodId}`;
    if (obligationPairs.has(pair)) add('يوجد أكثر من التزام لنفس الوحدة في نفس الفترة.');
    obligationPairs.add(pair);

    if (ob.status === 'paid') {
      const tx = ob.transactionId ? txById.get(ob.transactionId) : undefined;
      if (!tx) add('يوجد التزام مدفوع بدون حركة تحصيل مطابقة.');
      else if (tx.type !== 'collection' || tx.obligationId !== ob.id || tx.amount !== ob.amount) {
        add('حركة تحصيل لا تطابق الالتزام المرتبط بها.');
      }
    } else if (ob.transactionId) {
      add('التزام غير مدفوع لكنه مرتبط بحركة مالية.');
    }
  }

  const collectionObligationIds = new Set<string>();
  const expenseTxIds = new Set<string>();
  let openingCount = 0;
  for (const tx of data.transactions) {
    if (tx.amount <= 0) add('توجد حركة مالية مبلغها صفر.');
    if (tx.unitId && !unitsById.has(tx.unitId)) add('حركة مالية مرتبطة بوحدة غير موجودة.');
    if (tx.periodId && !periodsById.has(tx.periodId)) add('حركة مالية مرتبطة بفترة غير موجودة.');
    if (tx.type === 'opening') openingCount += 1;

    if (tx.type === 'collection') {
      const ob = tx.obligationId ? obligationsById.get(tx.obligationId) : undefined;
      if (!ob) add('حركة تحصيل بدون التزام.');
      else if (ob.transactionId !== tx.id || ob.status !== 'paid') add('حركة تحصيل لا يقابلها التزام مدفوع.');
      if (tx.obligationId) {
        if (collectionObligationIds.has(tx.obligationId)) add('تحصيل مكرر لنفس الالتزام.');
        collectionObligationIds.add(tx.obligationId);
      }
    }
    if (tx.type === 'expense') {
      const ex = tx.expenseId ? expensesById.get(tx.expenseId) : undefined;
      if (!ex) add('حركة مصروف بدون مصروف مرتبط.');
      else if (ex.transactionId !== tx.id || ex.status !== 'paid') add('حركة مصروف لا يقابلها مصروف مدفوع.');
      expenseTxIds.add(tx.id);
    }
  }
  if (openingCount > 1) add('يوجد أكثر من رصيد افتتاحي.');

  for (const ex of data.expenses) {
    if (ex.periodId && !periodsById.has(ex.periodId)) add(`المصروف "${ex.title}" مرتبط بفترة غير موجودة.`);
    if (ex.status === 'paid') {
      const tx = ex.transactionId ? txById.get(ex.transactionId) : undefined;
      if (!tx) add(`المصروف المدفوع "${ex.title}" بدون حركة مالية.`);
      else if (tx.type !== 'expense' || tx.expenseId !== ex.id || tx.amount !== ex.amount) {
        add(`حركة المصروف "${ex.title}" لا تطابقه.`);
      }
    } else if (ex.transactionId) {
      add(`المصروف غير المدفوع "${ex.title}" مرتبط بحركة مالية.`);
    }
  }

  return problems;
}
