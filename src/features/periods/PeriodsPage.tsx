import { ArrowRight, CalendarPlus, Lock, Pencil, PlayCircle } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PeriodBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { EmptyState, LoadingState } from '@/components/ui/feedback';
import { PageHeader } from '@/components/ui/misc';
import { useAction } from '@/hooks/useAction';
import { usePeriodCards } from '@/hooks/useData';
import { activatePeriod, closePeriod, periodLengthDays } from '@/services/period/periodService';
import type { FinancialPeriod } from '@/types';
import { formatDateRange } from '@/utils/date';
import { formatMoney } from '@/utils/money';
import { PeriodFormModal } from './PeriodFormModal';

export function PeriodsPage() {
  const cards = usePeriodCards();
  const confirm = useConfirm();
  const { run } = useAction();
  const [form, setForm] = useState<{ open: boolean; period?: FinancialPeriod }>({ open: false });

  if (!cards) return <LoadingState />;

  const handleClose = async (period: FinancialPeriod, unpaid: number) => {
    const ok = await confirm({
      title: `إغلاق "${period.name}"؟`,
      confirmText: 'إغلاق الفترة',
      description:
        (unpaid > 0 ? `يوجد ${unpaid} وحدة لم تدفع بعد في هذه الفترة. ` : '') +
        'الإغلاق لا يحذف شيئاً، ويمكنك تعديل الفترة أو تسجيل دفعات متأخرة لاحقاً.',
    });
    if (ok) await run(() => closePeriod(period.id), 'تم إغلاق الفترة');
  };

  const handleActivate = async (period: FinancialPeriod) => {
    const ok = await confirm({
      title: `جعل "${period.name}" هي الفترة الحالية؟`,
      confirmText: 'تفعيل',
      description: 'ستُغلق أي فترة نشطة أخرى، لأن الفترة النشطة واحدة فقط.',
    });
    if (ok) await run(() => activatePeriod(period.id), 'تم تفعيل الفترة');
  };

  return (
    <div className="space-y-5">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowRight className="h-4 w-4" aria-hidden />
        الرئيسية
      </Link>
      <PageHeader
        title="الفترات المالية"
        description="أنشئ فترة جديدة عند بدء كل دورة تحصيل. السجلات السابقة تبقى كما هي."
        actions={
          <Button icon={<CalendarPlus className="h-5 w-5" />} onClick={() => setForm({ open: true })}>
            فترة جديدة
          </Button>
        }
      />

      {cards.length === 0 ? (
        <Card>
          <EmptyState
            title="لا توجد فترات بعد"
            description="ابدأ بإنشاء أول فترة تحصيل، وحدد مدتها والمبلغ المطلوب من كل وحدة."
            action={<Button onClick={() => setForm({ open: true })}>إنشاء فترة</Button>}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {cards.map(({ period, summary }) => (
            <Card key={period.id} className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-bold text-ink">{period.name}</h2>
                  <p className="num text-sm text-muted">
                    {formatDateRange(period.startDate, period.endDate)} · {periodLengthDays(period)} يوم
                  </p>
                </div>
                <PeriodBadge status={period.status} />
              </div>
              <p className="text-sm text-muted">
                المحصّل <b className="num text-ink">{formatMoney(summary.collected)}</b> من{' '}
                <b className="num text-ink">{formatMoney(summary.required)}</b> · غير مدفوع{' '}
                <b className="num text-warn-fg">{summary.unpaidCount}</b>
              </p>
              <div className="flex flex-wrap gap-2">
                <Link
                  to={`/records/${period.id}`}
                  className="inline-flex min-h-[36px] items-center rounded-xl bg-primary-soft px-3 text-sm font-semibold text-primary-ink"
                >
                  فتح السجل
                </Link>
                <Button size="sm" variant="ghost" icon={<Pencil className="h-4 w-4" />} onClick={() => setForm({ open: true, period })}>
                  تعديل
                </Button>
                {period.status === 'active' ? (
                  <Button size="sm" variant="ghost" icon={<Lock className="h-4 w-4" />} onClick={() => void handleClose(period, summary.unpaidCount)}>
                    إغلاق
                  </Button>
                ) : (
                  <Button size="sm" variant="ghost" icon={<PlayCircle className="h-4 w-4" />} onClick={() => void handleActivate(period)}>
                    تفعيل كفترة حالية
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <PeriodFormModal open={form.open} period={form.period} onClose={() => setForm({ open: false })} />
    </div>
  );
}
