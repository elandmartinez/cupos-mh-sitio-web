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
