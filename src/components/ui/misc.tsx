import { Search, X } from 'lucide-react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { formatMoney } from '@/utils/money';

/** Amount with currency; `bdi` keeps digits correctly ordered in RTL text. */
export function Money({ value, className, signed }: { value: number; className?: string; signed?: 'in' | 'out' }) {
  const prefix = signed === 'in' ? '+' : signed === 'out' ? '−' : '';
  return (
    <bdi className={cn('num font-semibold tabular-nums', className)}>
      {prefix}
      {formatMoney(value)}
    </bdi>
  );
}

export function ProgressBar({ percent, className, label }: { percent: number; className?: string; label?: string }) {
  const safe = Math.max(0, Math.min(100, percent));
  return (
    <div
      role="progressbar"
      aria-valuenow={safe}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? 'نسبة التحصيل'}
      className={cn('h-3 w-full overflow-hidden rounded-full bg-soft', className)}
    >
      <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${safe}%` }} />
    </div>
  );
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold text-ink sm:text-3xl">{title}</h1>
        {description && <div className="mt-1 text-sm text-muted sm:text-base">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon,
  tone = 'neutral',
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  tone?: 'neutral' | 'success' | 'warn' | 'primary';
}) {
  const tones = {
    neutral: 'bg-soft text-muted',
    success: 'bg-success-bg text-success-fg',
    warn: 'bg-warn-bg text-warn-fg',
    primary: 'bg-primary-soft text-primary-ink',
  };
  return (
    <div className="card flex items-center gap-3 p-4">
      <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', tones[tone])}>{icon}</div>
      <div className="min-w-0">
        <p className="text-sm text-muted">{label}</p>
        <p className="num text-2xl font-bold tabular-nums text-ink">{value}</p>
      </div>
    </div>
  );
}

export function SearchInput({
  value,
  onValueChange,
  placeholder = 'بحث...',
  className,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> & {
  value: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute start-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="input-base ps-10 pe-10"
        {...rest}
      />
      {value && (
        <button
          type="button"
          onClick={() => onValueChange('')}
          aria-label="مسح البحث"
          className="absolute end-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted hover:bg-soft"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/** Segmented tabs for switching between a few views. */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; count?: number }[];
  className?: string;
}) {
  return (
    <div role="tablist" className={cn('inline-flex max-w-full overflow-x-auto rounded-xl bg-soft p-1', className)}>
      {options.map((opt) => (
        <button
          key={opt.value}
          role="tab"
          type="button"
          aria-selected={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'min-h-[38px] whitespace-nowrap rounded-lg px-3.5 text-sm font-semibold transition-colors',
            value === opt.value ? 'bg-card text-ink shadow-sm' : 'text-muted hover:text-ink',
          )}
        >
          {opt.label}
          {opt.count !== undefined && <span className="num ms-1.5 text-xs opacity-70">{opt.count}</span>}
        </button>
      ))}
    </div>
  );
}

/** Accessible on/off toggle. */
export function Switch({
  checked,
  onCheckedChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-base font-semibold text-ink">{label}</p>
        {description && <p className="mt-0.5 text-sm leading-6 text-muted">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          'relative mt-1 inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:opacity-50',
          checked ? 'bg-primary' : 'bg-line',
        )}
      >
        <span
          className={cn(
            'inline-block h-5 w-5 rounded-full bg-white shadow transition-all',
            checked ? 'end-1' : 'start-1',
            'absolute',
          )}
        />
      </button>
    </div>
  );
}

/** Responsive table wrapper: scrolls inside the card instead of the page. */
export function TableWrap({ children }: { children: ReactNode }) {
  return <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">{children}</div>;
}

export const thClass = 'whitespace-nowrap border-b border-line px-3 py-2.5 text-start text-xs font-bold text-muted';
export const tdClass = 'border-b border-line/70 px-3 py-3 text-sm align-middle';
