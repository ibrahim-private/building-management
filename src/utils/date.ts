/**
 * Dates are stored as local calendar days in "YYYY-MM-DD" form so they can be
 * compared as plain strings and never shift because of time zones.
 */

const MONTHS_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

const pad = (n: number) => String(n).padStart(2, '0');

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return toISODate(parseISODate(value)) === value;
}

export function addDaysISO(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

/** Whole days from a to b (b - a). */
export function diffDaysISO(a: string, b: string): number {
  const ms = parseISODate(b).getTime() - parseISODate(a).getTime();
  return Math.round(ms / 86_400_000);
}

export function isDateWithin(date: string, start: string, end: string): boolean {
  return date >= start && date <= end;
}

export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

/** "9 نوفمبر 2026" */
export function formatDate(iso: string | undefined | null): string {
  if (!iso) return '—';
  const d = parseISODate(iso);
  return `${d.getDate()} ${MONTHS_AR[d.getMonth()]} ${d.getFullYear()}`;
}

/** "09/11/2026" */
export function formatDateShort(iso: string | undefined | null): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function formatDateRange(start: string, end: string): string {
  return `${formatDateShort(start)} – ${formatDateShort(end)}`;
}

/** Suggests a readable period name from its dates, e.g. "سبتمبر – أكتوبر 2026". */
export function suggestPeriodName(start: string, end: string): string {
  const s = parseISODate(start);
  const e = parseISODate(end);
  const sm = MONTHS_AR[s.getMonth()];
  const em = MONTHS_AR[e.getMonth()];
  if (s.getFullYear() === e.getFullYear()) {
    return s.getMonth() === e.getMonth()
      ? `${sm} ${s.getFullYear()}`
      : `${sm} – ${em} ${s.getFullYear()}`;
  }
  return `${sm} ${s.getFullYear()} – ${em} ${e.getFullYear()}`;
}

/** "9 نوفمبر 2026 - 14:05" for report footers. */
export function formatDateTime(d: Date = new Date()): string {
  return `${formatDate(toISODate(d))} - ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
