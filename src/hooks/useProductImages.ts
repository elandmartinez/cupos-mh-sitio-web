import { useCallback, useState } from 'react';
import { supabase } from '../lib/supabase';

export const PRODUCT_IMAGES_BUCKET = 'products-images';

interface ProductRef {
  id: number;
  name: string | null;
}

function sanitizeSegment(value: string) {
  return value
    .normalize('NFD')
    .replace(/[^\x00-\x7F]/g, '') // strip accents (dropped after NFD decomposition) and other non-ASCII
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

/**
 * Deterministic storage key for a product's image: "{productName}-{productId}".
 * No DB table involved — the path is derived purely from the product's own
 * record, so it can always be recomputed to find/replace/delete the image.
 */
export function getProductImagePath(product: ProductRef) {
  return `${sanitizeSegment(product.name || 'producto')}-${product.id}`;
}

/** How long a signed image URL stays valid before it needs to be re-requested. */
const SIGNED_URL_EXPIRY_SECONDS = 60 * 60; // 1 hour

/**
 * Short-lived signed URL for a product's image, or `null` when the product
 * has no image yet (or the request otherwise fails).
 *
 * The bucket is private, so `getPublicUrl()` doesn't work here — per
 * https://supabase.com/docs/guides/storage/buckets/fundamentals, private
 * buckets are only readable via `createSignedUrl()` or an authenticated
 * `download()`. Unlike `getPublicUrl`, this makes a real network request,
 * so callers need to await it (see `<ProductImage>`, which owns fetching
 * this for display).
 */
export async function getProductImageSignedUrl(
  product: ProductRef,
  expiresIn: number = SIGNED_URL_EXPIRY_SECONDS,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(PRODUCT_IMAGES_BUCKET)
    .createSignedUrl(getProductImagePath(product), expiresIn);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export function useProductImages() {
  const [error, setError] = useState<string | null>(null);

  // INSERT or UPDATE — the path is always the same for a given product, so
  // re-uploading with upsert is how "replace the image" works too.
  const uploadProductImage = useCallback(async (product: ProductRef, file: File) => {
    try {
      setError(null);
      const path = getProductImagePath(product);
      const { error: uploadError } = await supabase.storage
        .from(PRODUCT_IMAGES_BUCKET)
        .upload(path, file, { contentType: file.type, upsert: true });

      if (uploadError) throw uploadError;
      return { path, url: await getProductImageSignedUrl(product), error: null };
    } catch (err: any) {
      setError(err.message || 'Failed to upload product image.');
      return { path: null, url: null, error: err.message };
    }
  }, []);

  // Re-key the stored file when a product is renamed, since the path is
  // derived from the product name. A missing source file (product never had
  // an image) is not a real failure, so it's swallowed rather than surfaced.
  const renameProductImage = useCallback(async (oldProduct: ProductRef, newProduct: ProductRef) => {
    const fromPath = getProductImagePath(oldProduct);
    const toPath = getProductImagePath(newProduct);
    if (fromPath === toPath) return { error: null };

    try {
      setError(null);
      const { error: moveError } = await supabase.storage
        .from(PRODUCT_IMAGES_BUCKET)
        .move(fromPath, toPath);

      if (moveError && !/not.*found/i.test(moveError.message)) throw moveError;
      return { error: null };
    } catch (err: any) {
      setError(err.message || 'Failed to rename product image.');
      return { error: err.message };
    }
  }, []);

  // DELETE
  const deleteProductImage = useCallback(async (product: ProductRef) => {
    try {
      setError(null);
      const { error: removeError } = await supabase.storage
        .from(PRODUCT_IMAGES_BUCKET)
        .remove([getProductImagePath(product)]);

      if (removeError) throw removeError;
      return { error: null };
    } catch (err: any) {
      setError(err.message || 'Failed to delete product image.');
      return { error: err.message };
    }
  }, []);

  return {
    error,
    uploadProductImage,
    renameProductImage,
    deleteProductImage,
    getSignedUrl: getProductImageSignedUrl,
    getPath: getProductImagePath,
  };
}
