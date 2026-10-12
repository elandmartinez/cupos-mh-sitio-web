import { describe, expect, it } from 'vitest';
import { formatDate } from './date';

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
