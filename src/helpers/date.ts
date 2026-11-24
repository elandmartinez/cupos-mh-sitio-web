/**
 * Formats a date string as a short label, e.g. `4 de oct de 2026` in Spanish or
 * `Oct 4, 2026` in English (the exact wording comes from the runtime's ICU data
 * for the locale).
 *
 * `locale` defaults to `'es-CO'`, so every existing call site keeps its output;
 * `useFormatters` passes the active language's tag instead.
 *
 * Accepts both shapes Supabase hands back — a `date` column (`"2026-10-04"`)
 * and a `timestamptz` (full ISO string). A bare `YYYY-MM-DD` is parsed as *UTC*
 * midnight by `Date`, which would render as the previous day anywhere west of
 * Greenwich (e.g. Colombia, UTC-5), so those get an explicit local-midnight
 * time appended.
 *
 * Returns `null` for missing or unparseable input, so callers can drop the line
 * instead of printing "Invalid Date".
 */
export function formatDate(
  value: string | null | undefined,
  locale: string = 'es-CO'
): string | null {
  if (!value) return null;

  const normalized = value.length === 10 ? `${value}T00:00:00` : value;
  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/**
 * An ISO `date`-column value (`"YYYY-MM-DD"`) rendered as the `DD/MM/YYYY` the
 * calendar inputs show. Empty or malformed input renders `''`.
 */
export function toDisplayDate(value: string | null | undefined): string {
  if (!value) return '';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return '';
  return `${match[3]}/${match[2]}/${match[1]}`;
}

/**
 * A `DD/MM/YYYY` entry converted back to ISO (`"YYYY-MM-DD"`) for storage.
 * Returns `''` when the entry is incomplete or not a real calendar date, so
 * callers can treat it as "no value" (and the input reverts on blur).
 */
export function toIsoDate(value: string): string {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return '';

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (year < 1000) return '';

  // Rollover check: `new Date(2026, 1, 31)` is Mar 3, whose parts no longer match
  // the input, so impossible dates like 31/02 are rejected.
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return '';
  }

  return `${match[3]}-${match[2]}-${match[1]}`;
}
