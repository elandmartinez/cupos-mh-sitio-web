import { supabase } from '../lib/supabase';
import { nowIso, repoFailure, repoSuccess } from './types';
import type { RepoResult } from './types';

/** `public.custom_articles_orders` — an off-website custom order placed by a client. */
const TABLE = 'custom_articles_orders';

/** One row of `public.custom_articles_orders`, exactly as the database stores it. */
export interface CustomArticleOrder {
  id: number;
  created_at: string;
  updated_at: string | null;
  name: string | null;
  description: string | null;
  value: number | null;
  date_to_deliver: string | null;
  image_path: string | null;
  last_date_to_deliver: string | null;
  has_date_to_deliver_been_updated: boolean | null;
  profile_id: string | null;
  creation_progress: number | null;
}

/** The columns the app may write; the rest are DB- or app-owned. */
export type CustomArticleOrderFields = Pick<
  CustomArticleOrder,
  | 'name'
  | 'description'
  | 'value'
  | 'date_to_deliver'
  | 'last_date_to_deliver'
  | 'has_date_to_deliver_been_updated'
  | 'profile_id'
  | 'creation_progress'
>;

/** New order — every editable column is supplied (nulls allowed). */
export type CreateCustomArticleOrderInput = CustomArticleOrderFields;
/** Full update — the whole editable set is written. */
export type UpdateCustomArticleOrderInput = CustomArticleOrderFields;
/** Partial update — only the columns present are touched. */
export type PatchCustomArticleOrderInput = Partial<UpdateCustomArticleOrderInput>;

export interface FindManyCustomArticleOrdersOptions {
  orderBy?: { column: 'id' | 'created_at' | 'name'; ascending: boolean };
  /** Case-insensitive substring match on `name`. */
  search?: string;
  /** Zero-based, inclusive row window (`[from, to]`). */
  range?: [number, number];
}

const DEFAULT_ORDER: NonNullable<FindManyCustomArticleOrdersOptions['orderBy']> = {
  column: 'created_at',
  ascending: false,
};

/** One order by id, or `null` when it does not exist. */
async function find(id: number): Promise<RepoResult<CustomArticleOrder | null>> {
  try {
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return repoSuccess(data as CustomArticleOrder | null);
  } catch (error) {
    return repoFailure(error, 'No se pudo obtener el pedido personalizado.');
  }
}

/** The list query behind the "Pedidos personalizados" section. */
async function findMany(
  options: FindManyCustomArticleOrdersOptions = {}
): Promise<RepoResult<CustomArticleOrder[]>> {
  const { orderBy = DEFAULT_ORDER, search, range } = options;

  try {
    let query = supabase.from(TABLE).select('*');
    if (search) {
      query = query.ilike('name', '%' + search + '%');
    }
    if (range) {
      query = query.range(range[0], range[1]);
    }

    const { data, error } = await query.order(orderBy.column, {
      ascending: orderBy.ascending,
    });
    if (error) throw error;
    return repoSuccess((data ?? []) as CustomArticleOrder[]);
  } catch (error) {
    return repoFailure(error, 'No se pudieron obtener los pedidos personalizados.');
  }
}

/** Total number of orders, optionally filtered by the same `name` search. */
async function count(search?: string): Promise<RepoResult<number>> {
  try {
    let query = supabase.from(TABLE).select('*', { count: 'exact', head: true });
    if (search) {
      query = query.ilike('name', '%' + search + '%');
    }

    const { count: total, error } = await query;
    if (error) throw error;
    return repoSuccess(total ?? 0);
  } catch (error) {
    return repoFailure(error, 'No se pudieron contar los pedidos personalizados.');
  }
}

/** Insert one order and return the stored row. */
async function create(input: CreateCustomArticleOrderInput): Promise<RepoResult<CustomArticleOrder>> {
  try {
    const { data, error } = await supabase.from(TABLE).insert([input]).select().single();
    if (error) throw error;
    return repoSuccess(data as CustomArticleOrder);
  } catch (error) {
    return repoFailure(error, 'No se pudo crear el pedido personalizado.');
  }
}

/** Write the columns present in `patch` (plus `updated_at`) and return the row. */
async function updatePartial(
  id: number,
  patch: PatchCustomArticleOrderInput
): Promise<RepoResult<CustomArticleOrder>> {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ ...patch, updated_at: nowIso() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return repoSuccess(data as CustomArticleOrder);
  } catch (error) {
    return repoFailure(error, 'No se pudo actualizar el pedido personalizado.');
  }
}

/** Full update of the editable columns. */
async function update(
  id: number,
  input: UpdateCustomArticleOrderInput
): Promise<RepoResult<CustomArticleOrder>> {
  return updatePartial(id, input);
}

/** Delete one order. Its payment track and payments must be removed first (no cascade). */
async function remove(id: number): Promise<RepoResult<null>> {
  try {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw error;
    return repoSuccess(null);
  } catch (error) {
    return repoFailure(error, 'No se pudo eliminar el pedido personalizado.');
  }
}

/**
 * Everything the app can do to `custom_articles_orders`.
 *
 * `delete` is bound to the internal `remove` function because `delete` is a
 * reserved word and cannot be used as a declaration name.
 */
export const customArticlesOrdersRepository = {
  find,
  findMany,
  count,
  create,
  update,
  updatePartial,
  delete: remove,
};

export type CustomArticlesOrdersRepository = typeof customArticlesOrdersRepository;
