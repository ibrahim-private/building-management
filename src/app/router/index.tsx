import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { ExpensesPage } from '@/features/expenses/ExpensesPage';
import { PeriodsPage } from '@/features/periods/PeriodsPage';
import { RecordsPage } from '@/features/records/RecordsPage';
import { PeriodDetailPage } from '@/features/records/PeriodDetailPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { SetupPage } from '@/features/setup/SetupPage';
import { TreasuryPage } from '@/features/treasury/TreasuryPage';
import { UnitDetailPage } from '@/features/units/UnitDetailPage';
import { UnitsPage } from '@/features/units/UnitsPage';

export const router = createBrowserRouter(
  [
    { path: '/setup', element: <SetupPage /> },
    {
      element: <AppShell />,
      children: [
        { index: true, element: <DashboardPage /> },
        { path: 'units', element: <UnitsPage /> },
        { path: 'units/:unitId', element: <UnitDetailPage /> },
        { path: 'expenses', element: <ExpensesPage /> },
        { path: 'treasury', element: <TreasuryPage /> },
        { path: 'records', element: <RecordsPage /> },
        { path: 'records/:periodId', element: <PeriodDetailPage /> },
        { path: 'periods', element: <PeriodsPage /> },
        { path: 'settings', element: <SettingsPage /> },
        { path: '*', element: <Navigate to="/" replace /> },
      ],
    },
  ],
  { basename: import.meta.env.BASE_URL.replace(/\/$/, '') || undefined },
);
