import { useCallback, useState } from 'react';
import { customArticlesOrdersRepository } from '../repositories/customArticlesOrdersRepository';
import { articlesOrdersPaymentTrackRepository } from '../repositories/articlesOrdersPaymentTrackRepository';
import { purchasesPaymentsRepository } from '../repositories/purchasesPaymentsRepository';
import { purchasesExtraFeesRepository } from '../repositories/purchasesExtraFeesRepository';
import { computePurchaseTotals } from '../helpers/purchaseTotals';
import type { CustomArticleOrder } from '../repositories/customArticlesOrdersRepository';
import type { ArticleOrderPaymentTrack } from '../repositories/articlesOrdersPaymentTrackRepository';
import type { PurchasePayment } from '../repositories/purchasesPaymentsRepository';
import type { PurchaseExtraFee } from '../repositories/purchasesExtraFeesRepository';

export type {
  CustomArticleOrder,
  CreateCustomArticleOrderInput,
  UpdateCustomArticleOrderInput,
} from '../repositories/customArticlesOrdersRepository';
export type { ArticleOrderPaymentTrack } from '../repositories/articlesOrdersPaymentTrackRepository';
export type { PurchaseExtraFee } from '../repositories/purchasesExtraFeesRepository';

/** Number of orders fetched per page. */
export const ORDERS_PAGE_SIZE = 10;

/** A custom order with its 1:1 payment track attached (or `null` if none yet). */
export interface CustomArticleOrderWithTrack extends CustomArticleOrder {
  track: ArticleOrderPaymentTrack | null;
}

/**
 * The form the admin fills for a custom order: the order fields plus the agreed
 * price and the starter-payment flag. Extra charges are *not* part of the form —
 * they are itemized (reason + amount) after the order starts, in the edit modal.
 */
export interface CustomArticleOrderFormInput {
  name: string;
  description: string;
  date_to_deliver: string;
  profile_id: string | null;
  agreed_fees: number | null;
  client_gave_starter_payment: boolean | null;
  /** The initial payment amount, recorded as a payment when creating the order. */
  starter_payment_amount: number | null;
  creation_progress: number;
}

/**
 * Derive and persist a track's totals from its payments and itemized extra fees.
 * `extra_charges_total` is the sum of the fees (no trigger); `is_fully_paid`
 * compares paid against `agreed_fees + extra_charges_total`.
 */
async function persistTrackTotals(
  trackId: number,
  payments: PurchasePayment[],
  extraFees: PurchaseExtraFee[],
  agreedFees: number | null
): Promise<{ updatedTrack: ArticleOrderPaymentTrack | null; error: string | null }> {
  const totals = computePurchaseTotals(payments, extraFees, agreedFees);
  const result = await articlesOrdersPaymentTrackRepository.updateTotals(trackId, totals);
  return result.ok
    ? { updatedTrack: result.data, error: null }
    : { updatedTrack: null, error: result.error };
}

/**
 * The custom-orders feature: the order list (each with its payment track) plus
 * CRUD and the payment / extra-fee management that drives a track's totals.
 *
 * RLS is the boundary — a customer's `findMany` returns only *their* orders, an
 * admin's returns all — so this one hook serves both the admin section and the
 * read-only customer view.
 */
