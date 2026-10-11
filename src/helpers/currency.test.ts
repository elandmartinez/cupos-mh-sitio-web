import { describe, expect, it } from 'vitest';
import { formatCurrency } from './currency';

describe('formatCurrency', () => {
  it('separates thousands with a dot and drops decimals', () => {
    expect(formatCurrency(180000)).toBe('180.000');
    expect(formatCurrency(1234567)).toBe('1.234.567');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('0');
  });

  it('treats null and undefined as zero', () => {
    expect(formatCurrency(null)).toBe('0');
    expect(formatCurrency(undefined)).toBe('0');
  });
});
