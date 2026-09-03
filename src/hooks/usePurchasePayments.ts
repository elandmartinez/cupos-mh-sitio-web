import { useCallback, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { ClientPurchase } from './useClientPurchases';

export interface PurchasePayment {
  id: number;
  created_at: string;
  updated_at: string | null;
  client_purchase_id: number | null;
  amount: number | null;
  is_extra_fee: boolean | null;
}

export type CreatePurchasePaymentInput = Omit<PurchasePayment, 'id' | 'created_at' | 'updated_at'>;
export type UpdatePurchasePaymentInput = Partial<CreatePurchasePaymentInput>;

// A DB trigger recomputes clients_purchases.amount_paid_so_far / is_fully_paid
// whenever a row here changes, so every mutation re-reads the parent purchase
// and hands it back as `updatedPurchase` for the caller to merge into its cache
// (see useClientPurchases.applyPurchaseUpdate).
async function fetchParentPurchase(purchaseId: number): Promise<ClientPurchase | null> {
  const { data } = await supabase
    .from('clients_purchases')
    .select('*')
    .eq('id', purchaseId)
    .single();
  return data ?? null;
}

export function usePurchasePayments() {
  const [paymentsByPurchase, setPaymentsByPurchase] = useState<Record<number, PurchasePayment[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // FETCH all payments for a single purchase
  const fetchPaymentsForPurchase = useCallback(async (purchaseId: number) => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('purchases_payments')
        .select('*')
        .eq('client_purchase_id', purchaseId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setPaymentsByPurchase((prev) => ({ ...prev, [purchaseId]: data || [] }));
    } catch (err: any) {
      setError(err.message || 'Failed to fetch payments.');
    } finally {
      setLoading(false);
    }
  }, []);

  // INSERT a new payment against a purchase
  const addPayment = useCallback(async (input: CreatePurchasePaymentInput) => {
    try {
      setError(null);
      const { data, error: insertError } = await supabase
        .from('purchases_payments')
        .insert([input])
        .select()
        .single();

      if (insertError) throw insertError;

      const purchaseId = data.client_purchase_id;
      if (purchaseId != null) {
        setPaymentsByPurchase((prev) => ({
          ...prev,
          [purchaseId]: [data, ...(prev[purchaseId] || [])],
        }));
      }

      const updatedPurchase = purchaseId != null ? await fetchParentPurchase(purchaseId) : null;
      return { data, updatedPurchase, error: null };
    } catch (err: any) {
      setError(err.message || 'Failed to add payment.');
      return { data: null, updatedPurchase: null, error: err.message };
    }
  }, []);

  // UPDATE an existing payment (e.g. correct its amount)
  const updatePayment = useCallback(
    async (payment: PurchasePayment, updates: UpdatePurchasePaymentInput) => {
      try {
        setError(null);
        const { data, error: updateError } = await supabase
          .from('purchases_payments')
          .update({ ...updates, updated_at: new Date().toISOString() })
          .eq('id', payment.id)
          .select()
          .single();

        if (updateError) throw updateError;

        const purchaseId = data.client_purchase_id;
        if (purchaseId != null) {
          setPaymentsByPurchase((prev) => ({
            ...prev,
            [purchaseId]: (prev[purchaseId] || []).map((p) => (p.id === payment.id ? data : p)),
          }));
        }

        const updatedPurchase = purchaseId != null ? await fetchParentPurchase(purchaseId) : null;
        return { data, updatedPurchase, error: null };
      } catch (err: any) {
        setError(err.message || 'Failed to update payment.');
        return { data: null, updatedPurchase: null, error: err.message };
      }
    },
    []
  );

  // DELETE a payment
  const deletePayment = useCallback(async (payment: PurchasePayment) => {
    try {
      setError(null);
      const { error: deleteError } = await supabase
        .from('purchases_payments')
        .delete()
        .eq('id', payment.id);

      if (deleteError) throw deleteError;

      const purchaseId = payment.client_purchase_id;
      if (purchaseId != null) {
        setPaymentsByPurchase((prev) => ({
          ...prev,
          [purchaseId]: (prev[purchaseId] || []).filter((p) => p.id !== payment.id),
        }));
      }

      const updatedPurchase = purchaseId != null ? await fetchParentPurchase(purchaseId) : null;
      return { updatedPurchase, error: null };
    } catch (err: any) {
      setError(err.message || 'Failed to delete payment.');
      return { updatedPurchase: null, error: err.message };
    }
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
