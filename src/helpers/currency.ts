/**
 * Formats a number as peso-style currency text: a grouping separator every 3
 * digits, no decimals (product/purchase/payment values are stored as whole
 * pesos). `null`/`undefined` render as "0".
 *
 * `locale` defaults to `'es-CO'`, so every existing call site keeps the
 * Spanish output; `useFormatters` passes the active language's tag instead.
 *
 * e.g. formatCurrency(180000) -> "180.000"
 *      formatCurrency(180000, 'en-US') -> "180,000"
 */
export function formatCurrency(
  value: number | null | undefined,
  locale: string = 'es-CO'
): string {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}
