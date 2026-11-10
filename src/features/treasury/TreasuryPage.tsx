import { ArrowDownLeft, ArrowUpRight, Plus, Trash2, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ExportPdfButton } from '@/components/shared/ExportPdfButton';
import { TransactionItem } from '@/components/shared/TransactionItem';
import { Button } from '@/components/ui/Button';
import { Card, SectionCard } from '@/components/ui/Card';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { EmptyState, LoadingState } from '@/components/ui/feedback';
import { Money, PageHeader, SearchInput, StatCard } from '@/components/ui/misc';
import { TRANSACTION_TYPE_LABEL } from '@/constants/labels';
import { useAction } from '@/hooks/useAction';
import { useTreasuryOverview } from '@/hooks/useData';
import { summarizeTransactions } from '@/services/finance/calculations';
import { filterTransactions, type TransactionFilters } from '@/services/finance/filters';
import { exportTreasuryPdf } from '@/services/pdf/exportReports';
import { removeManualAdjustment } from '@/services/finance/treasuryService';
import type { TransactionType } from '@/types';
import { sortTransactionsDesc } from '@/utils/sort';
import { ManualAdjustmentModal } from './ManualAdjustmentModal';

const TYPES = Object.keys(TRANSACTION_TYPE_LABEL) as TransactionType[];

export function TreasuryPage() {
  const overview = useTreasuryOverview();
  const [filters, setFilters] = useState<TransactionFilters>({ type: 'all', periodId: 'all' });
  const [adjusting, setAdjusting] = useState(false);
  const confirm = useConfirm();
  const { run } = useAction();

  const visible = useMemo(
    () => sortTransactionsDesc(filterTransactions(overview?.transactions ?? [], filters)),
    [overview, filters],
  );

  if (!overview) return <LoadingState />;

  const shown = summarizeTransactions(visible);
  const income = shown.opening + shown.collections + shown.manualIn;
  const outgoing = shown.paidExpenses + shown.manualOut;
  const isFiltered =
    filters.type !== 'all' || filters.periodId !== 'all' || Boolean(filters.from || filters.to || filters.search);
  const set = (patch: Partial<TransactionFilters>) => setFilters((f) => ({ ...f, ...patch }));

  const handleRemove = async (id: string) => {
    const ok = await confirm({
      title: 'حذف هذا التعديل اليدوي؟',
      tone: 'danger',
      confirmText: 'حذف',
      description: 'سيُعاد حساب رصيد الخزينة بدون هذه الحركة.',
    });
    if (ok) await run(() => removeManualAdjustment(id), 'تم حذف التعديل');
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="الخزينة"
        description="الرصيد تراكمي ولا يُصفَّر عند بدء فترة جديدة."
        actions={
          <>
            <ExportPdfButton label="تقرير PDF" onExport={() => exportTreasuryPdf(filters)} />
            <Button icon={<Plus className="h-5 w-5" />} onClick={() => setAdjusting(true)}>
              تعديل يدوي
            </Button>
          </>
        }
      />

      <section
        aria-label="رصيد الخزينة"
        className="rounded-xl2 bg-gradient-to-br from-primary to-primary-deep p-5 text-white shadow-card sm:p-7"
      >
        <p className="flex items-center gap-2 text-sm text-white/85">
          <Wallet className="h-5 w-5" aria-hidden />
          الرصيد الحالي
        </p>
        <Money value={overview.summary.balance} className="mt-2 block text-4xl font-bold sm:text-5xl" />
        <p className="mt-2 text-xs text-white/75">= الافتتاحي + التحصيل − المصروفات المدفوعة ± التعديلات اليدوية</p>
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatCard
          label={isFiltered ? 'إجمالي الوارد (حسب التصفية)' : 'إجمالي الوارد'}
          value={<Money value={income} className="text-lg" />}
          icon={<ArrowDownLeft className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label={isFiltered ? 'إجمالي المنصرف (حسب التصفية)' : 'إجمالي المنصرف'}
          value={<Money value={outgoing} className="text-lg text-danger-fg" />}
          icon={<ArrowUpRight className="h-5 w-5" />}
          tone="warn"
        />
      </div>

      <Card className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="space-y-1 text-sm font-semibold text-ink">
          الفترة
          <select className="input-base font-normal" value={filters.periodId} onChange={(e) => set({ periodId: e.target.value })}>
            <option value="all">كل الفترات</option>
            {overview.periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm font-semibold text-ink">
          نوع الحركة
          <select className="input-base font-normal" value={filters.type} onChange={(e) => set({ type: e.target.value as TransactionType | 'all' })}>
            <option value="all">كل الأنواع</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {TRANSACTION_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm font-semibold text-ink">
          من تاريخ
          <input type="date" className="input-base font-normal" value={filters.from ?? ''} onChange={(e) => set({ from: e.target.value || undefined })} />
        </label>
        <label className="space-y-1 text-sm font-semibold text-ink">
          إلى تاريخ
          <input type="date" className="input-base font-normal" value={filters.to ?? ''} onChange={(e) => set({ to: e.target.value || undefined })} />
        </label>
        <div className="space-y-1 text-sm font-semibold text-ink">
          بحث
          <SearchInput value={filters.search ?? ''} onValueChange={(search) => set({ search })} placeholder="في البيان" />
        </div>
        {isFiltered && (
          <div className="sm:col-span-2 lg:col-span-5">
            <Button size="sm" variant="ghost" onClick={() => setFilters({ type: 'all', periodId: 'all' })}>
              مسح كل التصفيات
            </Button>
          </div>
        )}
      </Card>

      <SectionCard title="سجل الحركات" description={`${visible.length} حركة`}>
        {visible.length === 0 ? (
          <EmptyState
            title={isFiltered ? 'لا توجد حركات مطابقة' : 'لا توجد حركات بعد'}
            description={isFiltered ? 'غيّر التصفية أو امسحها.' : 'ستظهر هنا كل حركات التحصيل والمصروفات.'}
          />
        ) : (
          <ul className="divide-y divide-line">
            {visible.map((tx) => (
              <li key={tx.id} className="flex items-center gap-1">
                <div className="min-w-0 flex-1">
                  <TransactionItem tx={tx} />
                </div>
                {(tx.type === 'manual_in' || tx.type === 'manual_out') && (
                  <Button size="sm" variant="ghost" aria-label="حذف التعديل اليدوي" onClick={() => void handleRemove(tx.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <ManualAdjustmentModal open={adjusting} onClose={() => setAdjusting(false)} />
    </div>
  );
}
