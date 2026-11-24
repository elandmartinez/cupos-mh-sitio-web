import { describe, expect, it } from 'vitest';
import { formatDate, toDisplayDate, toIsoDate } from './date';

describe('formatDate', () => {
  it('formats a bare date column without shifting the day', () => {
    const formatted = formatDate('2026-10-04');
    // A `YYYY-MM-DD` column is normalized to local midnight, so the day is
    // always 4 here, never 3 — in every timezone (the bug the helper guards
    // against). The exact connector wording varies by ICU version, so assert
    // the stable parts rather than one full string.
    expect(formatted?.startsWith('4 ')).toBe(true);
    expect(formatted).toContain('oct');
    expect(formatted).toContain('2026');
  });

  it('formats a full timestamptz', () => {
    expect(formatDate('2026-10-04T15:30:00Z')).not.toBeNull();
  });

  it('returns null for missing or unparseable input', () => {
    expect(formatDate(null)).toBeNull();
    expect(formatDate(undefined)).toBeNull();
    expect(formatDate('')).toBeNull();
    expect(formatDate('no-es-una-fecha')).toBeNull();
  });

  it('renders the English month name for en-US', () => {
    const formatted = formatDate('2026-10-04', 'en-US');
    // Asserted on the stable parts (month + year) rather than the punctuation,
    // which ICU versions disagree about — same rule as the Spanish case above.
    expect(formatted).toContain('Oct');
    expect(formatted).toContain('2026');
    expect(formatted).not.toContain('oct');
  });
});

describe('toDisplayDate', () => {
  it('renders DD/MM/YYYY from an ISO date', () => {
    expect(toDisplayDate('2026-11-22')).toBe('22/11/2026');
  });

  it('renders empty for missing or malformed input', () => {
    expect(toDisplayDate('')).toBe('');
    expect(toDisplayDate(null)).toBe('');
    expect(toDisplayDate(undefined)).toBe('');
    expect(toDisplayDate('2026-11')).toBe('');
  });
});

describe('toIsoDate', () => {
  it('parses DD/MM/YYYY into ISO', () => {
    expect(toIsoDate('22/11/2026')).toBe('2026-11-22');
    expect(toIsoDate('05/03/2026')).toBe('2026-03-05');
  });

  it('rejects impossible calendar dates', () => {
    expect(toIsoDate('31/02/2026')).toBe('');
    expect(toIsoDate('00/01/2026')).toBe('');
    expect(toIsoDate('32/01/2026')).toBe('');
  });

  it('rejects incomplete or malformed input', () => {
    expect(toIsoDate('')).toBe('');
    expect(toIsoDate('22/11')).toBe('');
    expect(toIsoDate('22-11-2026')).toBe('');
  });
});
