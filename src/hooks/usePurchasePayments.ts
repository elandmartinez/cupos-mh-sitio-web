import { useCallback, useState } from 'react';
import { clientsPurchasesRepository } from '../repositories/clientsPurchasesRepository';
import { purchasesPaymentsRepository } from '../repositories/purchasesPaymentsRepository';
import type { ClientPurchase } from '../repositories/clientsPurchasesRepository';
import type {
  CreatePurchasePaymentInput,
  PurchasePayment,
} from '../repositories/purchasesPaymentsRepository';

export type { CreatePurchasePaymentInput, PurchasePayment };

/**
 * A DB trigger recomputes `clients_purchases.amount_paid_so_far` /
 * `is_fully_paid` whenever a payment row changes, so every mutation re-reads
 * the parent purchase and hands it back as `updatedPurchase` for the caller to
 * merge into its cache (see `useClientPurchases.applyPurchaseUpdate`).
 *
 * A failed re-read is not worth failing the whole mutation over — the payment
 * itself already landed — so it resolves to `null` and the next fetch corrects it.
 */
async function fetchParentPurchase(purchaseId: number): Promise<ClientPurchase | null> {
  const result = await clientsPurchasesRepository.find(purchaseId);
  return result.ok ? result.data : null;
}

/**
 * The `purchases_payments` table: paying down a single client purchase.
 *
 * Every mutation also returns the freshly recomputed parent purchase, so the
 * caller can keep its list in sync without a second round trip.
 */
export function usePurchasePayments() {
  const [paymentsByPurchase, setPaymentsByPurchase] = useState<Record<number, PurchasePayment[]>>({});
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

  // INSERT a new payment against a purchase
  const addPayment = useCallback(async (input: CreatePurchasePaymentInput) => {
    setError(null);
    const result = await purchasesPaymentsRepository.create(input);

    if (!result.ok) {
      setError(result.error);
      return { data: null, updatedPurchase: null, error: result.error };
    }

    const purchaseId = result.data.client_purchase_id;
    if (purchaseId != null) {
      setPaymentsByPurchase((prev) => ({
        ...prev,
        [purchaseId]: [result.data, ...(prev[purchaseId] || [])],
      }));
    }

    const updatedPurchase = purchaseId != null ? await fetchParentPurchase(purchaseId) : null;
    return { data: result.data, updatedPurchase, error: null };
  }, []);

  // UPDATE an existing payment (e.g. correct its amount)
  const updatePayment = useCallback(
    async (payment: PurchasePayment, updates: Partial<CreatePurchasePaymentInput>) => {
      setError(null);
      const result = await purchasesPaymentsRepository.updatePartial(payment.id, updates);

      if (!result.ok) {
        setError(result.error);
        return { data: null, updatedPurchase: null, error: result.error };
      }

      const purchaseId = result.data.client_purchase_id;
      if (purchaseId != null) {
        setPaymentsByPurchase((prev) => ({
          ...prev,
          [purchaseId]: (prev[purchaseId] || []).map((p) =>
            p.id === payment.id ? result.data : p
          ),
        }));
      }

      const updatedPurchase = purchaseId != null ? await fetchParentPurchase(purchaseId) : null;
      return { data: result.data, updatedPurchase, error: null };
    },
    []
  );

  // DELETE a payment
  const deletePayment = useCallback(async (payment: PurchasePayment) => {
    setError(null);
    const result = await purchasesPaymentsRepository.delete(payment.id);

    if (!result.ok) {
      setError(result.error);
      return { updatedPurchase: null, error: result.error };
    }

    const purchaseId = payment.client_purchase_id;
    if (purchaseId != null) {
      setPaymentsByPurchase((prev) => ({
        ...prev,
        [purchaseId]: (prev[purchaseId] || []).filter((p) => p.id !== payment.id),
      }));
    }

    const updatedPurchase = purchaseId != null ? await fetchParentPurchase(purchaseId) : null;
    return { updatedPurchase, error: null };
  }, []);

  return {
    paymentsByPurchase,
    loading,
    error,
    fetchPaymentsForPurchase,
    addPayment,
    updatePayment,
    deletePayment,
  };
}
