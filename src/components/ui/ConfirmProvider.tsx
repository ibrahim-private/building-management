import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { AlertTriangle } from 'lucide-react';
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { Button } from './Button';

export interface ConfirmOptions {
  title: string;
  description?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  /** danger = red confirm button (undo / delete); default = primary */
  tone?: 'default' | 'danger';
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * Promise-based confirmation dialog:
 *   const confirm = useConfirm();
 *   if (!(await confirm({ title: '...', tone: 'danger' }))) return;
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((opts) => {
    // A second request while one is open cancels the first.
    resolver.current?.(false);
    setOptions(opts);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = (value: boolean) => {
    resolver.current?.(value);
    resolver.current = null;
    setOptions(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog.Root open={options !== null} onOpenChange={(open) => !open && settle(false)}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="bm-overlay fixed inset-0 z-[60] bg-slate-900/50" />
          <AlertDialog.Content
            dir="rtl"
            className="bm-dialog fixed left-1/2 top-1/2 z-[60] w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-line bg-card p-5 shadow-xl"
          >
            <div className="flex gap-3">
              <div
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                  options?.tone === 'danger' ? 'bg-danger-bg text-danger-fg' : 'bg-warn-bg text-warn-fg',
                )}
              >
                <AlertTriangle className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0 space-y-1.5">
                <AlertDialog.Title className="text-lg font-bold text-ink">{options?.title}</AlertDialog.Title>
                <AlertDialog.Description asChild>
                  <div className="whitespace-pre-line text-sm leading-7 text-muted">{options?.description}</div>
                </AlertDialog.Description>
              </div>
            </div>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-start">
              <AlertDialog.Action asChild>
                <Button variant={options?.tone === 'danger' ? 'danger' : 'primary'} onClick={() => settle(true)}>
                  {options?.confirmText ?? 'تأكيد'}
                </Button>
              </AlertDialog.Action>
              <AlertDialog.Cancel asChild>
                <Button variant="secondary" onClick={() => settle(false)}>
                  {options?.cancelText ?? 'إلغاء'}
                </Button>
              </AlertDialog.Cancel>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used inside <ConfirmProvider>');
  return ctx;
}
