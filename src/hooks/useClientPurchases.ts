import { useCallback, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface ClientPurchase {
  id: number;
  created_at: string;
  updated_at: string | null;
  client_name: string | null;
  client_phone_number: string | null;
  is_fully_paid: boolean | null;
  agreed_fees: number | null;
  amount_paid_so_far: number | null;
  product_id: number | null;
}

// amount_paid_so_far / is_fully_paid are maintained by a DB trigger off of
// purchases_payments (see usePurchasePayments) — never set them from the client.
export type CreateClientPurchaseInput = Omit<
  ClientPurchase,
  'id' | 'created_at' | 'updated_at' | 'is_fully_paid' | 'amount_paid_so_far'
>;
export type UpdateClientPurchaseInput = Partial<
  Omit<ClientPurchase, 'id' | 'created_at' | 'updated_at' | 'product_id' | 'is_fully_paid' | 'amount_paid_so_far'>
>;

export function useClientPurchases() {
  const [purchasesByProduct, setPurchasesByProduct] = useState<Record<number, ClientPurchase[]>>({});
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
  }, []);

  // FETCH purchases for one or more products in a single query
  const fetchPurchasesForProducts = useCallback(async (productIds: number[]) => {
    if (productIds.length === 0) return;
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('clients_purchases')
        .select('*')
        .in('product_id', productIds)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setPurchasesByProduct((prev) => {
        const next = { ...prev };
        for (const id of productIds) {
          next[id] = (data || []).filter((purchase) => purchase.product_id === id);
        }
        return next;
      });
    } catch (err: any) {
      setError(err.message || 'Failed to fetch purchases.');
    } finally {
      setLoading(false);
    }
  }, []);

  // CREATE a purchase for a product
  const addPurchase = useCallback(async (input: CreateClientPurchaseInput) => {
    try {
      setError(null);
      const { data, error: insertError } = await supabase
        .from('clients_purchases')
        .insert([{ ...input, amount_paid_so_far: 0, is_fully_paid: false }])
        .select()
        .single();

      if (insertError) throw insertError;
      if (data) applyPurchaseUpdate(data);
      return { data, error: null };
    } catch (err: any) {
      setError(err.message || 'Failed to create purchase.');
      return { data: null, error: err.message };
    }
  }, [applyPurchaseUpdate]);

  // UPDATE client/fee details of a purchase
  const updatePurchase = useCallback(
    async (purchase: ClientPurchase, updates: UpdateClientPurchaseInput) => {
      try {
        setError(null);
        const { data, error: updateError } = await supabase
          .from('clients_purchases')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', purchase.id)
          .select()
          .single();

        if (updateError) throw updateError;
        if (data) applyPurchaseUpdate(data);
        return { data, error: null };
      } catch (err: any) {
        setError(err.message || 'Failed to update purchase.');
        return { data: null, error: err.message };
      }
    },
    [applyPurchaseUpdate]
  );

  // DELETE a purchase (its payments cascade via the FK)
  const deletePurchase = useCallback(async (purchase: ClientPurchase) => {
    try {
      setError(null);
      const { error: deleteError } = await supabase
        .from('clients_purchases')
        .delete()
        .eq('id', purchase.id);

      if (deleteError) throw deleteError;

      const productId = purchase.product_id;
      if (productId != null) {
        setPurchasesByProduct((prev) => ({
          ...prev,
          [productId]: (prev[productId] || []).filter((p) => p.id !== purchase.id),
        }));
      }
      return { error: null };
    } catch (err: any) {
      setError(err.message || 'Failed to delete purchase.');
      return { error: err.message };
    }
  }, []);

  return {
    purchasesByProduct,
    loading,
    error,
    fetchPurchasesForProducts,
    addPurchase,
    updatePurchase,
    deletePurchase,
    applyPurchaseUpdate,
  };
}
