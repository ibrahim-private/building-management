import type { TransactionFilters } from '../finance/filters';
import {
  buildExpenseReport,
  buildTreasuryReport,
  buildUnitReport,
} from './builders';
import { renderReportPdf } from './renderer';

/** One-call exports used by the UI: build the report model, then render + download. */

export const exportExpensesPdf = async (periodId?: string) =>
  renderReportPdf(await buildExpenseReport(periodId));

export const exportTreasuryPdf = async (filters: TransactionFilters = {}) =>
  renderReportPdf(await buildTreasuryReport(filters));

export const exportUnitPdf = async (unitId: string) =>
  renderReportPdf(await buildUnitReport(unitId));
