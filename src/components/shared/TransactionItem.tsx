import { ArrowDownLeft, ArrowUpRight, Landmark } from 'lucide-react';
import { TRANSACTION_DIRECTION, TRANSACTION_TYPE_LABEL } from '@/constants/labels';
import type { Transaction } from '@/types';
import { cn } from '@/utils/cn';
import { formatDate } from '@/utils/date';
import { Money } from '@/components/ui/misc';

/** One transaction line (callers wrap it in <li>): description, type label (text + icon), date, signed amount. */
export function TransactionItem({ tx }: { tx: Transaction }) {
  const direction = TRANSACTION_DIRECTION[tx.type];
  const Icon = tx.type === 'opening' ? Landmark : direction === 'in' ? ArrowDownLeft : ArrowUpRight;
  return (
    <div className="flex items-center gap-3 py-3">
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
          direction === 'in' ? 'bg-success-bg text-success-fg' : 'bg-danger-bg text-danger-fg',
        )}
        aria-hidden
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{tx.description || TRANSACTION_TYPE_LABEL[tx.type]}</p>
        <p className="text-xs text-muted">
          {TRANSACTION_TYPE_LABEL[tx.type]} · <bdi className="num">{formatDate(tx.date)}</bdi>
        </p>
      </div>
      <Money
        value={tx.amount}
        signed={direction}
        className={cn('shrink-0 text-sm', direction === 'in' ? 'text-success-fg' : 'text-danger-fg')}
      />
    </div>
  );
}
