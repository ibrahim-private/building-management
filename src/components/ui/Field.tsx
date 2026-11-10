import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/utils/cn';

interface FieldShellProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: (ids: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
}

/** Label + control + hint + validation error placed right under the field. */
export function FieldShell({ label, error, hint, required, className, children }: FieldShellProps) {
  const id = useId();
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-sm font-semibold text-ink">
        {label}
        {required && <span className="ms-1 text-danger-fg" aria-hidden>*</span>}
      </label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {error ? (
        <p id={`${id}-err`} role="alert" className="text-sm font-medium text-danger-fg">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

interface BaseProps {
  label: string;
  error?: string;
  hint?: string;
}

const invalidClass = 'border-danger-fg focus:border-danger-fg focus:ring-danger-fg/30';

export const TextField = forwardRef<HTMLInputElement, BaseProps & InputHTMLAttributes<HTMLInputElement>>(
  function TextField({ label, error, hint, className, required, ...rest }, ref) {
    return (
      <FieldShell label={label} error={error} hint={hint} required={required} className={className}>
        {({ id, describedBy, invalid }) => (
          <input
            ref={ref}
            id={id}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            className={cn('input-base', invalid && invalidClass)}
            {...rest}
          />
        )}
      </FieldShell>
    );
  },
);

/** Amount input: free text accepting Arabic/Latin digits; parsed by parseMoneyInput. */
export const MoneyField = forwardRef<HTMLInputElement, BaseProps & InputHTMLAttributes<HTMLInputElement>>(
  function MoneyField({ label, error, hint, className, required, ...rest }, ref) {
    return (
      <FieldShell label={label} error={error} hint={hint} required={required} className={className}>
        {({ id, describedBy, invalid }) => (
          <div className="relative">
            <input
              ref={ref}
              id={id}
              inputMode="decimal"
              autoComplete="off"
              dir="ltr"
              aria-invalid={invalid || undefined}
              aria-describedby={describedBy}
              className={cn('input-base pe-14 text-start', invalid && invalidClass)}
              {...rest}
            />
            <span className="pointer-events-none absolute inset-y-0 end-3 flex items-center text-sm text-muted">
              ج.م
            </span>
          </div>
        )}
      </FieldShell>
    );
  },
);

export const TextAreaField = forwardRef<HTMLTextAreaElement, BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function TextAreaField({ label, error, hint, className, required, rows = 3, ...rest }, ref) {
    return (
      <FieldShell label={label} error={error} hint={hint} required={required} className={className}>
        {({ id, describedBy, invalid }) => (
          <textarea
            ref={ref}
            id={id}
            rows={rows}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            className={cn('input-base resize-y', invalid && invalidClass)}
            {...rest}
          />
        )}
      </FieldShell>
    );
  },
);

export const SelectField = forwardRef<HTMLSelectElement, BaseProps & SelectHTMLAttributes<HTMLSelectElement>>(
  function SelectField({ label, error, hint, className, required, children, ...rest }, ref) {
    return (
      <FieldShell label={label} error={error} hint={hint} required={required} className={className}>
        {({ id, describedBy, invalid }) => (
          <select
            ref={ref}
            id={id}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            className={cn('input-base', invalid && invalidClass)}
            {...rest}
          >
            {children}
          </select>
        )}
      </FieldShell>
    );
  },
);
