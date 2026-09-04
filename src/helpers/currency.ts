/**
 * Formats a number as Colombian-peso-style currency text: a "." thousands
 * separator every 3 digits, no decimals (product/purchase/payment values are
 * stored as whole pesos). `null`/`undefined` render as "0".
 *
 * e.g. formatCurrency(180000) -> "180.000"
 */
export function formatCurrency(value: number | null | undefined): string {
  return new Intl.NumberFormat('es-CO', {
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}
