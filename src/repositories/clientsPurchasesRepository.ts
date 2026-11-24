import { supabase } from '../lib/supabase';
import { nowIso, repoFailure, repoSuccess } from './types';
import type { Product } from './productsRepository';
import type { RepoResult } from './types';

/** `public.clients_purchases` — one client buying one product. */
const TABLE = 'clients_purchases';

/**
 * Embed used by the "Mis ventas" list: the row plus its product, resolved by
 * PostgREST through the `clients_purchases.product_id → products.id` foreign
 * key in a single request.
 */
const WITH_PRODUCT = '*, product:products(*)';

/** One row of `public.clients_purchases`, exactly as the database stores it. */
export interface ClientPurchase {
  id: number;
  created_at: string;
  updated_at: string | null;
  client_name: string | null;
  client_first_name: string | null;
  client_phone_number: string | null;
  client_social_media: string | null;
  is_fully_paid: boolean | null;
  agreed_fees: number | null;
  /** App-maintained: the money received against this purchase (no trigger). */
  amount_paid_so_far: number | null;
  /** App-maintained: the sum of fines owed (rows in `purchases_extra_fees`). */
  extra_charges_total: number | null;
  product_id: number | null;
  /** Owner profile (links to `profiles.id`); `null` = walk-in customer. */
  profile_id: string | null;
  /** Free-text lifecycle label; the database defaults it to 'no_payment_done'. */
  status: string | null;
}

/**
 * A purchase with its product attached (see {@link WITH_PRODUCT}). `product` is
 * `null` only when the purchase has no `product_id` (or it was deleted).
 */
export interface ClientPurchaseWithProduct extends ClientPurchase {
  product: Product | null;
}

/**
 * Columns a caller may set when creating a purchase.
 *
 * The money totals (`amount_paid_so_far`, `extra_charges_total`, `is_fully_paid`)
 * are **not** here: there is no database trigger, so the repository seeds them at
 * `0` / `0` / `false` on insert and the app writes them afterwards through
 * {@link updateTotals}.
 */
export type CreateClientPurchaseInput = Pick<
  ClientPurchase,
  | 'client_name'
  | 'client_first_name'
  | 'client_phone_number'
  | 'client_social_media'
  | 'agreed_fees'
  | 'product_id'
> & {
  /** Owner profile; omit for a walk-in customer. */
  profile_id?: string | null;
};

/** Full update of the client/fee details — `product_id` is never moved. */
export type UpdateClientPurchaseInput = Pick<
  ClientPurchase,
  | 'client_name'
  | 'client_first_name'
  | 'client_phone_number'
  | 'client_social_media'
  | 'agreed_fees'
  | 'profile_id'
>;

/** Partial update — only the client/fee fields present are touched. */
export type PatchClientPurchaseInput = Partial<UpdateClientPurchaseInput>;

/**
 * The totals the app computes and writes. No trigger owns these — after every
 * payment/fine mutation, `usePurchasePayments` derives them from the purchase's
 * payments and persists them here.
 */
export type UpdatePurchaseTotalsInput = Pick<
  ClientPurchase,
  'amount_paid_so_far' | 'extra_charges_total' | 'is_fully_paid'
>;

export interface FindManyClientPurchasesOptions {
  /** Restrict to the purchases of these products (`.in('product_id', ids)`). */
  productIds?: number[];
  /** Sort key; defaults to newest first — the order both lists render in. */
  orderBy?: { column: 'id' | 'created_at' | 'client_name'; ascending: boolean };
}

const DEFAULT_ORDER: NonNullable<FindManyClientPurchasesOptions['orderBy']> = {
  column: 'created_at',
  ascending: false,
};

/** One purchase by id, or `null` when it does not exist. */
async function find(id: number): Promise<RepoResult<ClientPurchase | null>> {
  try {
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return repoSuccess(data as ClientPurchase | null);
  } catch (error) {
    return repoFailure(error, 'No se pudo obtener la compra.');
  }
}

/** One purchase by id with its product attached. */
async function findWithProduct(id: number): Promise<RepoResult<ClientPurchaseWithProduct | null>> {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .select(WITH_PRODUCT)
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    return repoSuccess(data as ClientPurchaseWithProduct | null);
  } catch (error) {
    return repoFailure(error, 'No se pudo obtener la compra.');
  }
}

