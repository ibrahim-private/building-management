import { ArrowRight, CircleDollarSign, Printer, Undo2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { DatePromptDialog } from '@/components/shared/DatePromptDialog';
import { TransactionItem } from '@/components/shared/TransactionItem';
import { ArchivedBadge, PaymentBadge, PeriodBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, SectionCard } from '@/components/ui/Card';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/feedback';
import { Money, PageHeader, ProgressBar, SearchInput, SegmentedControl, TableWrap, tdClass, thClass } from '@/components/ui/misc';
import { unitLabel } from '@/constants/labels';
import { useAction } from '@/hooks/useAction';
import { usePeriodDetail } from '@/hooks/useData';
import { recordCollection, undoCollection } from '@/services/finance/collectionService';
import type { UnitCollectionRow } from '@/types';
import { formatDateRange, formatDateShort } from '@/utils/date';
import { formatMoney } from '@/utils/money';

type Tab = 'units' | 'collections' | 'expenses';
type StatusFilter = 'all' | 'paid' | 'unpaid';

export function PeriodDetailPage() {
  const { periodId = '' } = useParams();
  const detail = usePeriodDetail(periodId);
  const [tab, setTab] = useState<Tab>('units');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [search, setSearch] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [paying, setPaying] = useState<UnitCollectionRow | null>(null);
  const confirm = useConfirm();
  const { run } = useAction();

  const unitsById = useMemo(() => new Map((detail?.rows ?? []).map((r) => [r.unit.id, r.unit])), [detail]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (detail?.rows ?? []).filter(({ unit, obligation }) => {
      if (status !== 'all' && obligation.status !== status) return false;
      return !q || unit.number.toLowerCase().includes(q);
    });
  }, [detail, status, search]);

  const collections = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (detail?.collectionTransactions ?? []).filter((tx) => {
      if (from && tx.date < from) return false;
      if (to && tx.date > to) return false;
      return !q || tx.description.toLowerCase().includes(q);
    });
  }, [detail, search, from, to]);

  const expenses = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (detail?.expenses ?? []).filter((e) => {
      if (status !== 'all' && e.status !== status) return false;
      if (from && e.date < from) return false;
      if (to && e.date > to) return false;
      return !q || e.title.toLowerCase().includes(q);
    });
  }, [detail, status, search, from, to]);

  if (detail === undefined) return <LoadingState />;
  if (detail === null) {
    return <ErrorState title="هذه الفترة غير موجودة" description="ربما حُذفت بعد استعادة نسخة احتياطية." />;
  }

  const { period, summary } = detail;

  const switchTab = (next: Tab) => {
    setTab(next);
    setSearch('');
    setStatus('all');
  };

  const handleUndo = async ({ unit, obligation }: UnitCollectionRow) => {
    const ok = await confirm({
      title: 'التراجع عن تسجيل الدفع؟',
      tone: 'danger',
      confirmText: 'نعم، تراجع',
      description: `سيعود ${unitLabel(unit)} إلى "غير مدفوع" وسيُخصم ${formatMoney(obligation.amount)} من الخزينة لأن التحصيل سيُلغى.`,
    });
    if (ok) await run(() => undoCollection(obligation.id), 'تم التراجع عن الدفع');
  };

  return (
    <div className="space-y-5">
      <Link to="/records" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowRight className="h-4 w-4" aria-hidden />
        العودة إلى السجلات
      </Link>

      <PageHeader
        title={period.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <bdi className="num">{formatDateRange(period.startDate, period.endDate)}</bdi>
            <PeriodBadge status={period.status} />
          </span>
        }
        actions={
          <Link
            to={`/records/${period.id}/print`}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-primary px-4 text-base font-semibold text-white shadow-sm hover:bg-primary-hover"
          >
            <Printer className="h-5 w-5" aria-hidden />
            معاينة وطباعة الكشف
          </Link>
        }
      />

      {/* A. Financial summary */}
      <Card className="space-y-4 p-4 sm:p-5">
        <ProgressBar percent={summary.percent} />
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <div>
            <dt className="text-xs text-muted">إجمالي المطلوب</dt>
            <dd><Money value={summary.required} /></dd>
          </div>
          <div>
            <dt className="text-xs text-muted">إجمالي المحصّل</dt>
            <dd><Money value={summary.collected} className="text-success-fg" /></dd>
          </div>
          <div>
            <dt className="text-xs text-muted">المتبقي</dt>
            <dd><Money value={summary.remaining} className="text-warn-fg" /></dd>
          </div>
          <div>
            <dt className="text-xs text-muted">المصروفات المدفوعة</dt>
            <dd><Money value={detail.paidExpensesTotal} className="text-danger-fg" /></dd>
          </div>
          <div>
            <dt className="text-xs text-muted">نسبة التحصيل</dt>
            <dd className="num text-lg font-bold">{summary.percent}%</dd>
          </div>
        </dl>
      </Card>

      <SegmentedControl
        value={tab}
        onChange={switchTab}
        options={[
          { value: 'units', label: 'الوحدات', count: detail.rows.length },
          { value: 'collections', label: 'التحصيل', count: detail.collectionTransactions.length },
          { value: 'expenses', label: 'المصروفات', count: detail.expenses.length },
        ]}
      />

      {/* E. Filters */}
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        {tab !== 'collections' && (
          <SegmentedControl
            value={status}
            onChange={setStatus}
            options={[
              { value: 'all', label: 'الكل' },
              { value: 'paid', label: 'مدفوع' },
              { value: 'unpaid', label: 'غير مدفوع' },
            ]}
          />
        )}
        <SearchInput
          className="lg:w-72"
          value={search}
          onValueChange={setSearch}
          placeholder={tab === 'units' ? 'ابحث برقم الوحدة' : tab === 'expenses' ? 'ابحث في المصروفات' : 'ابحث في البيان'}
        />
        {tab !== 'units' && (
          <div className="grid grid-cols-2 gap-2 lg:flex lg:items-center">
            <label className="min-w-0 space-y-1 text-xs font-semibold text-muted">
              من تاريخ
              <input type="date" className="input-base min-w-0 text-ink" value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label className="min-w-0 space-y-1 text-xs font-semibold text-muted">
              إلى تاريخ
              <input type="date" className="input-base min-w-0 text-ink" value={to} onChange={(e) => setTo(e.target.value)} />
            </label>
          </div>
        )}
      </div>

      {/* B. Unit collection records (every unit, unpaid included, archived included) */}
      {tab === 'units' && (
        <SectionCard title="سجل تحصيل الوحدات" description="يشمل الوحدات المؤرشفة حفاظاً على التاريخ.">
          {rows.length === 0 ? (
            <EmptyState title="لا توجد وحدات مطابقة" />
          ) : (
            <>
            <ul className="space-y-2 sm:hidden">
              {rows.map((row) => (
                <li key={row.obligation.id} className="rounded-xl border border-line p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link to={`/units/${row.unit.id}`} className="font-bold text-ink hover:text-primary">
                        {unitLabel(row.unit)}
                      </Link>
                    </div>
                    <PaymentBadge status={row.obligation.status} />
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 text-sm">
                    <Money value={row.obligation.amount} />
                    {row.obligation.paidAt && (
                      <span className="text-xs text-muted">
                        دُفع في <bdi className="num">{formatDateShort(row.obligation.paidAt)}</bdi>
                      </span>
                    )}
                    {row.unit.status === 'archived' && <ArchivedBadge />}
                  </div>
                  {row.obligation.status === 'unpaid' ? (
                    <Button size="sm" className="mt-3 w-full" icon={<CircleDollarSign className="h-4 w-4" />} onClick={() => setPaying(row)}>
                      تسجيل الدفع
                    </Button>
                  ) : (
                    <Button size="sm" variant="secondary" className="mt-3 w-full" icon={<Undo2 className="h-4 w-4" />} onClick={() => void handleUndo(row)}>
                      تراجع عن الدفع
                    </Button>
                  )}
                </li>
              ))}
            </ul>
            <TableWrap className="hidden sm:block">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr>
                    <th className={thClass}>الوحدة</th>
                    <th className={thClass}>المطلوب</th>
                    <th className={thClass}>الحالة</th>
                    <th className={thClass}>تاريخ الدفع</th>
                    <th className={thClass}><span className="sr-only">إجراء</span></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.obligation.id}>
                      <td className={tdClass}>
                        <Link to={`/units/${row.unit.id}`} className="font-semibold text-ink hover:text-primary">
                          {unitLabel(row.unit)}
                        </Link>{' '}
                        {row.unit.status === 'archived' && <ArchivedBadge />}
                      </td>
                      <td className={tdClass}><Money value={row.obligation.amount} /></td>
                      <td className={tdClass}><PaymentBadge status={row.obligation.status} /></td>
                      <td className={tdClass}><bdi className="num">{formatDateShort(row.obligation.paidAt)}</bdi></td>
                      <td className={tdClass}>
                        {row.obligation.status === 'unpaid' ? (
                          <Button size="sm" icon={<CircleDollarSign className="h-4 w-4" />} onClick={() => setPaying(row)}>
                            تسجيل الدفع
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost" icon={<Undo2 className="h-4 w-4" />} onClick={() => void handleUndo(row)}>
                            تراجع
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
            </>
          )}
        </SectionCard>
      )}

      {/* C. Collection transactions */}
      {tab === 'collections' && (
        <SectionCard title="حركات التحصيل" description={`الإجمالي: ${formatMoney(collections.reduce((t, x) => t + x.amount, 0))}`}>
          {collections.length === 0 ? (
            <EmptyState title="لا توجد حركات تحصيل مطابقة" />
          ) : (
            <ul className="divide-y divide-line">
              {collections.map((tx) => (
                <li key={tx.id}>
                  <TransactionItem tx={tx} />
                  {tx.unitId && unitsById.get(tx.unitId)?.status === 'archived' && (
                    <p className="-mt-2 pb-2 text-xs text-muted">وحدة مؤرشفة</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      )}

      {/* D. Expense records (paid and unpaid, clearly distinguished) */}
      {tab === 'expenses' && (
        <SectionCard
          title="سجل المصروفات"
          description={`مدفوع: ${formatMoney(detail.paidExpensesTotal)} · غير مدفوع: ${formatMoney(detail.unpaidExpensesTotal)}`}
        >
          {expenses.length === 0 ? (
            <EmptyState title="لا توجد مصروفات مطابقة" />
          ) : (
            <>
            <ul className="space-y-2 sm:hidden">
              {expenses.map((e) => (
                <li key={e.id} className={`rounded-xl border border-line p-3 ${e.status === 'unpaid' ? 'bg-warn-bg/30' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 font-bold text-ink">{e.title}</p>
                    <PaymentBadge status={e.status} />
                  </div>
                  {e.notes && <p className="mt-1 text-xs text-muted">{e.notes}</p>}
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <Money value={e.amount} />
                    <bdi className="num text-xs text-muted">{formatDateShort(e.date)}</bdi>
                  </div>
                </li>
              ))}
            </ul>
            <TableWrap className="hidden sm:block">
              <table className="w-full min-w-[520px]">
                <thead>
                  <tr>
                    <th className={thClass}>المصروف</th>
                    <th className={thClass}>التاريخ</th>
                    <th className={thClass}>الحالة</th>
                    <th className={thClass}>المبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((e) => (
                    <tr key={e.id} className={e.status === 'unpaid' ? 'bg-warn-bg/30' : undefined}>
                      <td className={tdClass}>
                        <p className="font-semibold text-ink">{e.title}</p>
                        {e.notes && <p className="text-xs text-muted">{e.notes}</p>}
                      </td>
                      <td className={tdClass}><bdi className="num">{formatDateShort(e.date)}</bdi></td>
                      <td className={tdClass}><PaymentBadge status={e.status} /></td>
                      <td className={tdClass}><Money value={e.amount} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
            </>
          )}
        </SectionCard>
      )}

      <DatePromptDialog
        open={paying !== null}
        onClose={() => setPaying(null)}
        title="تأكيد استلام الدفعة"
        confirmLabel="تأكيد الدفع"
        description={
          paying && (
            <>
              هل استلمت <b>{formatMoney(paying.obligation.amount)}</b> من <b>{unitLabel(paying.unit)}</b> عن "{period.name}"؟
              سيُضاف المبلغ إلى الخزينة.
            </>
          )
        }
        onConfirm={async (date) => {
          if (!paying) return false;
          const result = await run(() => recordCollection(paying.obligation.id, date), 'تم تسجيل الدفع');
          return result.ok;
        }}
      />
    </div>
  );
}