export function useCustomArticlesOrders() {
  const [orders, setOrders] = useState<CustomArticleOrderWithTrack[]>([]);
  const [paymentsByTrack, setPaymentsByTrack] = useState<Record<number, PurchasePayment[]>>({});
  const [extraFeesByTrack, setExtraFeesByTrack] = useState<Record<number, PurchaseExtraFee[]>>(
    {}
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [totalCount, setTotalCount] = useState<number>(0);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await customArticlesOrdersRepository.findMany();
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    const orderIds = result.data.map((order) => order.id);
    const tracksResult = await articlesOrdersPaymentTrackRepository.findManyByOrderIds(orderIds);
    const tracks = tracksResult.ok ? tracksResult.data : [];

    const trackByOrder = new Map<number, ArticleOrderPaymentTrack>();
    for (const track of tracks) {
      if (track.article_order_id != null) trackByOrder.set(track.article_order_id, track);
    }

    setOrders(
      result.data.map((order) => ({ ...order, track: trackByOrder.get(order.id) ?? null }))
    );
    setLoading(false);
  }, []);

  // FETCH ONE PAGE OF ORDERS (0-based `nextPage`), with an optional name search.
  const fetchOrdersPage = useCallback(async (nextPage: number, nextSearch: string) => {
    setLoading(true);
    setError(null);

    const from = nextPage * ORDERS_PAGE_SIZE;
    const to = from + ORDERS_PAGE_SIZE - 1;
    const search = nextSearch || undefined;
    const result = await customArticlesOrdersRepository.findMany({ search, range: [from, to] });
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    const countResult = await customArticlesOrdersRepository.count(search);
    const orderIds = result.data.map((order) => order.id);
    const tracksResult = await articlesOrdersPaymentTrackRepository.findManyByOrderIds(orderIds);
    const tracks = tracksResult.ok ? tracksResult.data : [];

    const trackByOrder = new Map<number, ArticleOrderPaymentTrack>();
    for (const track of tracks) {
      if (track.article_order_id != null) trackByOrder.set(track.article_order_id, track);
    }

    setOrders(
      result.data.map((order) => ({ ...order, track: trackByOrder.get(order.id) ?? null }))
    );
    if (countResult.ok) setTotalCount(countResult.data);
    setLoading(false);
  }, []);

  const fetchPaymentsForTrack = useCallback(async (trackId: number) => {
    setError(null);
    const result = await purchasesPaymentsRepository.findManyForTracks([trackId]);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setPaymentsByTrack((prev) => ({ ...prev, [trackId]: result.data }));
  }, []);

  const fetchExtraFeesForTrack = useCallback(async (trackId: number) => {
    setError(null);
    const result = await purchasesExtraFeesRepository.findManyForTracks([trackId]);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setExtraFeesByTrack((prev) => ({ ...prev, [trackId]: result.data }));
  }, []);

  const addOrder = useCallback(async (input: CustomArticleOrderFormInput) => {
    setError(null);
    // `value` mirrors the agreed price — there is no separate "list value" for a
    // custom order, so both columns carry the same number.
    const orderResult = await customArticlesOrdersRepository.create({
      name: input.name || null,
      description: input.description || null,
      value: input.agreed_fees,
      date_to_deliver: input.date_to_deliver || null,
      last_date_to_deliver: null,
      has_date_to_deliver_been_updated: false,
      profile_id: input.profile_id,
      creation_progress: input.creation_progress,
    });
    if (!orderResult.ok) {
      setError(orderResult.error);
      return { data: null, error: orderResult.error };
    }

    const trackResult = await articlesOrdersPaymentTrackRepository.create({
      article_order_id: orderResult.data.id,
      agreed_fees: input.agreed_fees,
      client_gave_starter_payment: input.client_gave_starter_payment,
    });

    // Record the starter payment as a real payment (and refresh the totals) when
    // the operator ticked the checkbox *and* gave an amount at creation time.
    let track = trackResult.ok ? trackResult.data : null;
    const starterAmount = input.starter_payment_amount ?? 0;
    if (track && input.client_gave_starter_payment && starterAmount > 0) {
      const paymentResult = await purchasesPaymentsRepository.create({
        article_order_payment_track_id: track.id,
        amount: starterAmount,
      });
      if (paymentResult.ok) {
        const totals = computePurchaseTotals([paymentResult.data], [], input.agreed_fees);
        const totalsResult = await articlesOrdersPaymentTrackRepository.updateTotals(
          track.id,
          totals
        );
        if (totalsResult.ok) track = totalsResult.data;
      }
    }

    setOrders((prev) => [{ ...orderResult.data, track }, ...prev]);
    return { data: orderResult.data, error: null };
  }, []);

  const updateOrder = useCallback(
    async (order: CustomArticleOrderWithTrack, input: CustomArticleOrderFormInput) => {
      setError(null);
      const newDate = input.date_to_deliver || null;
      const dateChanged = newDate !== order.date_to_deliver;
      const orderResult = await customArticlesOrdersRepository.updatePartial(order.id, {
        name: input.name || null,
        description: input.description || null,
        value: input.agreed_fees,
        date_to_deliver: newDate,
        // The previous delivery date is kept as the "last" one when the date changes.
        last_date_to_deliver: dateChanged ? order.date_to_deliver : order.last_date_to_deliver,
        has_date_to_deliver_been_updated: dateChanged
          ? true
          : Boolean(order.has_date_to_deliver_been_updated),
        profile_id: input.profile_id,
        creation_progress: input.creation_progress,
      });
      if (!orderResult.ok) {
        setError(orderResult.error);
        return { data: null, error: orderResult.error };
      }

      // Ensure the track exists, then write its money fields. Extra charges are
      // not written here — they are computed from the itemized fees. Changing the
      // agreed price changes what's owed, so `is_fully_paid` is recomputed against
      // the existing paid/fee figures (amount_paid_so_far and extra_charges_total
      // are unchanged by an edit); a brand-new track starts unpaid (seeded by
      // `create`).
      const extraChargesTotal = order.track?.extra_charges_total ?? 0;
      const amountPaidSoFar = order.track?.amount_paid_so_far ?? 0;
      const newTotalOwed = (input.agreed_fees ?? 0) + extraChargesTotal;
      const isFullyPaid = newTotalOwed > 0 && amountPaidSoFar >= newTotalOwed;

      const trackResult = order.track
        ? await articlesOrdersPaymentTrackRepository.updatePartial(order.track.id, {
            agreed_fees: input.agreed_fees,
            client_gave_starter_payment: input.client_gave_starter_payment,
            is_fully_paid: isFullyPaid,
          })
        : await articlesOrdersPaymentTrackRepository.create({
            article_order_id: order.id,
            agreed_fees: input.agreed_fees,
            client_gave_starter_payment: input.client_gave_starter_payment,
          });

      const updated: CustomArticleOrderWithTrack = {
        ...orderResult.data,
        track: trackResult.ok ? trackResult.data : order.track,
      };
      setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
      // Return the full object (order + refreshed track) so the modal can keep its
      // `currentTrack` in sync with the new agreed price.
      return { data: updated, error: null };
    },
    []
  );

  const deleteOrder = useCallback(async (order: CustomArticleOrderWithTrack) => {
    setError(null);
    // No cascade on the money FKs: remove the payments and extra fees, then the
    // track, then the order, so a partially-financed order never orphans children.
    if (order.track) {
      const paymentsResult = await purchasesPaymentsRepository.findManyForTracks([order.track.id]);
      if (paymentsResult.ok) {
        for (const payment of paymentsResult.data) {
          await purchasesPaymentsRepository.delete(payment.id);
        }
      }
      const feesResult = await purchasesExtraFeesRepository.findManyForTracks([order.track.id]);
      if (feesResult.ok) {
        for (const fee of feesResult.data) {
          await purchasesExtraFeesRepository.delete(fee.id);
        }
      }
      await articlesOrdersPaymentTrackRepository.delete(order.track.id);
    }

    const result = await customArticlesOrdersRepository.delete(order.id);
    if (!result.ok) {
      setError(result.error);
      return { error: result.error };
    }
    setOrders((prev) => prev.filter((o) => o.id !== order.id));
    return { error: null };
  }, []);

  /**
   * Replace one order's track in `orders` after a payment/fee mutation, so the
   * list, the customer view and a re-opened modal all reflect the fresh totals
   * (the counterpart to `applyPurchaseUpdate` for regular purchases).
   */
  const applyTrackUpdate = useCallback(
    (trackId: number, updatedTrack: ArticleOrderPaymentTrack) => {
      setOrders((prev) =>
        prev.map((o) => (o.track?.id === trackId ? { ...o, track: updatedTrack } : o))
      );
    },
    []
  );

  const addPayment = useCallback(
    async (track: ArticleOrderPaymentTrack, amount: number) => {
      setError(null);
      const result = await purchasesPaymentsRepository.create({
        article_order_payment_track_id: track.id,
        amount,
      });
      if (!result.ok) {
        setError(result.error);
        return { updatedTrack: null, error: result.error };
      }
      const payments = [result.data, ...(paymentsByTrack[track.id] || [])];
      setPaymentsByTrack((prev) => ({ ...prev, [track.id]: payments }));
      const totals = await persistTrackTotals(
        track.id,
        payments,
        extraFeesByTrack[track.id] || [],
        track.agreed_fees
      );
      if (totals.updatedTrack) applyTrackUpdate(track.id, totals.updatedTrack);
      return totals;
    },
    [paymentsByTrack, extraFeesByTrack, applyTrackUpdate]
  );

  const deletePayment = useCallback(
    async (payment: PurchasePayment, track: ArticleOrderPaymentTrack) => {
      setError(null);
      const result = await purchasesPaymentsRepository.delete(payment.id);
      if (!result.ok) {
        setError(result.error);
        return { updatedTrack: null, error: result.error };
      }
      const payments = (paymentsByTrack[track.id] || []).filter((p) => p.id !== payment.id);
      setPaymentsByTrack((prev) => ({ ...prev, [track.id]: payments }));
      const totals = await persistTrackTotals(
        track.id,
        payments,
        extraFeesByTrack[track.id] || [],
        track.agreed_fees
      );
      if (totals.updatedTrack) applyTrackUpdate(track.id, totals.updatedTrack);
      return totals;
    },
    [paymentsByTrack, extraFeesByTrack, applyTrackUpdate]
  );

  const addExtraFee = useCallback(
    async (track: ArticleOrderPaymentTrack, reason: string, amount: number) => {
      setError(null);
      const result = await purchasesExtraFeesRepository.create({
        article_order_payment_track_id: track.id,
        reason: reason || null,
        amount,
      });
      if (!result.ok) {
        setError(result.error);
        return { updatedTrack: null, error: result.error };
      }
      const extraFees = [result.data, ...(extraFeesByTrack[track.id] || [])];
      setExtraFeesByTrack((prev) => ({ ...prev, [track.id]: extraFees }));
      const totals = await persistTrackTotals(
        track.id,
        paymentsByTrack[track.id] || [],
        extraFees,
        track.agreed_fees
      );
      if (totals.updatedTrack) applyTrackUpdate(track.id, totals.updatedTrack);
      return totals;
    },
    [paymentsByTrack, extraFeesByTrack, applyTrackUpdate]
  );

  const deleteExtraFee = useCallback(
    async (fee: PurchaseExtraFee, track: ArticleOrderPaymentTrack) => {
      setError(null);
      const result = await purchasesExtraFeesRepository.delete(fee.id);
      if (!result.ok) {
        setError(result.error);
        return { updatedTrack: null, error: result.error };
      }
      const extraFees = (extraFeesByTrack[track.id] || []).filter((f) => f.id !== fee.id);
      setExtraFeesByTrack((prev) => ({ ...prev, [track.id]: extraFees }));
      const totals = await persistTrackTotals(
        track.id,
        paymentsByTrack[track.id] || [],
        extraFees,
        track.agreed_fees
      );
      if (totals.updatedTrack) applyTrackUpdate(track.id, totals.updatedTrack);
      return totals;
    },
    [paymentsByTrack, extraFeesByTrack, applyTrackUpdate]
  );

  return {
    orders,
    paymentsByTrack,
    extraFeesByTrack,
    loading,
    error,
    page,
    setPage,
    searchQuery,
    setSearchQuery,
    totalCount,
    fetchOrders,
    fetchOrdersPage,
    pageSize: ORDERS_PAGE_SIZE,
    fetchPaymentsForTrack,
    fetchExtraFeesForTrack,
    addOrder,
    updateOrder,
    deleteOrder,
    addPayment,
    deletePayment,
    addExtraFee,
    deleteExtraFee,
  };
}
