/**
 * Money helpers. All stored amounts are integers in piastres (1 EGP = 100).
 * Floating point numbers are never used for stored or summed values.
 */

export const MINOR_PER_MAJOR = 100;
export const CURRENCY_LABEL = 'ج.م';

const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩';
const EXTENDED_INDIC = '۰۱۲۳۴۵۶۷۸۹';

function normalizeDigits(raw: string): string {
  return raw
    .replace(/[٠-٩]/g, (d) => String(ARABIC_INDIC.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String(EXTENDED_INDIC.indexOf(d)))
    .replace(/[٫]/g, '.')
    .replace(/[٬,\s]/g, '');
}

/**
 * Parses user input such as "150", "150.5", "١٥٠٫٥٠" or "1,250" into piastres.
 * Returns null for anything invalid (negative, letters, more than 2 decimals).
 */
export function parseMoneyInput(raw: string): number | null {
  const cleaned = normalizeDigits(raw.trim());
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const [intPart, fracPart = ''] = cleaned.split('.');
  const minor = Number(intPart) * MINOR_PER_MAJOR + Number(fracPart.padEnd(2, '0'));
  return Number.isSafeInteger(minor) ? minor : null;
}

/** Piastres -> editable text like "150" or "150.5" (for form defaults). */
export function minorToInputString(minor: number): string {
  const major = Math.trunc(minor / MINOR_PER_MAJOR);
  const frac = minor % MINOR_PER_MAJOR;
  if (frac === 0) return String(major);
  return `${major}.${String(frac).padStart(2, '0').replace(/0$/, '')}`;
}

/** Piastres -> "1,250" / "1,250.50" (Latin digits, no currency). */
export function formatNumber(minor: number): string {
  const sign = minor < 0 ? '‎-' : '';
  const abs = Math.abs(minor);
  const major = Math.trunc(abs / MINOR_PER_MAJOR);
  const frac = abs % MINOR_PER_MAJOR;
  const intStr = String(major).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}${frac ? `${intStr}.${String(frac).padStart(2, '0')}` : intStr}`;
}

/** Piastres -> "1,250 ج.م" */
export function formatMoney(minor: number): string {
  return `${formatNumber(minor)} ${CURRENCY_LABEL}`;
}

export function sumMinor(values: readonly number[]): number {
  return values.reduce((total, v) => total + v, 0);
}
