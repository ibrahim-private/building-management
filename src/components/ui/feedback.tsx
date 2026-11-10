import { AlertCircle, Inbox, Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { Button } from './Button';

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-4 py-10 text-center', className)}>
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-soft text-muted">
        {icon ?? <Inbox className="h-7 w-7" aria-hidden />}
      </div>
      <h3 className="text-base font-bold text-ink">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LoadingState({ label = 'جارٍ التحميل...' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-2 py-16 text-muted">
      <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
      <span>{label}</span>
    </div>
  );
}

export function ErrorState({
  title = 'حدث خطأ أثناء تحميل البيانات',
  description = 'أعد تحميل الصفحة. بياناتك محفوظة على هذا الجهاز ولم تتأثر.',
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center px-4 py-12 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-danger-bg text-danger-fg">
        <AlertCircle className="h-7 w-7" aria-hidden />
      </div>
      <h3 className="text-base font-bold text-ink">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>
      {onRetry && (
        <Button variant="secondary" className="mt-4" onClick={onRetry}>
          إعادة المحاولة
        </Button>
      )}
    </div>
  );
}

/** Inline notice (info / warning / danger) used for form warnings and banners. */
export function Notice({
  tone = 'warn',
  title,
  children,
  className,
}: {
  tone?: 'warn' | 'danger' | 'info' | 'success';
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  const tones = {
    warn: 'bg-warn-bg text-warn-fg',
    danger: 'bg-danger-bg text-danger-fg',
    success: 'bg-success-bg text-success-fg',
    info: 'bg-primary-soft text-primary-ink',
  };
  return (
    <div role={tone === 'danger' ? 'alert' : 'note'} className={cn('rounded-xl px-4 py-3 text-sm leading-7', tones[tone], className)}>
      {title && <p className="font-bold">{title}</p>}
      {children && <div className={title ? 'mt-0.5' : undefined}>{children}</div>}
    </div>
  );
}
