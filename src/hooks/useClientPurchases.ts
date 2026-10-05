import { useCallback, useState } from 'react';
import { clientsPurchasesRepository } from '../repositories/clientsPurchasesRepository';
import type {
  ClientPurchase,
  ClientPurchaseWithProduct,
  CreateClientPurchaseInput,
  PatchClientPurchaseInput,
} from '../repositories/clientsPurchasesRepository';

// Rows come from the table-specific module; re-exported so components can keep
// importing them from the hook that owns the data.
export type { ClientPurchase, ClientPurchaseWithProduct, CreateClientPurchaseInput };

/** Only the client/fee columns are written, so a partial object is accepted. */
export type UpdateClientPurchaseInput = PatchClientPurchaseInput;

/**
 * `clients_purchases`, in the two shapes the dashboard needs:
 *
 * - `purchasesByProduct` — the per-product cache the purchases modal reads.
 * - `allPurchases` — every purchase with its product attached, for the
 *   cross-product "Mis ventas" list.
 *
 * `amount_paid_so_far` / `is_fully_paid` are maintained by a DB trigger off of
 * `purchases_payments` (see usePurchasePayments) — never set them from here.
 */
export function useClientPurchases() {
  const [purchasesByProduct, setPurchasesByProduct] = useState<Record<number, ClientPurchase[]>>({});
  const [allPurchases, setAllPurchases] = useState<ClientPurchaseWithProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Merge/replace a single purchase row in local state — used both internally
  // and by callers (e.g. after a payment mutation) to reflect trigger-updated totals.
  const applyPurchaseUpdate = useCallback((purchase: ClientPurchase) => {
    const productId = purchase.product_id;
    if (productId == null) return;

    setPurchasesByProduct((prev) => {
      const list = prev[productId] || [];
      const exists = list.some((p) => p.id === purchase.id);
      return {
        ...prev,
        [productId]: exists
          ? list.map((p) => (p.id === purchase.id ? purchase : p))
          : [purchase, ...list],
      };
    });

    // Keep the sales list in sync too, preserving the product each row was
    // loaded with (the update carries no joined product of its own).
    setAllPurchases((prev) =>
      prev.map((p) => (p.id === purchase.id ? { ...p, ...purchase, product: p.product } : p))
    );
  }, []);

  // FETCH purchases for one or more products in a single query
  const fetchPurchasesForProducts = useCallback(async (productIds: number[]) => {
    if (productIds.length === 0) return;

    setLoading(true);
    setError(null);

    const result = await clientsPurchasesRepository.findMany({ productIds });

    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setPurchasesByProduct((prev) => {
      const next = { ...prev };
      for (const id of productIds) {
        next[id] = result.data.filter((purchase) => purchase.product_id === id);
      }
      return next;
    });
    setLoading(false);
  }, []);

  // FETCH every purchase, product included — the "Mis ventas" list
  const fetchAllPurchases = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await clientsPurchasesRepository.findManyWithProduct();

    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setAllPurchases(result.data);
    setLoading(false);
  }, []);

  // CREATE a purchase for a product
  const addPurchase = useCallback(async (input: CreateClientPurchaseInput) => {
    setError(null);
    const result = await clientsPurchasesRepository.create(input);

    if (!result.ok) {
      setError(result.error);
      return { data: null, error: result.error };
    }

    applyPurchaseUpdate(result.data);
    // No joined product on an insert — callers resolve it from the product they
    // are buying (the sales list falls back to the products they already hold).
    setAllPurchases((prev) => [{ ...result.data, product: null }, ...prev]);
    return { data: result.data, error: null };
  }, [applyPurchaseUpdate]);

  // UPDATE client/fee details of a purchase
  const updatePurchase = useCallback(
    async (purchase: ClientPurchase, updates: UpdateClientPurchaseInput) => {
      setError(null);
      const result = await clientsPurchasesRepository.updatePartial(purchase.id, updates);

      if (!result.ok) {
        setError(result.error);
        return { data: null, error: result.error };
      }

      applyPurchaseUpdate(result.data);
      return { data: result.data, error: null };
    },
    [applyPurchaseUpdate]
  );

  // DELETE a purchase (its payments cascade via the FK)
  const deletePurchase = useCallback(async (purchase: ClientPurchase) => {
    setError(null);
    const result = await clientsPurchasesRepository.delete(purchase.id);

    if (!result.ok) {
      setError(result.error);
      return { error: result.error };
    }

    const productId = purchase.product_id;
    if (productId != null) {
      setPurchasesByProduct((prev) => ({
        ...prev,
        [productId]: (prev[productId] || []).filter((p) => p.id !== purchase.id),
      }));
    }
    setAllPurchases((prev) => prev.filter((p) => p.id !== purchase.id));
    return { error: null };
  }, []);

  return {
    purchasesByProduct,
    allPurchases,
    loading,
    error,
    fetchPurchasesForProducts,
    fetchAllPurchases,
    addPurchase,
    updatePurchase,
    deletePurchase,
    applyPurchaseUpdate,
  };
}
