import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/utils/cn';
import { NAV_ITEMS, isNavActive, type NavItem } from './navItems';

/**
 * Mobile bottom bar. In RTL the first DOM item is on the right, so visually (right to left):
 * [الشقق] [المصروفات]  ( الرئيسية )  [الخزينة] [السجلات]
 * The dashboard sits in the centre, larger and raised. Settings lives in the top bar.
 */
const LEFT_OF_CENTER: NavItem[] = [NAV_ITEMS.units, NAV_ITEMS.expenses];
const RIGHT_OF_CENTER: NavItem[] = [NAV_ITEMS.treasury, NAV_ITEMS.records];

function SideItem({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isNavActive(item, pathname);
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-semibold leading-tight transition-colors',
        active ? 'text-primary' : 'text-muted',
      )}
    >
      <Icon className={cn('h-6 w-6', active && 'stroke-[2.4]')} aria-hidden />
      <span className="text-center">{item.label}</span>
    </Link>
  );
}

export function BottomNav() {
  const { pathname } = useLocation();
  const home = NAV_ITEMS.dashboard;
  const HomeIcon = home.icon;
  const homeActive = isNavActive(home, pathname);

  return (
    <nav
      aria-label="التنقل الرئيسي"
      className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card shadow-nav lg:hidden"
    >
      <div className="mx-auto flex max-w-lg items-end">
        {LEFT_OF_CENTER.map((item) => (
          <SideItem key={item.to} item={item} pathname={pathname} />
        ))}

        <Link
          to={home.to}
          aria-current={homeActive ? 'page' : undefined}
          className="relative flex flex-1 flex-col items-center pb-1.5 text-[11px] font-bold"
        >
          <span
            className={cn(
              '-mt-6 flex h-16 w-16 items-center justify-center rounded-full border-4 border-card shadow-lg transition-colors',
              homeActive ? 'bg-primary text-white' : 'bg-primary-soft text-primary-ink',
            )}
          >
            <HomeIcon className="h-7 w-7" aria-hidden />
          </span>
          <span className={cn('mt-0.5', homeActive ? 'text-primary' : 'text-muted')}>{home.label}</span>
        </Link>

        {RIGHT_OF_CENTER.map((item) => (
          <SideItem key={item.to} item={item} pathname={pathname} />
        ))}
      </div>
    </nav>
  );
}
