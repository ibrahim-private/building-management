import { describe, expect, it } from 'vitest';
import {
  FIRST_PAGE_ROWS,
  footerLines,
  paginateRows,
  sheetColumnHeaders,
  sheetColumnWidths,
  sheetSubtitle,
  sheetTitle,
} from './sheetLayout';

describe('sheet titles', () => {
  it('builds the two title lines like the paper sheet', () => {
    expect(sheetTitle('46')).toBe('ايرادات العمارة 46');
    expect(sheetTitle('  ')).toBe('ايرادات العمارة');
    expect(sheetSubtitle('2026-07-01', '2026-08-31')).toBe('اشتراكات يوليو - أغسطس / 2026م');
    expect(sheetSubtitle('2026-11-01', '2026-11-30')).toBe('اشتراكات نوفمبر / 2026م');
    expect(sheetSubtitle('2026-12-01', '2027-01-31')).toBe('اشتراكات ديسمبر 2026 - يناير 2027م');
  });
});

describe('column headers', () => {
  it('adds following columns of the same length', () => {
    expect(sheetColumnHeaders('2026-07-01', '2026-08-31', 2)).toEqual([
      'يوليو/أغسطس',
      'سبتمبر/أكتوبر',
      'نوفمبر/ديسمبر',
    ]);
  });

  it('rolls over the year and supports one-month periods', () => {
    expect(sheetColumnHeaders('2026-11-01', '2026-12-31', 1)).toEqual(['نوفمبر/ديسمبر', 'يناير/فبراير']);
    expect(sheetColumnHeaders('2026-03-01', '2026-03-31', 2)).toEqual(['مارس', 'أبريل', 'مايو']);
  });

  it('keeps widths summing to 100', () => {
    for (const k of [0, 1, 2, 3]) {
      expect(sheetColumnWidths(k).reduce((a, b) => a + b, 0)).toBe(100);
    }
  });
});

describe('pagination', () => {
  it('matches the paper sheet: 25 rows on page 1, the rest with the footer on page 2', () => {
    expect(FIRST_PAGE_ROWS).toBe(25);
    const rows = Array.from({ length: 45 }, (_, i) => i);
    const pages = paginateRows(rows);
    expect(pages.map((p) => p.length)).toEqual([25, 20]);
    expect(pages.flat()).toEqual(rows);
  });

  it('always leaves room for the footer on the last page', () => {
    const pages = paginateRows(Array.from({ length: 25 }, (_, i) => i));
    expect(pages.map((p) => p.length)).toEqual([25, 0]);
    expect(paginateRows([1, 2, 3]).length).toBe(1);
    expect(paginateRows([]).length).toBe(1);
  });
});

describe('footer', () => {
  it('writes plain numbers', () => {
    const lines = footerLines({
      paidCount: 23,
      collected: 2754000,
      paidExpenses: 214000,
      previousBalance: 137000,
      currentBalance: 748000,
      today: '2026-12-31',
    });
    expect(lines[0]).toBe('إجمالي المبلغ المحصل من 23 وحدة فقط (27540 جنيه)');
    expect(lines[1]).toContain('(25400 جنيه)');
    expect(lines[1]).toContain('رصيد سابق (1370 جنيه)');
    expect(lines[2]).toBe('رصيد صندوق العمارة بتاريخ 2026/12/31م مبلغ وقدره (7480 جنيه فقط)');
  });
});
