import { supabase } from '../lib/supabase';
import { nowIso, repoFailure, repoSuccess } from './types';
import type { RepoResult } from './types';

/** `public.products` — the catalogue of cupos. */
const TABLE = 'products';

/** One row of `public.products`, exactly as the database stores it. */
export interface Product {
  id: number;
  created_at: string;
  updated_at: string | null;
  name: string | null;
  description: string | null;
  /** Whole pesos. */
  value: number | null;
  release_date: string | null;
  /**
   * Legacy text column. The app never reads or writes it: the image lives in
   * the private `products-images` bucket under a path derived from
   * `name` + `id` (see productImagesRepository).
   */
  image_path: string | null;
}

/**
 * The columns the app is allowed to write. Everything else is owned by the
 * database (`id`, `created_at`) or by the repository/storage layer
 * (`updated_at`, `image_path`).
 */
export type ProductFields = Pick<Product, 'name' | 'description' | 'value' | 'release_date'>;

/** New product — every editable column is supplied (nulls are allowed). */
export type CreateProductInput = ProductFields;
/** Full update — the whole editable set is written. */
export type UpdateProductInput = ProductFields;
/** Partial update — only the columns present in the object are touched. */
export type PatchProductInput = Partial<ProductFields>;

export interface FindManyProductsOptions {
  /** Restrict the query to these ids (`.in('id', ids)`); omit for everything. */
  ids?: number[];
  /** Sort key; defaults to newest id first — the order the grid renders in. */
  orderBy?: { column: 'id' | 'name' | 'created_at' | 'release_date'; ascending: boolean };
}

const DEFAULT_ORDER: NonNullable<FindManyProductsOptions['orderBy']> = {
  column: 'id',
  ascending: false,
};

/** One product by id, or `null` when it does not exist. */
async function find(id: number): Promise<RepoResult<Product | null>> {
  try {
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return repoSuccess(data as Product | null);
  } catch (error) {
    return repoFailure(error, 'No se pudo obtener el producto.');
  }
}

/** The list query behind the product grid. */
async function findMany(options: FindManyProductsOptions = {}): Promise<RepoResult<Product[]>> {
  const { ids, orderBy = DEFAULT_ORDER } = options;

  try {
    let query = supabase.from(TABLE).select('*');
    if (ids && ids.length > 0) {
      query = query.in('id', ids);
    }

    const { data, error } = await query.order(orderBy.column, { ascending: orderBy.ascending });
    if (error) throw error;
    return repoSuccess((data ?? []) as Product[]);
  } catch (error) {
    return repoFailure(error, 'No se pudieron obtener los productos.');
  }
}

/** Insert one product and return the stored row. */
async function create(input: CreateProductInput): Promise<RepoResult<Product>> {
  try {
    const { data, error } = await supabase.from(TABLE).insert([input]).select().single();
    if (error) throw error;
    return repoSuccess(data as Product);
  } catch (error) {
    return repoFailure(error, 'No se pudo crear el producto.');
  }
}

/** Write the columns present in `patch` (plus `updated_at`) and return the row. */
async function updatePartial(id: number, patch: PatchProductInput): Promise<RepoResult<Product>> {
  try {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ ...patch, updated_at: nowIso() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return repoSuccess(data as Product);
  } catch (error) {
    return repoFailure(error, 'No se pudo actualizar el producto.');
  }
}

/**
 * Full update: the caller hands over every editable column. Identical to
 * {@link updatePartial} at the SQL level (PostgREST only writes the keys it
 * receives) — the difference is the contract the caller signs: with `update`,
 * any column left out is *intentionally* written as `undefined`/null.
 */
async function update(id: number, input: UpdateProductInput): Promise<RepoResult<Product>> {
  return updatePartial(id, input);
}

/** Apply the same patch to several products in one request. */
async function updateMany(ids: number[], patch: PatchProductInput): Promise<RepoResult<Product[]>> {
  if (ids.length === 0) return repoSuccess([]);

  try {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ ...patch, updated_at: nowIso() })
      .in('id', ids)
      .select();

    if (error) throw error;
    return repoSuccess((data ?? []) as Product[]);
  } catch (error) {
    return repoFailure(error, 'No se pudieron actualizar los productos.');
  }
}

/** Delete one product by id. */
async function remove(id: number): Promise<RepoResult<null>> {
  try {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw error;
    return repoSuccess(null);
  } catch (error) {
    return repoFailure(error, 'No se pudo eliminar el producto.');
  }
}

/** Delete several products in one request. */
async function removeMany(ids: number[]): Promise<RepoResult<null>> {
  if (ids.length === 0) return repoSuccess(null);

  try {
    const { error } = await supabase.from(TABLE).delete().in('id', ids);
    if (error) throw error;
    return repoSuccess(null);
  } catch (error) {
    return repoFailure(error, 'No se pudieron eliminar los productos.');
  }
}

/**
 * Everything the app can do to `products`.
 *
 * `delete`/`deleteMany` are bound to the internal `remove*` functions because
 * `delete` is a reserved word and cannot be used as a declaration name.
 */
export const productsRepository = {
  find,
  findMany,
  create,
  update,
  updatePartial,
  updateMany,
  delete: remove,
  deleteMany: removeMany,
};

export type ProductsRepository = typeof productsRepository;
