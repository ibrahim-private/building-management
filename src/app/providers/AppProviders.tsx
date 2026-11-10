import type { ReactNode } from 'react';
import { Toaster } from 'sonner';
import { ConfirmProvider } from '@/components/ui/ConfirmProvider';
import { BootGate } from './BootGate';
import { ErrorBoundary } from './ErrorBoundary';
import { ThemeEffect } from './ThemeProvider';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <ConfirmProvider>
        <ThemeEffect />
        <BootGate>{children}</BootGate>
        <Toaster
          dir="rtl"
          position="top-center"
          richColors
          closeButton
          toastOptions={{ style: { fontFamily: 'inherit', fontSize: '0.95rem' } }}
        />
      </ConfirmProvider>
    </ErrorBoundary>
  );
}
