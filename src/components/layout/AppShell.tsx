import { Building, Settings } from 'lucide-react';
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom';
import { LoadingState } from '@/components/ui/feedback';
import { APP_NAME } from '@/constants/app';
import { useSettings } from '@/hooks/useData';
import { BottomNav } from './BottomNav';
import { ConnectionIndicator } from './ConnectionIndicator';
import { Sidebar } from './Sidebar';

/** Layout for every screen except first-time setup. */
export function AppShell() {
  const settings = useSettings();
  const { pathname } = useLocation();

  if (!settings) return <LoadingState />;
  if (!settings.setupCompleted) return <Navigate to="/setup" replace />;

  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-card/95 px-4 py-2.5 backdrop-blur lg:hidden">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white">
              <Building className="h-5 w-5" aria-hidden />
            </div>
            <span className="text-base font-bold text-ink">{APP_NAME}</span>
          </div>
          <div className="flex items-center gap-2">
            <ConnectionIndicator compact />
            <Link
              to="/settings"
              aria-label="الإعدادات"
              aria-current={pathname.startsWith('/settings') ? 'page' : undefined}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-muted hover:bg-soft"
            >
              <Settings className="h-5 w-5" />
            </Link>
          </div>
        </header>

        {/* pb-28 keeps the last content clear of the fixed bottom bar on mobile */}
        <main className="page-container flex-1 pb-28 pt-5 lg:pb-10 lg:pt-8">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