/** Bare purchase rows, optionally limited to a set of products. */
async function findMany(
  options: FindManyClientPurchasesOptions = {}
): Promise<RepoResult<ClientPurchase[]>> {
  const { productIds, orderBy = DEFAULT_ORDER } = options;

  try {
    let query = supabase.from(TABLE).select('*');
    if (productIds && productIds.length > 0) {
      query = query.in('product_id', productIds);
    }

    const { data, error } = await query.order(orderBy.column, { ascending: orderBy.ascending });
    if (error) throw error;
    return repoSuccess((data ?? []) as ClientPurchase[]);
  } catch (error) {
    return repoFailure(error, 'No se pudieron obtener las compras.');
  }
}

/**
 * Every purchase with its product attached — the read model behind the
 * "Mis ventas" list, which needs the product name next to the client name.
 */
async function findManyWithProduct(
  options: FindManyClientPurchasesOptions = {}
): Promise<RepoResult<ClientPurchaseWithProduct[]>> {
  const { productIds, orderBy = DEFAULT_ORDER } = options;

  try {
    let query = supabase.from(TABLE).select(WITH_PRODUCT);
    if (productIds && productIds.length > 0) {
      query = query.in('product_id', productIds);
    }

    const { data, error } = await query.order(orderBy.column, { ascending: orderBy.ascending });
    if (error) throw error;
    return repoSuccess((data ?? []) as ClientPurchaseWithProduct[]);
  } catch (error) {
    return repoFailure(error, 'No se pudieron obtener las compras.');
  }
}

/** Register a purchase; the app-owned totals start at 0 / 0 / false. */
async function create(input: CreateClientPurchaseInput): Promise<RepoResult<ClientPurchase>> {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .insert([{ ...input, amount_paid_so_far: 0, extra_charges_total: 0, is_fully_paid: false }])
      .select()
      .single();

    if (error) throw error;
    return repoSuccess(data as ClientPurchase);
  } catch (error) {
    return repoFailure(error, 'No se pudo registrar la compra.');
  }
}

/** Write the columns present in `patch` (plus `updated_at`) and return the row. */
async function updatePartial(
  id: number,
  patch: PatchClientPurchaseInput
): Promise<RepoResult<ClientPurchase>> {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ ...patch, updated_at: nowIso() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return repoSuccess(data as ClientPurchase);
  } catch (error) {
    return repoFailure(error, 'No se pudo actualizar la compra.');
  }
}

/**
 * Persist the client-computed totals. There is no database trigger, so the app
 * is the single owner of `amount_paid_so_far`, `extra_charges_total` and
 * `is_fully_paid`: it writes them here after every payment/fine mutation.
 */
async function updateTotals(
  id: number,
  totals: UpdatePurchaseTotalsInput
): Promise<RepoResult<ClientPurchase>> {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ ...totals, updated_at: nowIso() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return repoSuccess(data as ClientPurchase);
  } catch (error) {
    return repoFailure(error, 'No se pudo actualizar la compra.');
  }
}

/** Full update of the client/fee details. */
async function update(
  id: number,
  input: UpdateClientPurchaseInput
): Promise<RepoResult<ClientPurchase>> {
  return updatePartial(id, input);
}

/** Apply the same patch to several purchases in one request. */
async function updateMany(
  ids: number[],
  patch: PatchClientPurchaseInput
): Promise<RepoResult<ClientPurchase[]>> {
  if (ids.length === 0) return repoSuccess([]);

  try {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ ...patch, updated_at: nowIso() })
      .in('id', ids)
      .select();

    if (error) throw error;
    return repoSuccess((data ?? []) as ClientPurchase[]);
  } catch (error) {
    return repoFailure(error, 'No se pudieron actualizar las compras.');
  }
}

/** Delete one purchase; its payments cascade through the foreign key. */
async function remove(id: number): Promise<RepoResult<null>> {
  try {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw error;
    return repoSuccess(null);
  } catch (error) {
    return repoFailure(error, 'No se pudo eliminar la compra.');
  }
}

/** Delete several purchases in one request (payments cascade too). */
async function removeMany(ids: number[]): Promise<RepoResult<null>> {
  if (ids.length === 0) return repoSuccess(null);

  try {
    const { error } = await supabase.from(TABLE).delete().in('id', ids);
    if (error) throw error;
    return repoSuccess(null);
  } catch (error) {
    return repoFailure(error, 'No se pudieron eliminar las compras.');
  }
}

/**
 * Everything the app can do to `clients_purchases`.
 *
 * `delete`/`deleteMany` are bound to the internal `remove*` functions because
 * `delete` is a reserved word and cannot be used as a declaration name.
 */
export const clientsPurchasesRepository = {
  find,
  findWithProduct,
  findMany,
  findManyWithProduct,
  create,
  update,
  updatePartial,
  updateTotals,
  updateMany,
  delete: remove,
  deleteMany: removeMany,
};

export type ClientsPurchasesRepository = typeof clientsPurchasesRepository;
