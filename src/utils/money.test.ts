import { describe, expect, it } from 'vitest';
import { formatMoney, formatNumber, minorToInputString, parseMoneyInput } from './money';

describe('parseMoneyInput', () => {
  it('parses whole and decimal values into piastres', () => {
    expect(parseMoneyInput('150')).toBe(15000);
    expect(parseMoneyInput('150.5')).toBe(15050);
    expect(parseMoneyInput('0.07')).toBe(7);
    expect(parseMoneyInput('1,250')).toBe(125000);
  });

  it('handles Arabic-Indic digits and separators', () => {
    expect(parseMoneyInput('١٥٠')).toBe(15000);
    expect(parseMoneyInput('١٥٠٫٢٥')).toBe(15025);
  });

  it('avoids floating point drift', () => {
    expect(parseMoneyInput('19.99')).toBe(1999);
    expect(parseMoneyInput('0.1')).toBe(10);
    expect(parseMoneyInput('1.15')).toBe(115);
  });

  it('rejects invalid input', () => {
    expect(parseMoneyInput('')).toBeNull();
    expect(parseMoneyInput('-5')).toBeNull();
    expect(parseMoneyInput('abc')).toBeNull();
    expect(parseMoneyInput('1.234')).toBeNull();
  });
});

describe('formatting', () => {
  it('formats piastres for display', () => {
    expect(formatNumber(125000)).toBe('1,250');
    expect(formatNumber(125050)).toBe('1,250.50');
    expect(formatMoney(15000)).toBe('150 ج.م');
  });

  it('round-trips through the input string', () => {
    expect(minorToInputString(15000)).toBe('150');
    expect(minorToInputString(15050)).toBe('150.5');
    expect(minorToInputString(15025)).toBe('150.25');
  });
});
