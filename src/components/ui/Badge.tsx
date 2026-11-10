import type { ReactNode } from 'react';
import { CheckCircle2, Circle, Archive, Lock, PlayCircle } from 'lucide-react';
import { PAYMENT_STATUS_LABEL, PERIOD_STATUS_LABEL } from '@/constants/labels';
import type { PaymentStatus, PeriodStatus } from '@/types';
import { cn } from '@/utils/cn';

type Tone = 'success' | 'warn' | 'danger' | 'neutral' | 'primary';

const tones: Record<Tone, string> = {
  success: 'bg-success-bg text-success-fg',
  warn: 'bg-warn-bg text-warn-fg',
  danger: 'bg-danger-bg text-danger-fg',
  neutral: 'bg-soft text-muted',
  primary: 'bg-primary-soft text-primary-ink',
};

export function Badge({ tone = 'neutral', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Status is always shown as text AND icon AND colour (never colour alone). */
export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return status === 'paid' ? (
    <Badge tone="success">
      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
      {PAYMENT_STATUS_LABEL.paid}
    </Badge>
  ) : (
    <Badge tone="warn">
      <Circle className="h-3.5 w-3.5" aria-hidden />
      {PAYMENT_STATUS_LABEL.unpaid}
    </Badge>
  );
}

export function PeriodBadge({ status }: { status: PeriodStatus }) {
  return status === 'active' ? (
    <Badge tone="primary">
      <PlayCircle className="h-3.5 w-3.5" aria-hidden />
      {PERIOD_STATUS_LABEL.active}
    </Badge>
  ) : (
    <Badge tone="neutral">
      <Lock className="h-3.5 w-3.5" aria-hidden />
      {PERIOD_STATUS_LABEL.closed}
    </Badge>
  );
}

export function ArchivedBadge() {
  return (
    <Badge tone="neutral">
      <Archive className="h-3.5 w-3.5" aria-hidden />
      مؤرشفة
    </Badge>
  );
}
