import { useCallback, useState } from 'react';
import {
  CUSTOM_ARTICLE_IMAGES_BUCKET,
  customArticleImagesRepository,
} from '../repositories/customArticleImagesRepository';
import type { CustomArticleImageRef } from '../repositories/customArticleImagesRepository';

export { CUSTOM_ARTICLE_IMAGES_BUCKET };

/** Alias kept for callers that only need the storage key. */
export const getCustomArticleImagePath = customArticleImagesRepository.getPath;

/**
 * Short-lived signed URL for an order's image, or `null` when the order has no
 * image yet (or the request otherwise fails).
 */
export async function getCustomArticleImageSignedUrl(
  order: CustomArticleImageRef,
  expiresIn?: number
): Promise<string | null> {
  const result = await customArticleImagesRepository.getSignedUrl(order, expiresIn);
  return result.ok ? result.data : null;
}

/**
 * The `handmade-article-images` bucket.
 *
 * Paths are keyed on the order id (`{orderId}`), so "replace the image" is an
 * upsert to the same key and no rename ever has to move the file — see
 * `customArticleImagesRepository` for the storage calls.
 */
export function useCustomArticleImages() {
  const [error, setError] = useState<string | null>(null);

  const uploadImage = useCallback(async (order: CustomArticleImageRef, file: File) => {
    setError(null);
    const result = await customArticleImagesRepository.upload(order, file);

    if (!result.ok) {
      setError(result.error);
      return { path: null, url: null, error: result.error };
    }

    return { path: result.data.path, url: result.data.url, error: null };
  }, []);

  const removeImage = useCallback(async (order: CustomArticleImageRef) => {
    setError(null);
    const result = await customArticleImagesRepository.remove(order);

    if (!result.ok) {
      setError(result.error);
      return { error: result.error };
    }

    return { error: null };
  }, []);

  // Re-key the stored file when the order's owner changes (the folder is the
  // profile id). A missing source file (no image yet) is swallowed.
  const moveImage = useCallback(
    async (oldOrder: CustomArticleImageRef, newOrder: CustomArticleImageRef) => {
      setError(null);
      const result = await customArticleImagesRepository.move(oldOrder, newOrder);

      if (!result.ok) {
        setError(result.error);
        return { error: result.error };
      }

      return { error: null };
    },
    []
  );

  return {
    error,
    uploadImage,
    removeImage,
    moveImage,
    getSignedUrl: getCustomArticleImageSignedUrl,
    getPath: getCustomArticleImagePath,
  };
}
