import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AppError, INFO_ERROR_CODES, getErrorMessage } from '@/utils/errors';

export type ActionResult<T> = { ok: true; value: T } | { ok: false; error: unknown };

/**
 * Runs a service call with consistent feedback:
 *  - ignores re-entry while a call is running (double tap protection at the UI level),
 *  - shows a success toast, or an Arabic error toast,
 *  - "nothing to do" errors (already paid / not paid) are shown as info, not failure.
 */
export function useAction() {
  const busy = useRef(false);
  const [pending, setPending] = useState(false);

  const run = useCallback(
    async <T>(work: () => Promise<T>, successMessage?: string): Promise<ActionResult<T>> => {
      if (busy.current) return { ok: false, error: null };
      busy.current = true;
      setPending(true);
      try {
        const value = await work();
        if (successMessage) toast.success(successMessage);
        return { ok: true, value };
      } catch (error) {
        if (error instanceof AppError && INFO_ERROR_CODES.has(error.code)) {
          toast.info(error.message);
        } else {
          toast.error(getErrorMessage(error), { duration: 6000 });
          if (!(error instanceof AppError)) console.error(error);
        }
        return { ok: false, error };
      } finally {
        busy.current = false;
        setPending(false);
      }
    },
    [],
  );

  return { run, pending };
}
