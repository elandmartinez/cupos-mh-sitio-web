import { supabase } from '../lib/supabase';
import { nowIso, repoFailure, repoSuccess } from './types';
import type { RepoResult } from './types';

/**
 * `public.purchases_extra_fees` — a fine/extra charge owed by a purchase. It is
 * polymorphic, like `purchases_payments`: the parent is one of `client_purchase_id`
 * (a regular purchase) or `article_order_payment_track_id` (a custom order), and a
 * CHECK enforces exactly one. `reason` is only used for custom orders.
 */
const TABLE = 'purchases_extra_fees';

/** One row of `public.purchases_extra_fees`, exactly as the database stores it. */
export interface PurchaseExtraFee {
  id: number;
  created_at: string;
  updated_at: string | null;
  client_purchase_id: number | null;
  /** FK → `articles_orders_payment_track.id` when the fee belongs to a custom order. */
  article_order_payment_track_id: number | null;
  /** Why the charge exists (custom orders only); `null` for regular purchases. */
  reason: string | null;
  /** Whole pesos. */
  amount: number | null;
}

/**
 * New extra fee. Exactly one parent is expected (set by the caller, enforced by
 * the database CHECK); `amount` is the only required field.
 */
export type CreatePurchaseExtraFeeInput = {
  amount: number | null;
  client_purchase_id?: number | null;
  article_order_payment_track_id?: number | null;
  reason?: string | null;
};
/** Full update — the whole writable set is written. */
export type UpdatePurchaseExtraFeeInput = CreatePurchaseExtraFeeInput;
/** Partial update — only the columns present in the object are touched. */
export type PatchPurchaseExtraFeeInput = Partial<UpdatePurchaseExtraFeeInput>;

export interface FindManyPurchaseExtraFeesOptions {
  /** Restrict to the extra fees of these purchases. */
  purchaseIds?: number[];
  /** Sort key; defaults to newest first. */
  orderBy?: { column: 'id' | 'created_at'; ascending: boolean };
}

const DEFAULT_ORDER: NonNullable<FindManyPurchaseExtraFeesOptions['orderBy']> = {
  column: 'created_at',
  ascending: false,
};

/** One extra fee by id, or `null` when it does not exist. */
async function find(id: number): Promise<RepoResult<PurchaseExtraFee | null>> {
  try {
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return repoSuccess(data as PurchaseExtraFee | null);
  } catch (error) {
    return repoFailure(error, 'No se pudo obtener el cargo extra.');
  }
}

/** Extra fees, optionally limited to a set of purchases. */
async function findMany(
  options: FindManyPurchaseExtraFeesOptions = {}
): Promise<RepoResult<PurchaseExtraFee[]>> {
  const { purchaseIds, orderBy = DEFAULT_ORDER } = options;

  try {
    let query = supabase.from(TABLE).select('*');
    if (purchaseIds && purchaseIds.length > 0) {
      query = query.in('client_purchase_id', purchaseIds);
    }

    const { data, error } = await query.order(orderBy.column, { ascending: orderBy.ascending });
    if (error) throw error;
    return repoSuccess((data ?? []) as PurchaseExtraFee[]);
  } catch (error) {
    return repoFailure(error, 'No se pudieron obtener los cargos extra.');
  }
}

/** Extra fees for a set of custom-order payment tracks (newest first). */
async function findManyForTracks(trackIds: number[]): Promise<RepoResult<PurchaseExtraFee[]>> {
  if (trackIds.length === 0) return repoSuccess([]);

  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .in('article_order_payment_track_id', trackIds)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return repoSuccess((data ?? []) as PurchaseExtraFee[]);
  } catch (error) {
    return repoFailure(error, 'No se pudieron obtener los cargos extra.');
  }
}

/**
 * Insert an extra fee. There is no database trigger: the caller recomputes the
 * parent purchase's totals from its payments *and* extra fees (see
 * `usePurchasePayments`) and writes them back through
 * `clientsPurchasesRepository.updateTotals`.
 */
async function create(
  input: CreatePurchaseExtraFeeInput
): Promise<RepoResult<PurchaseExtraFee>> {
  try {
    const { data, error } = await supabase.from(TABLE).insert([input]).select().single();
    if (error) throw error;
    return repoSuccess(data as PurchaseExtraFee);
  } catch (error) {
    return repoFailure(error, 'No se pudo registrar el cargo extra.');
  }
}

/** Write the columns present in `patch` (plus `updated_at`) and return the row. */
async function updatePartial(
  id: number,
  patch: PatchPurchaseExtraFeeInput
): Promise<RepoResult<PurchaseExtraFee>> {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ ...patch, updated_at: nowIso() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return repoSuccess(data as PurchaseExtraFee);
  } catch (error) {
    return repoFailure(error, 'No se pudo actualizar el cargo extra.');
  }
}

/** Full update of an extra fee (amount). */
async function update(
  id: number,
  input: UpdatePurchaseExtraFeeInput
): Promise<RepoResult<PurchaseExtraFee>> {
  return updatePartial(id, input);
}

/** Apply the same patch to several extra fees in one request. */
async function updateMany(
  ids: number[],
  patch: PatchPurchaseExtraFeeInput
): Promise<RepoResult<PurchaseExtraFee[]>> {
  if (ids.length === 0) return repoSuccess([]);

  try {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ ...patch, updated_at: nowIso() })
      .in('id', ids)
      .select();

    if (error) throw error;
    return repoSuccess((data ?? []) as PurchaseExtraFee[]);
  } catch (error) {
    return repoFailure(error, 'No se pudieron actualizar los cargos extra.');
  }
}

/** Delete one extra fee (the caller recomputes the parent's totals afterwards). */
async function remove(id: number): Promise<RepoResult<null>> {
  try {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw error;
    return repoSuccess(null);
  } catch (error) {
    return repoFailure(error, 'No se pudo eliminar el cargo extra.');
  }
}

/** Delete several extra fees in one request. */
async function removeMany(ids: number[]): Promise<RepoResult<null>> {
  if (ids.length === 0) return repoSuccess(null);

  try {
    const { error } = await supabase.from(TABLE).delete().in('id', ids);
    if (error) throw error;
    return repoSuccess(null);
  } catch (error) {
    return repoFailure(error, 'No se pudieron eliminar los cargos extra.');
  }
}

/**
 * Everything the app can do to `purchases_extra_fees`.
 *
 * `delete`/`deleteMany` are bound to the internal `remove*` functions because
 * `delete` is a reserved word and cannot be used as a declaration name.
 */
export const purchasesExtraFeesRepository = {
  find,
  findMany,
  findManyForTracks,
  create,
  update,
  updatePartial,
  updateMany,
  delete: remove,
  deleteMany: removeMany,
};

export type PurchasesExtraFeesRepository = typeof purchasesExtraFeesRepository;
