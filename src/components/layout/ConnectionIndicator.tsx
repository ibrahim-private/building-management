import { Wifi, WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { cn } from '@/utils/cn';

/** Subtle connectivity hint. Offline is a normal state for this app, not an error. */
export function ConnectionIndicator({ compact = false }: { compact?: boolean }) {
  const online = useOnlineStatus();
  const Icon = online ? Wifi : WifiOff;
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 text-xs font-medium', online ? 'text-muted' : 'text-warn-fg')}
      title={online ? 'متصل بالإنترنت' : 'تعمل الآن بدون إنترنت'}
    >
      <Icon className="h-4 w-4" aria-hidden />
      {!compact && (online ? 'متصل بالإنترنت' : 'تعمل بدون إنترنت - كل شيء يعمل بشكل طبيعي')}
      {compact && !online && 'بدون إنترنت'}
    </span>
  );
}
