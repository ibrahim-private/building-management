import { Archive, Building2, LayoutDashboard, Receipt, Settings, Wallet, type LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** path prefixes that should light up this item */
  match: string[];
  end?: boolean;
}

export const NAV_ITEMS: Record<'dashboard' | 'units' | 'expenses' | 'treasury' | 'records' | 'settings', NavItem> = {
  dashboard: { to: '/', label: 'الرئيسية', icon: LayoutDashboard, match: ['/'], end: true },
  units: { to: '/units', label: 'الشقق والمنشآت', icon: Building2, match: ['/units'] },
  expenses: { to: '/expenses', label: 'المصروفات', icon: Receipt, match: ['/expenses'] },
  treasury: { to: '/treasury', label: 'الخزينة', icon: Wallet, match: ['/treasury'] },
  records: { to: '/records', label: 'السجلات المالية', icon: Archive, match: ['/records', '/periods'] },
  settings: { to: '/settings', label: 'الإعدادات', icon: Settings, match: ['/settings'] },
};

export function isNavActive(item: NavItem, pathname: string): boolean {
  if (item.end) return pathname === item.to;
  return item.match.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
