import { ArrowRight, Pencil } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ExportPdfButton } from '@/components/shared/ExportPdfButton';
import { ArchivedBadge, PaymentBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SectionCard } from '@/components/ui/Card';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/feedback';
import { Money, PageHeader, StatCard, TableWrap, tdClass, thClass } from '@/components/ui/misc';
import { UNIT_TYPE_LABEL, unitLabel } from '@/constants/labels';
import { useUnitHistory } from '@/hooks/useData';
import { exportUnitPdf } from '@/services/pdf/exportReports';
import type { Obligation } from '@/types';
import { formatDateRange, formatDateShort } from '@/utils/date';
import { FileCheck2, Hourglass, Sigma } from 'lucide-react';
import { ObligationEditModal } from './ObligationEditModal';
import { UnitFormModal } from './UnitFormModal';

export function UnitDetailPage() {
  const { unitId = '' } = useParams();
  const history = useUnitHistory(unitId);
  const [editingUnit, setEditingUnit] = useState(false);
  const [editingObligation, setEditingObligation] = useState<Obligation | null>(null);

  if (history === undefined) return <LoadingState />;
  if (history === null) {
    return (
      <ErrorState title="هذه الوحدة غير موجودة" description="ربما حُذفت بعد استعادة نسخة احتياطية. ارجع إلى قائمة الوحدات." />
    );
  }

  const { unit, rows } = history;
  const editingPeriod = editingObligation ? (rows.find((r) => r.obligation.id === editingObligation.id)?.period ?? null) : null;

  return (
    <div className="space-y-5">
      <Link to="/units" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowRight className="h-4 w-4" aria-hidden />
        العودة إلى الشقق والمنشآت
      </Link>

      <PageHeader
        title={unitLabel(unit)}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {UNIT_TYPE_LABEL[unit.type]} · {unit.name || 'بدون اسم'}
            {unit.status === 'archived' && <ArchivedBadge />}
          </span>
        }
        actions={
          <>
            <ExportPdfButton label="تصدير كشف الحساب PDF" onExport={() => exportUnitPdf(unit.id)} />
            <Button variant="secondary" icon={<Pencil className="h-4 w-4" />} onClick={() => setEditingUnit(true)}>
              تعديل البيانات
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="إجمالي المطلوب" value={<Money value={history.totalRequired} className="text-lg" />} icon={<Sigma className="h-5 w-5" />} tone="primary" />
        <StatCard label="إجمالي المدفوع" value={<Money value={history.totalPaid} className="text-lg" />} icon={<FileCheck2 className="h-5 w-5" />} tone="success" />
        <StatCard label="المتبقي" value={<Money value={history.totalRemaining} className="text-lg" />} icon={<Hourglass className="h-5 w-5" />} tone="warn" />
      </div>

      <SectionCard title="ملاحظات دائمة" description="تبقى مع الوحدة في كل الفترات.">
        {unit.notes ? (
          <p className="whitespace-pre-line text-ink">{unit.notes}</p>
        ) : (
          <p className="text-sm text-muted">لا توجد ملاحظات. يمكنك إضافتها من "تعديل البيانات".</p>
        )}
      </SectionCard>

      <SectionCard title="السجل عبر الفترات" description="كل فترة بمبلغها وحالتها وملاحظتها الخاصة.">
        {rows.length === 0 ? (
          <EmptyState title="لا توجد سجلات بعد" description="ستظهر هنا الفترات التي كانت فيها هذه الوحدة نشطة." />
        ) : (
          <TableWrap>
            <table className="w-full min-w-[640px]">
              <thead>
                <tr>
                  <th className={thClass}>الفترة</th>
                  <th className={thClass}>المدة</th>
                  <th className={thClass}>المطلوب</th>
                  <th className={thClass}>الحالة</th>
                  <th className={thClass}>تاريخ الدفع</th>
                  <th className={thClass}>ملاحظة الفترة</th>
                  <th className={thClass}><span className="sr-only">إجراءات</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ period, obligation }) => (
                  <tr key={obligation.id}>
                    <td className={tdClass}>
                      <Link to={`/records/${period.id}`} className="font-semibold text-ink hover:text-primary">
                        {period.name}
                      </Link>
                    </td>
                    <td className={tdClass}><bdi className="num text-muted">{formatDateRange(period.startDate, period.endDate)}</bdi></td>
                    <td className={tdClass}><Money value={obligation.amount} /></td>
                    <td className={tdClass}><PaymentBadge status={obligation.status} /></td>
                    <td className={tdClass}><bdi className="num">{formatDateShort(obligation.paidAt)}</bdi></td>
                    <td className={tdClass}>{obligation.periodNote || <span className="text-muted">—</span>}</td>
                    <td className={tdClass}>
                      <Button size="sm" variant="ghost" onClick={() => setEditingObligation(obligation)}>
                        تعديل
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        )}
      </SectionCard>

      <UnitFormModal open={editingUnit} unit={unit} onClose={() => setEditingUnit(false)} />
      <ObligationEditModal
        open={editingObligation !== null}
        obligation={editingObligation}
        period={editingPeriod}
        onClose={() => setEditingObligation(null)}
      />
    </div>
  );
}
