import { supabase } from '../lib/supabase';
import { nowIso, repoFailure, repoSuccess } from './types';
import type { RepoResult } from './types';

/** `public.articles_orders_payment_track` — the payment state of one custom order. */
const TABLE = 'articles_orders_payment_track';

/** One row of `public.articles_orders_payment_track`, exactly as the database stores it. */
export interface ArticleOrderPaymentTrack {
  id: number;
  created_at: string;
  updated_at: string | null;
  is_fully_paid: boolean | null;
  agreed_fees: number | null;
  /** App-maintained — the sum of the order's payments (no trigger). */
  amount_paid_so_far: number | null;
  status: string | null;
  /** App-entered — extra charges owed, kept as a single total (not itemized). */
  extra_charges_total: number | null;
  client_gave_starter_payment: boolean | null;
  article_order_id: number | null;
}

/** Columns a caller may set when creating the track (the 1:1 with an order). */
export type CreateArticleOrderPaymentTrackInput = Pick<
  ArticleOrderPaymentTrack,
  'article_order_id' | 'agreed_fees' | 'client_gave_starter_payment'
>;

/** Editable money/status columns, excluding the app-computed totals. */
export type UpdateArticleOrderPaymentTrackInput = Pick<
  ArticleOrderPaymentTrack,
  'agreed_fees' | 'client_gave_starter_payment' | 'status'
>;

/** The app-computed totals, written after every payment/fee mutation (no trigger). */
export type UpdateTrackTotalsInput = Pick<
  ArticleOrderPaymentTrack,
  'amount_paid_so_far' | 'extra_charges_total' | 'is_fully_paid'
>;

/** Anything `updatePartial` may write: the money/status fields plus the totals. */
export type PatchArticleOrderPaymentTrackInput = Partial<
  UpdateArticleOrderPaymentTrackInput & UpdateTrackTotalsInput
>;

/** One track by id, or `null` when it does not exist. */
async function find(id: number): Promise<RepoResult<ArticleOrderPaymentTrack | null>> {
  try {
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return repoSuccess(data as ArticleOrderPaymentTrack | null);
  } catch (error) {
    return repoFailure(error, 'No se pudo obtener el registro de pagos.');
  }
}

/** The track of one order (1:1), or `null` when the order has none yet. */
async function findByOrderId(orderId: number): Promise<RepoResult<ArticleOrderPaymentTrack | null>> {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('article_order_id', orderId)
      .maybeSingle();
    if (error) throw error;
    return repoSuccess(data as ArticleOrderPaymentTrack | null);
  } catch (error) {
    return repoFailure(error, 'No se pudo obtener el registro de pagos.');
  }
}

/** Tracks for a set of orders, newest first. */
async function findManyByOrderIds(orderIds: number[]): Promise<RepoResult<ArticleOrderPaymentTrack[]>> {
  if (orderIds.length === 0) return repoSuccess([]);

  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .in('article_order_id', orderIds)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return repoSuccess((data ?? []) as ArticleOrderPaymentTrack[]);
  } catch (error) {
    return repoFailure(error, 'No se pudieron obtener los registros de pagos.');
  }
}

/** Create the track for an order (its money starts at 0 / not paid). */
async function create(
  input: CreateArticleOrderPaymentTrackInput
): Promise<RepoResult<ArticleOrderPaymentTrack>> {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .insert([{ ...input, amount_paid_so_far: 0, is_fully_paid: false }])
      .select()
      .single();
    if (error) throw error;
    return repoSuccess(data as ArticleOrderPaymentTrack);
  } catch (error) {
    return repoFailure(error, 'No se pudo crear el registro de pagos.');
  }
}

/** Write the columns present in `patch` (plus `updated_at`) and return the row. */
async function updatePartial(
  id: number,
  patch: PatchArticleOrderPaymentTrackInput
): Promise<RepoResult<ArticleOrderPaymentTrack>> {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ ...patch, updated_at: nowIso() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return repoSuccess(data as ArticleOrderPaymentTrack);
  } catch (error) {
    return repoFailure(error, 'No se pudo actualizar el registro de pagos.');
  }
}

/** Persist the app-computed totals after a payment mutation (no trigger). */
async function updateTotals(
  id: number,
  totals: UpdateTrackTotalsInput
): Promise<RepoResult<ArticleOrderPaymentTrack>> {
  return updatePartial(id, totals);
}

/** Delete one track (its payments must be removed first — no cascade). */
async function remove(id: number): Promise<RepoResult<null>> {
  try {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw error;
    return repoSuccess(null);
  } catch (error) {
    return repoFailure(error, 'No se pudo eliminar el registro de pagos.');
  }
}

export const articlesOrdersPaymentTrackRepository = {
  find,
  findByOrderId,
  findManyByOrderIds,
  create,
  updatePartial,
  updateTotals,
  delete: remove,
};

export type ArticlesOrdersPaymentTrackRepository = typeof articlesOrdersPaymentTrackRepository;
