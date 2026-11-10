import { Building } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { APP_NAME } from '@/constants/app';
import { cn } from '@/utils/cn';
import { ConnectionIndicator } from './ConnectionIndicator';
import { NAV_ITEMS, isNavActive } from './navItems';

const ORDER = ['dashboard', 'units', 'expenses', 'treasury', 'records', 'settings'] as const;

/** Desktop navigation (hidden below the lg breakpoint). */
export function Sidebar() {
  const { pathname } = useLocation();
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-e border-line bg-card lg:flex">
      <div className="flex items-center gap-3 px-5 py-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-white shadow-sm">
          <Building className="h-6 w-6" aria-hidden />
        </div>
        <div>
          <p className="text-lg font-bold leading-tight text-ink">{APP_NAME}</p>
          <p className="text-xs text-muted">الحسابات والخزينة</p>
        </div>
      </div>

      <nav aria-label="التنقل الرئيسي" className="flex-1 space-y-1 px-3">
        {ORDER.map((key) => {
          const item = NAV_ITEMS[key];
          const active = isNavActive(item, pathname);
          const Icon = item.icon;
          return (
            <Link
              key={key}
              to={item.to}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex min-h-[48px] items-center gap-3 rounded-xl px-4 text-base font-semibold transition-colors',
                active ? 'bg-primary-soft text-primary-ink' : 'text-muted hover:bg-soft hover:text-ink',
              )}
            >
              <Icon className="h-5 w-5" aria-hidden />
              {item.label}
              {active && <span className="ms-auto h-2 w-2 rounded-full bg-primary" aria-hidden />}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-line px-5 py-4">
        <ConnectionIndicator />
        <p className="mt-2 text-xs leading-5 text-muted">البيانات محفوظة على هذا الجهاز فقط.</p>
      </div>
    </aside>
  );
}
