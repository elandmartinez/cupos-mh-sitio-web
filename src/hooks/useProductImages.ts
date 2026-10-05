import { useCallback, useState } from 'react';
import {
  PRODUCT_IMAGES_BUCKET,
  productImagesRepository,
} from '../repositories/productImagesRepository';
import type { ProductImageRef } from '../repositories/productImagesRepository';

export { PRODUCT_IMAGES_BUCKET };

/** Alias kept for callers that only need the storage key. */
export const getProductImagePath = productImagesRepository.getPath;

/**
 * Short-lived signed URL for a product's image, or `null` when the product has
 * no image yet (or the request otherwise fails) — the flat shape
 * `<ProductImage>` expects. Repositories report the difference between "no
 * image" and "couldn't ask" via `RepoResult`; the display path only cares that
 * there is nothing to show.
 */
export async function getProductImageSignedUrl(
  product: ProductImageRef,
  expiresIn?: number,
): Promise<string | null> {
  const result = await productImagesRepository.getSignedUrl(product, expiresIn);
  return result.ok ? result.data : null;
}

/**
 * The `products-images` bucket.
 *
 * Storage paths are derived from the product itself (`{name}-{id}`), so
 * "replace the image" is an upsert to the same key and a rename has to move the
 * file — see `productImagesRepository` for the storage calls and `useProducts`
 * for the database side.
 */
export function useProductImages() {
  const [error, setError] = useState<string | null>(null);

  // INSERT or UPDATE — the path is always the same for a given product, so
  // re-uploading with upsert is how "replace the image" works too.
  const uploadProductImage = useCallback(async (product: ProductImageRef, file: File) => {
    setError(null);
    const result = await productImagesRepository.upload(product, file);

    if (!result.ok) {
      setError(result.error);
      return { path: null, url: null, error: result.error };
    }

    return { path: result.data.path, url: result.data.url, error: null };
  }, []);

  // Re-key the stored file when a product is renamed, since the path is
  // derived from the product name. A missing source file (product never had
  // an image) is not a real failure, so it's swallowed rather than surfaced.
  const renameProductImage = useCallback(
    async (oldProduct: ProductImageRef, newProduct: ProductImageRef) => {
      setError(null);
      const result = await productImagesRepository.move(oldProduct, newProduct);

      if (!result.ok) {
        setError(result.error);
        return { error: result.error };
      }

      return { error: null };
    },
    []
  );

  // DELETE
  const deleteProductImage = useCallback(async (product: ProductImageRef) => {
    setError(null);
    const result = await productImagesRepository.remove(product);

    if (!result.ok) {
      setError(result.error);
      return { error: result.error };
    }

    return { error: null };
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
