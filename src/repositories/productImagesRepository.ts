import { supabase } from '../lib/supabase';
import { repoFailure, repoSuccess } from './types';
import type { RepoResult } from './types';

/** Private Storage bucket holding one image per product. */
export const PRODUCT_IMAGES_BUCKET = 'products-images';

/** How long a signed image URL stays valid before it must be re-requested. */
export const SIGNED_URL_EXPIRY_SECONDS = 60 * 60; // 1 hour

/** The minimum a product must expose for its image path to be derivable. */
export interface ProductImageRef {
  id: number;
  name: string | null;
}

/** Lowercase ASCII with hyphens — safe to use as a Storage object key. */
export function sanitizeSegment(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[^\x00-\x7F]/g, '') // strip accents (dropped after NFD decomposition) and other non-ASCII
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

/**
 * Deterministic storage key for a product's image: `"{productName}-{productId}"`.
 *
 * No table involved — the path is derived purely from the product's own record,
 * so it can always be recomputed to find, replace or delete the image.
 */
export function getPath(product: ProductImageRef): string {
  return `${sanitizeSegment(product.name || 'producto')}-${product.id}`;
}

/**
 * Short-lived signed URL for a product's image.
 *
 * Resolves with `data: null` when the product simply has no image yet (or the
 * bucket refuses to sign it), and `ok: false` only for a genuine transport
 * failure. The bucket is private, so `getPublicUrl()` does not work here — per
 * https://supabase.com/docs/guides/storage/buckets/fundamentals private buckets
 * are only readable via `createSignedUrl()` or an authenticated `download()`.
 * Unlike `getPublicUrl`, this makes a real network request, so callers await it.
 */
async function getSignedUrl(
  product: ProductImageRef,
  expiresIn: number = SIGNED_URL_EXPIRY_SECONDS
): Promise<RepoResult<string | null>> {
  try {
    const { data, error } = await supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .createSignedUrl(getPath(product), expiresIn);

    if (error) return repoSuccess(null);
    return repoSuccess(data?.signedUrl ?? null);
  } catch (error) {
    return repoFailure(error, 'No se pudo obtener la imagen.');
  }
}

/**
 * INSERT or UPDATE the stored file.
 *
 * The path is always the same for a given product, so re-uploading with
 * `upsert` is also how "replace the image" works.
 */
async function upload(
  product: ProductImageRef,
  file: File
): Promise<RepoResult<{ path: string; url: string | null }>> {
  const path = getPath(product);

  try {
    const { error } = await supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: true });

    if (error) throw error;

    const signed = await getSignedUrl(product);
    return repoSuccess({ path, url: signed.ok ? signed.data : null });
  } catch (error) {
    return repoFailure(error, 'No se pudo subir la imagen del producto.');
  }
}

/**
 * Re-key the stored file when a product is renamed, since the path is derived
 * from the product name.
 *
 * A missing source file (the product never had an image) is not a real failure
 * and resolves as success rather than surfacing an error to the user.
 */
async function move(oldProduct: ProductImageRef, newProduct: ProductImageRef): Promise<RepoResult<null>> {
  const fromPath = getPath(oldProduct);
  const toPath = getPath(newProduct);
  if (fromPath === toPath) return repoSuccess(null);

  try {
    const { error } = await supabase.storage.from(PRODUCT_IMAGES_BUCKET).move(fromPath, toPath);
    if (error && !/not.*found/i.test(error.message)) throw error;
    return repoSuccess(null);
  } catch (error) {
    return repoFailure(error, 'No se pudo renombrar la imagen del producto.');
  }
}

/** Delete the stored file for a product. */
async function remove(product: ProductImageRef): Promise<RepoResult<null>> {
  try {
    const { error } = await supabase.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .remove([getPath(product)]);

    if (error) throw error;
    return repoSuccess(null);
  } catch (error) {
    return repoFailure(error, 'No se pudo eliminar la imagen del producto.');
  }
}

/**
 * The `products-images` bucket. Storage rather than a table, but still one of
 * the client-talking surfaces, so it lives behind a repository like the rest.
 */
export const productImagesRepository = {
  getPath,
  getSignedUrl,
  upload,
  move,
  remove,
};

export type ProductImagesRepository = typeof productImagesRepository;
