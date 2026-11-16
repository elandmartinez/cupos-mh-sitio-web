/**
 * The money math behind a purchase's payment progress.
 *
 * There is no database trigger: this is the app's single source of truth for the
 * totals. Payments are money *received*; extra fees are money *owed* on top of
 * the agreed fee.
 */

/** The totals the app derives from a purchase's payments and extra fees. */
export interface PurchaseTotals {
  /** Money received — the sum of every payment. */
  amount_paid_so_far: number;
  /** Money owed in fines — the sum of every extra fee. */
  extra_charges_total: number;
  /** True once the received amount covers the agreed fee plus any extra fees. */
  is_fully_paid: boolean;
}

/**
 * Derive a purchase's totals from its payments, its extra fees and its agreed
 * fee.
 *
 *   total_owed   = agreed_fees + extra_charges_total
 *   is_fully_paid = something is owed AND paid >= owed
 *
 * `null` amounts and a `null` agreed fee are treated as `0`; a purchase with
 * nothing owed stays "pending" (the app seeds it that way on create).
 */
export function computePurchaseTotals(
  payments: ReadonlyArray<{ amount: number | null }>,
  extraFees: ReadonlyArray<{ amount: number | null }>,
  agreedFees: number | null
): PurchaseTotals {
  const amountPaidSoFar = payments.reduce((sum, p) => sum + (p.amount ?? 0), 0);
  const extraChargesTotal = extraFees.reduce((sum, f) => sum + (f.amount ?? 0), 0);
  const totalOwed = (agreedFees ?? 0) + extraChargesTotal;

  return {
    amount_paid_so_far: amountPaidSoFar,
    extra_charges_total: extraChargesTotal,
    is_fully_paid: totalOwed > 0 && amountPaidSoFar >= totalOwed,
  };
}
