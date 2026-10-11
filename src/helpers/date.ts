/**
 * Formats a date string as a short Spanish label, e.g. `4 de oct de 2026`
 * (the exact connector wording comes from the runtime's ICU data).
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
export function formatDate(value: string | null | undefined): string | null {
  if (!value) return null;

  const normalized = value.length === 10 ? `${value}T00:00:00` : value;
  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}
