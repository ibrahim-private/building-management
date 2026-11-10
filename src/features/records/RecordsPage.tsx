import { Archive, CalendarPlus, ChevronLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { PeriodBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState, LoadingState } from '@/components/ui/feedback';
import { Money, PageHeader, ProgressBar } from '@/components/ui/misc';
import { usePeriodCards } from '@/hooks/useData';
import { CollectionTrendChart } from './CollectionTrendChart';
import { formatDateRange } from '@/utils/date';

/** Archive of all financial periods, one card per period. */
export function RecordsPage() {
  const cards = usePeriodCards();
  const navigate = useNavigate();

  if (!cards) return <LoadingState />;

  return (
    <div className="space-y-5">
      <PageHeader
        title="السجلات المالية"
        description="أرشيف كل الفترات المالية. افتح أي فترة لمراجعة التحصيل والمصروفات."
        actions={
          <Button variant="secondary" icon={<CalendarPlus className="h-5 w-5" />} onClick={() => navigate('/periods')}>
            إدارة الفترات
          </Button>
        }
      />

      {cards.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Archive className="h-7 w-7" />}
            title="لا توجد سجلات بعد"
            description="ستظهر هنا كل فترة مالية بعد إنشائها."
            action={<Button onClick={() => navigate('/periods')}>إنشاء فترة</Button>}
          />
        </Card>
      ) : (
        <>
        <CollectionTrendChart cards={cards} />
        <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {cards.map(({ period, summary, paidExpensesTotal }) => (
            <li key={period.id}>
              <Link
                to={`/records/${period.id}`}
                className="card block space-y-3 p-4 transition-colors hover:border-primary/60"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-bold text-ink">{period.name}</h2>
                    <p className="num text-sm text-muted">{formatDateRange(period.startDate, period.endDate)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <PeriodBadge status={period.status} />
                    <ChevronLeft className="h-5 w-5 text-muted" aria-hidden />
                  </div>
                </div>

                <ProgressBar percent={summary.percent} label={`نسبة التحصيل في ${period.name}`} />

                <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm sm:grid-cols-3">
                  <div>
                    <dt className="text-xs text-muted">المطلوب</dt>
                    <dd><Money value={summary.required} /></dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">المحصّل</dt>
                    <dd><Money value={summary.collected} className="text-success-fg" /></dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">المصروفات المدفوعة</dt>
                    <dd><Money value={paidExpensesTotal} className="text-danger-fg" /></dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">وحدات مدفوعة</dt>
                    <dd className="num font-semibold">{summary.paidCount}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">وحدات غير مدفوعة</dt>
                    <dd className="num font-semibold text-warn-fg">{summary.unpaidCount}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted">نسبة التحصيل</dt>
                    <dd className="num font-semibold">{summary.percent}%</dd>
                  </div>
                </dl>
              </Link>
            </li>
          ))}
        </ul>
        </>
      )}
    </div>
  );
}
