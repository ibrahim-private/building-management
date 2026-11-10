import { Building2, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DatePromptDialog } from '@/components/shared/DatePromptDialog';
import { Button } from '@/components/ui/Button';
import { useConfirm } from '@/components/ui/ConfirmProvider';
import { EmptyState, LoadingState, Notice } from '@/components/ui/feedback';
import { PageHeader, SearchInput, SegmentedControl } from '@/components/ui/misc';
import { UNIT_TYPE_GROUP_LABEL, unitLabel } from '@/constants/labels';
import { useAction } from '@/hooks/useAction';
import { useUnitsOverview } from '@/hooks/useData';
import { recordCollection, undoCollection } from '@/services/finance/collectionService';
import { archiveUnit, restoreUnit } from '@/services/units/unitService';
import type { Unit, UnitType, UnitWithObligation } from '@/types';
import { formatMoney } from '@/utils/money';
import { UnitCard } from './UnitCard';
import { UnitFormModal } from './UnitFormModal';

type Filter = 'all' | 'unpaid' | 'paid' | 'archived';
const FILTERS: Filter[] = ['all', 'unpaid', 'paid', 'archived'];

export function UnitsPage() {
  const overview = useUnitsOverview();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [formState, setFormState] = useState<{ open: boolean; unit?: Unit }>({ open: false });
  const [paying, setPaying] = useState<UnitWithObligation | null>(null);
  const confirm = useConfirm();
  const { run } = useAction();

  const rawFilter = params.get('filter') as Filter | null;
  const filter: Filter = rawFilter && FILTERS.includes(rawFilter) ? rawFilter : 'all';
  const setFilter = (next: Filter) => setParams(next === 'all' ? {} : { filter: next }, { replace: true });

  const counts = useMemo(() => {
    const items = overview?.units ?? [];
    const active = items.filter((i) => i.unit.status === 'active');
    return {
      all: active.length,
      unpaid: active.filter((i) => i.obligation?.status === 'unpaid').length,
      paid: active.filter((i) => i.obligation?.status === 'paid').length,
      archived: items.length - active.length,
    };
  }, [overview]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (overview?.units ?? []).filter(({ unit, obligation }) => {
      const archived = unit.status === 'archived';
      if (filter === 'archived') {
        if (!archived) return false;
      } else {
        if (archived) return false;
        if (filter === 'unpaid' && obligation?.status !== 'unpaid') return false;
        if (filter === 'paid' && obligation?.status !== 'paid') return false;
      }
      if (!q) return true;
      return unit.number.toLowerCase().includes(q) || unit.name.toLowerCase().includes(q);
    });
  }, [overview, filter, search]);

  if (!overview) return <LoadingState />;
  const { activePeriod } = overview;

  const handleUndo = async (item: UnitWithObligation) => {
    if (!item.obligation) return;
    const ok = await confirm({
      title: 'التراجع عن تسجيل الدفع؟',
      tone: 'danger',
      confirmText: 'نعم، تراجع',
      description:
        `سيتم إرجاع ${unitLabel(item.unit)} إلى حالة "غير مدفوع" وخصم ${formatMoney(item.obligation.amount)} من الخزينة ` +
        `لأن هذا التحصيل سيُلغى. استخدم هذا الخيار فقط إذا سُجّل الدفع بالخطأ.`,
    });
    if (ok) await run(() => undoCollection(item.obligation!.id), 'تم التراجع عن الدفع');
  };

  const handleArchive = async (unit: Unit) => {
    const ok = await confirm({
      title: `أرشفة ${unitLabel(unit)}؟`,
      confirmText: 'أرشفة',
      description:
        'ستختفي الوحدة من القائمة النشطة ولن تُحتسب في التحصيل الحالي إن كانت غير مدفوعة. ' +
        'كل سجلاتها المالية السابقة تبقى محفوظة ويمكنك استعادتها في أي وقت.',
    });
    if (ok) await run(() => archiveUnit(unit.id), 'تمت الأرشفة');
  };

  const groups: UnitType[] = ['facility', 'apartment']; // facilities first

  return (
    <div className="space-y-5">
      <PageHeader
        title="الشقق والمنشآت"
        description={activePeriod ? `الفترة الحالية: ${activePeriod.name}` : 'لا توجد فترة نشطة حالياً'}
        actions={
          <Button icon={<Plus className="h-5 w-5" />} onClick={() => setFormState({ open: true })}>
            إضافة وحدات
          </Button>
        }
      />

      {!activePeriod && (
        <Notice tone="warn" title="لا توجد فترة تحصيل نشطة">
          يمكنك إضافة الوحدات الآن، لكن لتسجيل الدفع أنشئ فترة مالية من صفحة "الفترات".
        </Notice>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SegmentedControl
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'الكل', count: counts.all },
            { value: 'unpaid', label: 'غير مدفوع', count: counts.unpaid },
            { value: 'paid', label: 'مدفوع', count: counts.paid },
            { value: 'archived', label: 'المؤرشفة', count: counts.archived },
          ]}
        />
        <SearchInput
          className="lg:w-80"
          value={search}
          onValueChange={setSearch}
          placeholder="ابحث برقم الوحدة أو الاسم"
        />
      </div>

      {visible.length === 0 ? (
        <EmptyState
          icon={<Building2 className="h-7 w-7" />}
          title={search ? 'لا توجد نتائج مطابقة' : counts.all + counts.archived === 0 ? 'لم تُضف أي وحدات بعد' : 'لا توجد وحدات في هذا العرض'}
          description={
            search
              ? 'جرّب كلمة بحث أخرى أو امسح البحث.'
              : counts.all + counts.archived === 0
                ? 'ابدأ بإضافة المنشآت التجارية والشقق.'
                : undefined
          }
          action={
            counts.all + counts.archived === 0 ? (
              <Button onClick={() => setFormState({ open: true })}>إضافة وحدات</Button>
            ) : undefined
          }
        />
      ) : (
        groups.map((type) => {
          const items = visible.filter((i) => i.unit.type === type);
          if (items.length === 0) return null;
          return (
            <section key={type} aria-labelledby={`group-${type}`}>
              <h2 id={`group-${type}`} className="mb-3 flex items-center gap-2 text-lg font-bold text-ink">
                {UNIT_TYPE_GROUP_LABEL[type]}
                <span className="num rounded-full bg-soft px-2.5 py-0.5 text-xs font-semibold text-muted">{items.length}</span>
              </h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((item) => (
                  <UnitCard
                    key={item.unit.id}
                    unit={item.unit}
                    obligation={item.obligation}
                    hasActivePeriod={Boolean(activePeriod)}
                    onPay={() => setPaying(item)}
                    onUndo={() => void handleUndo(item)}
                    onEdit={() => setFormState({ open: true, unit: item.unit })}
                    onArchive={() => void handleArchive(item.unit)}
                    onRestore={() => void run(() => restoreUnit(item.unit.id), 'تمت استعادة الوحدة')}
                  />
                ))}
              </div>
            </section>
          );
        })
      )}

      <UnitFormModal
        open={formState.open}
        unit={formState.unit}
        onClose={() => setFormState({ open: false })}
      />

      <DatePromptDialog
        open={paying !== null}
        onClose={() => setPaying(null)}
        title="تأكيد استلام الدفعة"
        confirmLabel="تأكيد الدفع"
        description={
          paying?.obligation && (
            <>
              هل استلمت <b>{formatMoney(paying.obligation.amount)}</b> من <b>{unitLabel(paying.unit)}</b>
              {paying.unit.name ? ` (${paying.unit.name})` : ''}؟ سيُضاف المبلغ إلى الخزينة مباشرة.
            </>
          )
        }
        onConfirm={async (date) => {
          const obligation = paying?.obligation;
          if (!obligation) return false;
          const result = await run(() => recordCollection(obligation.id, date), 'تم تسجيل الدفع');
          return result.ok;
        }}
      />
    </div>
  );
}
