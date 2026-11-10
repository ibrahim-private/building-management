import { Archive, CircleDollarSign, History, Pencil, RotateCcw, Undo2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ArchivedBadge, PaymentBadge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Money } from '@/components/ui/misc';
import { unitLabel } from '@/constants/labels';
import type { Obligation, Unit } from '@/types';
import { cn } from '@/utils/cn';
import { formatDateShort } from '@/utils/date';

interface Props {
  unit: Unit;
  obligation?: Obligation;
  hasActivePeriod: boolean;
  onPay: () => void;
  onUndo: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onRestore: () => void;
}

export function UnitCard({ unit, obligation, hasActivePeriod, onPay, onUndo, onEdit, onArchive, onRestore }: Props) {
  const archived = unit.status === 'archived';
  const paid = obligation?.status === 'paid';

  return (
    <Card className={cn('flex flex-col gap-3 p-4', archived && 'opacity-80')}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link to={`/units/${unit.id}`} className="text-lg font-bold text-ink hover:text-primary">
            {unitLabel(unit)}
          </Link>
          <p className="truncate text-sm text-muted">{unit.name || 'بدون اسم'}</p>
        </div>
        {archived ? <ArchivedBadge /> : obligation ? <PaymentBadge status={obligation.status} /> : null}
      </div>

      {!archived && (
        <div className="flex items-end justify-between rounded-xl bg-soft px-3 py-2">
          <div>
            <p className="text-xs text-muted">المطلوب في الفترة الحالية</p>
            {obligation ? (
              <Money value={obligation.amount} className="text-base" />
            ) : (
              <p className="text-sm text-muted">{hasActivePeriod ? 'لا يوجد التزام' : 'لا توجد فترة نشطة'}</p>
            )}
          </div>
          {paid && obligation?.paidAt && (
            <p className="text-xs text-success-fg">
              دُفع في <bdi className="num">{formatDateShort(obligation.paidAt)}</bdi>
            </p>
          )}
        </div>
      )}

      {obligation?.periodNote && !archived && (
        <p className="rounded-lg bg-warn-bg px-3 py-1.5 text-xs text-warn-fg">ملاحظة الفترة: {obligation.periodNote}</p>
      )}

      <div className="mt-auto flex flex-wrap gap-2">
        {archived ? (
          <Button size="sm" variant="soft" icon={<RotateCcw className="h-4 w-4" />} onClick={onRestore}>
            استعادة
          </Button>
        ) : (
          <>
            {obligation && !paid && (
              <Button size="sm" icon={<CircleDollarSign className="h-4 w-4" />} onClick={onPay} className="flex-1">
                تسجيل الدفع
              </Button>
            )}
            {obligation && paid && (
              <Button size="sm" variant="secondary" icon={<Undo2 className="h-4 w-4" />} onClick={onUndo} className="flex-1">
                تراجع عن الدفع
              </Button>
            )}
            <Button size="sm" variant="ghost" icon={<Pencil className="h-4 w-4" />} onClick={onEdit} aria-label={`تعديل ${unitLabel(unit)}`}>
              تعديل
            </Button>
            <Button size="sm" variant="ghost" icon={<Archive className="h-4 w-4" />} onClick={onArchive} aria-label={`أرشفة ${unitLabel(unit)}`}>
              أرشفة
            </Button>
          </>
        )}
        <Link
          to={`/units/${unit.id}`}
          className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-muted hover:bg-soft hover:text-ink"
        >
          <History className="h-4 w-4" aria-hidden />
          السجل
        </Link>
      </div>
    </Card>
  );
}
