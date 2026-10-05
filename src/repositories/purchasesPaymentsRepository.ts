import { supabase } from '../lib/supabase';
import { nowIso, repoFailure, repoSuccess } from './types';
import type { RepoResult } from './types';

/** `public.purchases_payments` — a payment made against a client purchase. */
const TABLE = 'purchases_payments';

/** One row of `public.purchases_payments`, exactly as the database stores it. */
export interface PurchasePayment {
  id: number;
  created_at: string;
  updated_at: string | null;
  client_purchase_id: number | null;
  /** Whole pesos. */
  amount: number | null;
  /** Shown as "(extra)" in the UI: a fee charged on top of the agreed total. */
  is_extra_fee: boolean | null;
}

/** New payment — everything except the generated/DB-owned columns. */
export type CreatePurchasePaymentInput = Omit<PurchasePayment, 'id' | 'created_at' | 'updated_at'>;
/** Full update — the whole writable set is written. */
export type UpdatePurchasePaymentInput = Omit<PurchasePayment, 'id' | 'created_at' | 'updated_at'>;
/** Partial update — only the columns present in the object are touched. */
export type PatchPurchasePaymentInput = Partial<UpdatePurchasePaymentInput>;

export interface FindManyPurchasePaymentsOptions {
  /** Restrict to the payments of these purchases. */
  purchaseIds?: number[];
  /** Sort key; defaults to newest first. */
  orderBy?: { column: 'id' | 'created_at'; ascending: boolean };
}

const DEFAULT_ORDER: NonNullable<FindManyPurchasePaymentsOptions['orderBy']> = {
  column: 'created_at',
  ascending: false,
};

/** One payment by id, or `null` when it does not exist. */
async function find(id: number): Promise<RepoResult<PurchasePayment | null>> {
  try {
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return repoSuccess(data as PurchasePayment | null);
  } catch (error) {
    return repoFailure(error, 'No se pudo obtener el pago.');
  }
}

/** Payments, optionally limited to a set of purchases. */
async function findMany(
  options: FindManyPurchasePaymentsOptions = {}
): Promise<RepoResult<PurchasePayment[]>> {
  const { purchaseIds, orderBy = DEFAULT_ORDER } = options;

  try {
    let query = supabase.from(TABLE).select('*');
    if (purchaseIds && purchaseIds.length > 0) {
      query = query.in('client_purchase_id', purchaseIds);
    }

    const { data, error } = await query.order(orderBy.column, { ascending: orderBy.ascending });
    if (error) throw error;
    return repoSuccess((data ?? []) as PurchasePayment[]);
  } catch (error) {
    return repoFailure(error, 'No se pudieron obtener los pagos.');
  }
}

/**
 * Insert a payment. A database trigger then recomputes the parent purchase's
 * `amount_paid_so_far` / `is_fully_paid`, so callers should re-read the parent
 * through `clientsPurchasesRepository.find()` after this resolves.
 */
async function create(
  input: CreatePurchasePaymentInput
): Promise<RepoResult<PurchasePayment>> {
  try {
    const { data, error } = await supabase.from(TABLE).insert([input]).select().single();
    if (error) throw error;
    return repoSuccess(data as PurchasePayment);
  } catch (error) {
    return repoFailure(error, 'No se pudo registrar el pago.');
  }
}

/** Write the columns present in `patch` (plus `updated_at`) and return the row. */
async function updatePartial(
  id: number,
  patch: PatchPurchasePaymentInput
): Promise<RepoResult<PurchasePayment>> {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ ...patch, updated_at: nowIso() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return repoSuccess(data as PurchasePayment);
  } catch (error) {
    return repoFailure(error, 'No se pudo actualizar el pago.');
  }
}

/** Full update of a payment (amount / extra-fee flag). */
async function update(
  id: number,
  input: UpdatePurchasePaymentInput
): Promise<RepoResult<PurchasePayment>> {
  return updatePartial(id, input);
}

/** Apply the same patch to several payments in one request. */
async function updateMany(
  ids: number[],
  patch: PatchPurchasePaymentInput
): Promise<RepoResult<PurchasePayment[]>> {
  if (ids.length === 0) return repoSuccess([]);

  try {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ ...patch, updated_at: nowIso() })
      .in('id', ids)
      .select();

    if (error) throw error;
    return repoSuccess((data ?? []) as PurchasePayment[]);
  } catch (error) {
    return repoFailure(error, 'No se pudieron actualizar los pagos.');
  }
}

/** Delete one payment (the parent purchase's totals are recomputed by trigger). */
async function remove(id: number): Promise<RepoResult<null>> {
  try {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw error;
    return repoSuccess(null);
  } catch (error) {
    return repoFailure(error, 'No se pudo eliminar el pago.');
  }
}

/** Delete several payments in one request. */
async function removeMany(ids: number[]): Promise<RepoResult<null>> {
  if (ids.length === 0) return repoSuccess(null);

  try {
    const { error } = await supabase.from(TABLE).delete().in('id', ids);
    if (error) throw error;
    return repoSuccess(null);
  } catch (error) {
    return repoFailure(error, 'No se pudieron eliminar los pagos.');
  }
}

/**
 * Everything the app can do to `purchases_payments`.
 *
 * `delete`/`deleteMany` are bound to the internal `remove*` functions because
 * `delete` is a reserved word and cannot be used as a declaration name.
 */
export const purchasesPaymentsRepository = {
  find,
  findMany,
  create,
  update,
  updatePartial,
  updateMany,
  delete: remove,
  deleteMany: removeMany,
};

export type PurchasesPaymentsRepository = typeof purchasesPaymentsRepository;
