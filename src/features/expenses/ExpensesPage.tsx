import { CheckCircle2, Plus, Receipt, Trash2, Undo2, Pencil } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DatePromptDialog } from '@/components/shared/DatePromptDialog';
import { ExportPdfButton } from '@/components/shared/ExportPdfButton';
import { PaymentBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { EmptyState, LoadingState } from '@/components/ui/feedback';
import { Money, PageHeader, SearchInput, SegmentedControl } from '@/components/ui/misc';
import { useAction } from '@/hooks/useAction';
import { useExpensesOverview } from '@/hooks/useData';
import { archiveExpense, payExpense, undoExpensePayment } from '@/services/finance/expenseService';
import { exportExpensesPdf } from '@/services/pdf/exportReports';
import type { Expense } from '@/types';
import { formatDate } from '@/utils/date';
import { formatMoney } from '@/utils/money';
import { ExpenseFormModal } from './ExpenseFormModal';

type Filter = 'all' | 'unpaid' | 'paid';

export function ExpensesPage() {
  const overview = useExpensesOverview();
  const [params, setParams] = useSearchParams();
  const [filter, setFilter] = useState<Filter>('all');
  const [search, setSearch] = useState('');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [form, setForm] = useState<{ open: boolean; expense?: Expense }>({ open: false });
  const [paying, setPaying] = useState<Expense | null>(null);
  const confirm = useConfirm();
  const { run } = useAction();

  // Dashboard quick action: /expenses?new=1
  useEffect(() => {
    if (params.get('new') === '1') {
      setForm({ open: true });
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  const periodName = useMemo(
    () => new Map((overview?.periods ?? []).map((p) => [p.id, p.name])),
    [overview],
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (overview?.expenses ?? []).filter((e) => {
      if (filter !== 'all' && e.status !== filter) return false;
      if (periodFilter !== 'all' && e.periodId !== periodFilter) return false;
      return !q || e.title.toLowerCase().includes(q) || e.notes.toLowerCase().includes(q);
    });
  }, [overview, filter, search, periodFilter]);

  if (!overview) return <LoadingState />;

  const counts = {
    all: overview.expenses.length,
    unpaid: overview.expenses.filter((e) => e.status === 'unpaid').length,
    paid: overview.expenses.filter((e) => e.status === 'paid').length,
  };
  const totalPaid = visible.filter((e) => e.status === 'paid').reduce((t, e) => t + e.amount, 0);
  const totalUnpaid = visible.filter((e) => e.status === 'unpaid').reduce((t, e) => t + e.amount, 0);

  const handleUndo = async (expense: Expense) => {
    const ok = await confirm({
      title: 'التراجع عن دفع المصروف؟',
      tone: 'danger',
      confirmText: 'نعم، تراجع',
      description: `سيعود "${expense.title}" إلى حالة "غير مدفوع" وسيُعاد مبلغ ${formatMoney(expense.amount)} إلى الخزينة.`,
    });
    if (ok) await run(() => undoExpensePayment(expense.id), 'تم التراجع عن الدفع');
  };

  const handleArchive = async (expense: Expense) => {
    const ok = await confirm({
      title: 'حذف هذا المصروف؟',
      tone: 'danger',
      confirmText: 'حذف',
      description: `سيُزال "${expense.title}" من القائمة. لا يؤثر ذلك على الخزينة لأنه غير مدفوع.`,
    });
    if (ok) await run(() => archiveExpense(expense.id), 'تم حذف المصروف');
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="المصروفات"
        description={
          <>
            رصيد الخزينة المتاح: <Money value={overview.balance} className="text-ink" />
          </>
        }
        actions={
          <>
            <ExportPdfButton label="تقرير PDF" onExport={() => exportExpensesPdf(periodFilter === 'all' ? undefined : periodFilter)} />
            <Button icon={<Plus className="h-5 w-5" />} onClick={() => setForm({ open: true })}>
              إضافة مصروف
            </Button>
          </>
        }
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SegmentedControl
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'الكل', count: counts.all },
            { value: 'unpaid', label: 'غير مدفوع', count: counts.unpaid },
            { value: 'paid', label: 'مدفوع', count: counts.paid },
          ]}
        />
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            aria-label="تصفية حسب الفترة"
            className="input-base sm:w-52"
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
          >
            <option value="all">كل الفترات</option>
            {overview.periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <SearchInput className="sm:w-64" value={search} onValueChange={setSearch} placeholder="ابحث في المصروفات" />
        </div>
      </div>

      {visible.length > 0 && (
        <p className="text-sm text-muted">
          المدفوع: <Money value={totalPaid} className="text-danger-fg" /> · غير المدفوع: <Money value={totalUnpaid} className="text-warn-fg" />
        </p>
      )}

      {visible.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Receipt className="h-7 w-7" />}
            title={search || filter !== 'all' || periodFilter !== 'all' ? 'لا توجد مصروفات مطابقة' : 'لا توجد مصروفات بعد'}
            description="سجّل أي مصروف للعمارة ثم أكّد دفعه عند السداد."
            action={<Button onClick={() => setForm({ open: true })}>إضافة مصروف</Button>}
          />
        </Card>
      ) : (
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {visible.map((expense) => (
            <li key={expense.id}>
              <Card className="flex h-full flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-base font-bold text-ink">{expense.title}</h3>
                    <p className="text-sm text-muted">
                      <bdi className="num">{formatDate(expense.date)}</bdi> ·{' '}
                      {expense.periodId ? (periodName.get(expense.periodId) ?? '—') : 'بدون فترة'}
                    </p>
                  </div>
                  <PaymentBadge status={expense.status} />
                </div>
                <Money value={expense.amount} className="text-xl" />
                {expense.notes && <p className="text-sm text-muted">{expense.notes}</p>}
                <div className="mt-auto flex flex-wrap gap-2">
                  {expense.status === 'unpaid' ? (
                    <Button size="sm" icon={<CheckCircle2 className="h-4 w-4" />} onClick={() => setPaying(expense)}>
                      تأكيد الدفع
                    </Button>
                  ) : (
                    <Button size="sm" variant="secondary" icon={<Undo2 className="h-4 w-4" />} onClick={() => void handleUndo(expense)}>
                      تراجع عن الدفع
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" icon={<Pencil className="h-4 w-4" />} onClick={() => setForm({ open: true, expense })}>
                    تعديل
                  </Button>
                  {expense.status === 'unpaid' && (
                    <Button size="sm" variant="ghost" icon={<Trash2 className="h-4 w-4" />} onClick={() => void handleArchive(expense)}>
                      حذف
                    </Button>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <ExpenseFormModal open={form.open} expense={form.expense} onClose={() => setForm({ open: false })} />

      <DatePromptDialog
        open={paying !== null}
        onClose={() => setPaying(null)}
        title="تأكيد دفع المصروف"
        confirmLabel="تأكيد الدفع"
        description={
          paying && (
            <>
              سيتم دفع <b>{formatMoney(paying.amount)}</b> مقابل "{paying.title}" وخصمه من الخزينة. رصيد الخزينة المتاح حالياً{' '}
              <b>{formatMoney(overview.balance)}</b>.
            </>
          )
        }
        onConfirm={async (date) => {
          if (!paying) return false;
          const result = await run(() => payExpense(paying.id, date), 'تم دفع المصروف وخصمه من الخزينة');
          return result.ok;
        }}
      />
    </div>
  );
}
