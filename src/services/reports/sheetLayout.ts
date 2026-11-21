import { MONTHS_AR, formatDateSlash, parseISODate } from '@/utils/date';
import { formatPlain } from '@/utils/money';

/**
 * Pure layout rules for the printed "subscriptions sheet" (A4, black on white).
 * Nothing here touches the database or the DOM, so it is easy to test.
 */

// ---- A4 geometry in CSS pixels (96 dpi) -------------------------------------
export const PAGE_W = 794;
export const PAGE_H = 1123;
export const PAGE_PAD = 40;
export const CONTENT_H = PAGE_H - PAGE_PAD * 2;
export const TITLE_H = 96; // two title lines (first page only)
export const HEAD_H = 38; // table header row (first page only)
export const ROW_H = 36;
export const FOOTER_H = 150; // summary lines under the table (last page)

export const FIRST_PAGE_ROWS = Math.floor((CONTENT_H - TITLE_H - HEAD_H) / ROW_H);
export const NEXT_PAGE_ROWS = Math.floor(CONTENT_H / ROW_H);
export const FOOTER_ROWS = Math.ceil(FOOTER_H / ROW_H);

/** Default number of empty columns after the selected period (matches the paper sheet). */
export const DEFAULT_FOLLOWING_COLUMNS = 2;
export const MAX_FOLLOWING_COLUMNS = 3;

// ---- months -----------------------------------------------------------------

interface MonthRef {
  year: number;
  month: number; // 0-11
}

function monthIndex(ref: MonthRef): number {
  return ref.year * 12 + ref.month;
}

function fromIndex(index: number): MonthRef {
  return { year: Math.floor(index / 12), month: ((index % 12) + 12) % 12 };
}

/** Calendar months touched by a period, e.g. 1 Jul – 31 Aug -> [Jul, Aug]. */
export function periodMonths(startDate: string, endDate: string): MonthRef[] {
  const s = parseISODate(startDate);
  const e = parseISODate(endDate);
  const first = s.getFullYear() * 12 + s.getMonth();
  const last = Math.max(first, e.getFullYear() * 12 + e.getMonth());
  const months: MonthRef[] = [];
  for (let i = first; i <= last; i += 1) months.push(fromIndex(i));
  return months;
}

/** "يوليو/أغسطس" (long spans are shortened to "يناير - ديسمبر"). */
export function monthsLabel(months: readonly MonthRef[]): string {
  const names = months.map((m) => MONTHS_AR[m.month]);
  if (names.length <= 4) return names.join('/');
  return `${names[0]} - ${names[names.length - 1]}`;
}

/**
 * Column headers: the selected period, then the same number of months again for
 * each following column. Jul–Aug with 2 following -> Jul/Aug, Sep/Oct, Nov/Dec.
 */
export function sheetColumnHeaders(startDate: string, endDate: string, followingCount: number): string[] {
  const months = periodMonths(startDate, endDate);
  const span = months.length;
  const base = monthIndex(months[0]);
  const headers: string[] = [];
  for (let col = 0; col <= followingCount; col += 1) {
    const group = Array.from({ length: span }, (_, i) => fromIndex(base + col * span + i));
    headers.push(monthsLabel(group));
  }
  return headers;
}

/** "اشتراكات يوليو - أغسطس / 2026م" */
export function sheetSubtitle(startDate: string, endDate: string): string {
  const months = periodMonths(startDate, endDate);
  const first = months[0];
  const last = months[months.length - 1];
  if (first.year !== last.year) {
    return `اشتراكات ${MONTHS_AR[first.month]} ${first.year} - ${MONTHS_AR[last.month]} ${last.year}م`;
  }
  const range =
    first.month === last.month ? MONTHS_AR[first.month] : `${MONTHS_AR[first.month]} - ${MONTHS_AR[last.month]}`;
  return `اشتراكات ${range} / ${first.year}م`;
}

/** "ايرادات العمارة 46" */
export function sheetTitle(buildingName: string): string {
  const name = buildingName.trim();
  return name ? `ايرادات العمارة ${name}` : 'ايرادات العمارة';
}

// ---- columns ----------------------------------------------------------------

/** Column widths in percent: [unit, selected period, ...following, notes]. */
export function sheetColumnWidths(followingCount: number): number[] {
  const unit = 9;
  const period = 18;
  const following = 14;
  const notes = Math.max(15, 100 - unit - period - following * followingCount);
  return [unit, period, ...Array.from({ length: followingCount }, () => following), notes];
}

// ---- pagination ---------------------------------------------------------------

/**
 * Splits rows into pages so that the LAST page always has room for the summary footer.
 * Page 1 holds fewer rows because of the title block and the header row.
 */
export function paginateRows<T>(
  rows: readonly T[],
  firstCap: number = FIRST_PAGE_ROWS,
  nextCap: number = NEXT_PAGE_ROWS,
  footerRows: number = FOOTER_ROWS,
): T[][] {
  const pages: T[][] = [];
  let rest = [...rows];
  for (;;) {
    const cap = pages.length === 0 ? firstCap : nextCap;
    if (rest.length + footerRows <= cap) {
      pages.push(rest);
      return pages;
    }
    pages.push(rest.slice(0, cap));
    rest = rest.slice(cap);
    if (rest.length === 0) {
      pages.push([]); // footer alone on its own page
      return pages;
    }
  }
}

// ---- summary lines (editable on screen) ------------------------------------------

export interface SheetTotals {
  paidCount: number;
  collected: number; // piastres
  paidExpenses: number;
  previousBalance: number;
  currentBalance: number;
  today: string; // ISO date
}

export function footerLines(t: SheetTotals): string[] {
  return [
    `إجمالي المبلغ المحصل من ${t.paidCount} وحدة فقط (${formatPlain(t.collected)} جنيه)`,
    `الرصيد المتبقي بعد خصم المصروفات: (${formatPlain(t.collected - t.paidExpenses)} جنيه) + رصيد سابق (${formatPlain(t.previousBalance)} جنيه)`,
    `رصيد صندوق العمارة بتاريخ ${formatDateSlash(t.today)}م مبلغ وقدره (${formatPlain(t.currentBalance)} جنيه فقط)`,
  ];
}
