import { toast } from 'sonner';
import { registerSW } from 'virtual:pwa-register';

/**
 * Registers the service worker (production builds only).
 * - First install: tells the user the app is ready to work offline.
 * - New version: asks before reloading, so nothing is interrupted mid-operation.
 */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD) return;

  const updateSW = registerSW({
    onOfflineReady() {
      toast.success('التطبيق جاهز للعمل بدون إنترنت.');
    },
    onNeedRefresh() {
      toast('يتوفر إصدار جديد من التطبيق', {
        duration: Infinity,
        action: { label: 'تحديث الآن', onClick: () => void updateSW(true) },
      });
    },
  });
}
