import { useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { LoadingState } from '@/components/ui/feedback';
import { runAutoPeriodCreation } from '@/services/period/periodService';

/**
 * Runs once at start-up before any screen renders:
 * the optional automatic period creation (off by default, at most one period).
 * A failure here never blocks the app.
 */
export function BootGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    runAutoPeriodCreation()
      .then((created) => {
        if (created && !cancelled) {
          toast.info(`تم إنشاء الفترة "${created.name}" تلقائياً. راجع المبالغ من لوحة التحكم.`, { duration: 8000 });
        }
      })
      .catch((error) => console.error('Automatic period creation failed:', error))
      .finally(() => !cancelled && setReady(true));
    return () => {
      cancelled = true;
    };
  }, []);

  return ready ? <>{children}</> : <LoadingState />;
}
