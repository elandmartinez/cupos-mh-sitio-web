import { useCallback, useState } from 'react';
import { clientsPurchasesRepository } from '../repositories/clientsPurchasesRepository';
import { purchasesPaymentsRepository } from '../repositories/purchasesPaymentsRepository';
import { purchasesExtraFeesRepository } from '../repositories/purchasesExtraFeesRepository';
import { computePurchaseTotals } from '../helpers/purchaseTotals';
import type { ClientPurchase } from '../repositories/clientsPurchasesRepository';
import type {
  CreatePurchasePaymentInput,
  PurchasePayment,
} from '../repositories/purchasesPaymentsRepository';
import type {
  CreatePurchaseExtraFeeInput,
  PurchaseExtraFee,
} from '../repositories/purchasesExtraFeesRepository';

export type {
  CreatePurchasePaymentInput,
  PurchasePayment,
  CreatePurchaseExtraFeeInput,
  PurchaseExtraFee,
};

/**
 * There is no database trigger, so the app owns a purchase's totals. Payments
 * and extra fees live in two tables; after any mutation this recomputes
 * `amount_paid_so_far` (from payments), `extra_charges_total` (from extra fees)
 * and `is_fully_paid` (from both) and writes them back through
 * `clientsPurchasesRepository.updateTotals`.
 */
async function persistTotals(
  purchaseId: number,
  payments: PurchasePayment[],
  extraFees: PurchaseExtraFee[],
  agreedFees: number | null
): Promise<{ updatedPurchase: ClientPurchase | null; error: string | null }> {
  const totals = computePurchaseTotals(payments, extraFees, agreedFees);
  const result = await clientsPurchasesRepository.updateTotals(purchaseId, totals);
  return result.ok
    ? { updatedPurchase: result.data, error: null }
    : { updatedPurchase: null, error: result.error };
}

/**
 * The money against a single client purchase — its payments and its extra fees —
 * plus the totals they drive. Each list is fetched lazily (the modal opens
 * before either form is reachable), so mutations assume the list is already in
 * cache — which the UI guarantees by fetching on open.
 */
export function usePurchasePayments() {
  const [paymentsByPurchase, setPaymentsByPurchase] = useState<Record<number, PurchasePayment[]>>(
    {}
  );
  const [extraFeesByPurchase, setExtraFeesByPurchase] = useState<
    Record<number, PurchaseExtraFee[]>
  >({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // FETCH all payments for a single purchase
  const fetchPaymentsForPurchase = useCallback(async (purchaseId: number) => {
    setLoading(true);
    setError(null);
    const result = await purchasesPaymentsRepository.findMany({ purchaseIds: [purchaseId] });
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }
    setPaymentsByPurchase((prev) => ({ ...prev, [purchaseId]: result.data }));
    setLoading(false);
  }, []);

  // FETCH all extra fees for a single purchase
  const fetchExtraFeesForPurchase = useCallback(async (purchaseId: number) => {
    setLoading(true);
    setError(null);
    const result = await purchasesExtraFeesRepository.findMany({ purchaseIds: [purchaseId] });
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }
    setExtraFeesByPurchase((prev) => ({ ...prev, [purchaseId]: result.data }));
    setLoading(false);
  }, []);

  // INSERT a new payment against a purchase
  const addPayment = useCallback(
    async (input: CreatePurchasePaymentInput, agreedFees: number | null) => {
      setError(null);
      const result = await purchasesPaymentsRepository.create(input);
      if (!result.ok) {
        setError(result.error);
        return { data: null, updatedPurchase: null, error: result.error };
      }
      const purchaseId = result.data.client_purchase_id;
      if (purchaseId == null) {
        return { data: result.data, updatedPurchase: null, error: null };
      }
      const payments = [result.data, ...(paymentsByPurchase[purchaseId] || [])];
      setPaymentsByPurchase((prev) => ({ ...prev, [purchaseId]: payments }));
      const { updatedPurchase, error } = await persistTotals(
        purchaseId,
        payments,
        extraFeesByPurchase[purchaseId] || [],
        agreedFees
      );
      return { data: result.data, updatedPurchase, error };
    },
    [paymentsByPurchase, extraFeesByPurchase]
  );

  // DELETE a payment
  const deletePayment = useCallback(
    async (payment: PurchasePayment, agreedFees: number | null) => {
      setError(null);
      const result = await purchasesPaymentsRepository.delete(payment.id);
      if (!result.ok) {
        setError(result.error);
        return { updatedPurchase: null, error: result.error };
      }
      const purchaseId = payment.client_purchase_id;
      if (purchaseId == null) {
        return { updatedPurchase: null, error: null };
      }
      const payments = (paymentsByPurchase[purchaseId] || []).filter((p) => p.id !== payment.id);
      setPaymentsByPurchase((prev) => ({ ...prev, [purchaseId]: payments }));
      return persistTotals(
        purchaseId,
        payments,
        extraFeesByPurchase[purchaseId] || [],
        agreedFees
      );
    },
    [paymentsByPurchase, extraFeesByPurchase]
  );

  // INSERT a new extra fee (fine owed) against a purchase
  const addExtraFee = useCallback(
    async (input: CreatePurchaseExtraFeeInput, agreedFees: number | null) => {
      setError(null);
      const result = await purchasesExtraFeesRepository.create(input);
      if (!result.ok) {
        setError(result.error);
        return { data: null, updatedPurchase: null, error: result.error };
      }
      const purchaseId = result.data.client_purchase_id;
      if (purchaseId == null) {
        return { data: result.data, updatedPurchase: null, error: null };
      }
      const extraFees = [result.data, ...(extraFeesByPurchase[purchaseId] || [])];
      setExtraFeesByPurchase((prev) => ({ ...prev, [purchaseId]: extraFees }));
      const { updatedPurchase, error } = await persistTotals(
        purchaseId,
        paymentsByPurchase[purchaseId] || [],
        extraFees,
        agreedFees
      );
      return { data: result.data, updatedPurchase, error };
    },
    [paymentsByPurchase, extraFeesByPurchase]
  );

  // DELETE an extra fee
  const deleteExtraFee = useCallback(
    async (fee: PurchaseExtraFee, agreedFees: number | null) => {
      setError(null);
      const result = await purchasesExtraFeesRepository.delete(fee.id);
      if (!result.ok) {
        setError(result.error);
        return { updatedPurchase: null, error: result.error };
      }
      const purchaseId = fee.client_purchase_id;
      if (purchaseId == null) {
        return { updatedPurchase: null, error: null };
      }
      const extraFees = (extraFeesByPurchase[purchaseId] || []).filter((f) => f.id !== fee.id);
      setExtraFeesByPurchase((prev) => ({ ...prev, [purchaseId]: extraFees }));
      return persistTotals(
        purchaseId,
        paymentsByPurchase[purchaseId] || [],
        extraFees,
        agreedFees
      );
    },
    [paymentsByPurchase, extraFeesByPurchase]
  );

  return {
    paymentsByPurchase,
    extraFeesByPurchase,
    loading,
    error,
    fetchPaymentsForPurchase,
    fetchExtraFeesForPurchase,
    addPayment,
    deletePayment,
    addExtraFee,
    deleteExtraFee,
  };
}
