import { CalendarRange, CheckCircle2, ChevronLeft, CircleDollarSign, Plus, Users, Wallet, XCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { TransactionItem } from '@/components/shared/TransactionItem';
import { Button } from '@/components/ui/Button';
import { Card, SectionCard } from '@/components/ui/Card';
import { EmptyState, LoadingState, Notice } from '@/components/ui/feedback';
import { Money, PageHeader, ProgressBar, StatCard } from '@/components/ui/misc';
import { PeriodBadge } from '@/components/ui/Badge';
import { useDashboardData } from '@/hooks/useData';
import { updateSettings } from '@/services/settings/settingsService';
import { formatDateRange } from '@/utils/date';
import { useAction } from '@/hooks/useAction';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'صباح الخير 👋';
  if (h < 18) return 'مساء الخير 👋';
  return 'مساء النور 👋';
}

export function DashboardPage() {
  const data = useDashboardData();
  const navigate = useNavigate();
  const { run } = useAction();

  if (!data) return <LoadingState />;
  const { activePeriod, treasury, collection } = data;

  return (
    <div className="space-y-5">
      <PageHeader
        title="الرئيسية"
        description={greeting() + ' — هذه نظرة سريعة على حسابات العمارة'}
      />

      {data.pendingReviewPeriod && (
        <Notice tone="warn" title="تم إنشاء فترة جديدة تلقائياً">
          <p>
            الفترة "{data.pendingReviewPeriod.name}" أُنشئت بنفس مبالغ الفترة السابقة. راجع المبالغ ثم أكّد.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => navigate('/periods')}>
              مراجعة الفترة
            </Button>
            <Button
              size="sm"
              onClick={() => void run(() => updateSettings({ pendingReviewPeriodId: null }), 'تم تأكيد الفترة')}
            >
              تمت المراجعة
            </Button>
          </div>
        </Notice>
      )}

      {/* 1. Current period */}
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-ink">
            <CalendarRange className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-muted">الفترة المالية الحالية</p>
            {activePeriod ? (
              <p className="flex flex-wrap items-center gap-2 font-bold text-ink">
                {activePeriod.name}
                <PeriodBadge status="active" />
                <span className="num text-sm font-normal text-muted">
                  {formatDateRange(activePeriod.startDate, activePeriod.endDate)}
                </span>
              </p>
            ) : (
              <p className="font-bold text-ink">لا توجد فترة نشطة</p>
            )}
          </div>
        </div>
        <Button variant="secondary" onClick={() => navigate('/periods')}>
          إدارة الفترات
        </Button>
      </Card>

      {/* 2. Treasury hero */}
      <section
        aria-label="الخزينة"
        className="rounded-xl2 bg-gradient-to-br from-primary to-primary-deep p-5 text-white shadow-card sm:p-7"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-2 text-sm text-white/85">
              <Wallet className="h-5 w-5" aria-hidden />
              رصيد الخزينة الحالي (تراكمي)
            </p>
            <Money value={treasury.balance} className="mt-2 block text-4xl font-bold sm:text-5xl" />
          </div>
          <Link
            to="/treasury"
            className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-white/15 px-3 py-2 text-sm font-semibold hover:bg-white/25"
          >
            الخزينة <ChevronLeft className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/12 p-3">
            <p className="text-xs text-white/80">المحصّل في الفترة</p>
            <Money value={data.periodCollections} className="text-lg" />
          </div>
          <div className="rounded-xl bg-white/12 p-3">
            <p className="text-xs text-white/80">المصروفات المدفوعة في الفترة</p>
            <Money value={data.periodPaidExpenses} className="text-lg" />
          </div>
        </div>
      </section>

      {/* 3. Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="الوحدات النشطة" value={data.activeUnitCount} icon={<Users className="h-5 w-5" />} tone="primary" />
        <StatCard label="وحدات مدفوعة" value={collection.paidCount} icon={<CheckCircle2 className="h-5 w-5" />} tone="success" />
        <StatCard label="وحدات غير مدفوعة" value={collection.unpaidCount} icon={<XCircle className="h-5 w-5" />} tone="warn" />
        <StatCard label="نسبة التحصيل" value={`${collection.percent}%`} icon={<CircleDollarSign className="h-5 w-5" />} tone="primary" />
      </div>

      {/* 4. Collection overview */}
      <SectionCard
        title="متابعة التحصيل"
        action={
          collection.unpaidCount > 0 ? (
            <Button variant="soft" size="sm" onClick={() => navigate('/units?filter=unpaid')}>
              عرض غير المدفوعين
            </Button>
          ) : undefined
        }
      >
        {activePeriod ? (
          <div className="space-y-4">
            <ProgressBar percent={collection.percent} />
            <dl className="grid grid-cols-3 gap-3 text-center">
              <div>
                <dt className="text-xs text-muted">المطلوب</dt>
                <dd><Money value={collection.required} className="text-sm sm:text-base" /></dd>
              </div>
              <div>
                <dt className="text-xs text-muted">المحصّل</dt>
                <dd><Money value={collection.collected} className="text-sm text-success-fg sm:text-base" /></dd>
              </div>
              <div>
                <dt className="text-xs text-muted">المتبقي</dt>
                <dd><Money value={collection.remaining} className="text-sm text-warn-fg sm:text-base" /></dd>
              </div>
            </dl>
          </div>
        ) : (
          <EmptyState
            title="لم تبدأ فترة تحصيل بعد"
            description="أنشئ فترة مالية جديدة لتبدأ بتسجيل التحصيل."
            action={<Button onClick={() => navigate('/periods')}>إنشاء فترة</Button>}
          />
        )}
      </SectionCard>

      {/* 5. Recent transactions */}
      <SectionCard
        title="آخر الحركات المالية"
        action={
          <Button variant="ghost" size="sm" onClick={() => navigate('/treasury')}>
            عرض كل السجلات
          </Button>
        }
      >
        {data.recentTransactions.length === 0 ? (
          <EmptyState title="لا توجد حركات بعد" description="ستظهر هنا عمليات التحصيل والمصروفات." />
        ) : (
          <ul className="divide-y divide-line">
            {data.recentTransactions.map((tx) => (
              <li key={tx.id}>
                <TransactionItem tx={tx} />
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      {/* 6. Quick actions */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Button size="lg" icon={<CircleDollarSign className="h-5 w-5" />} onClick={() => navigate('/units?filter=unpaid')}>
          تسجيل تحصيل
        </Button>
        <Button size="lg" variant="secondary" icon={<Plus className="h-5 w-5" />} onClick={() => navigate('/expenses?new=1')}>
          إضافة مصروف
        </Button>
      </div>
    </div>
  );
}
