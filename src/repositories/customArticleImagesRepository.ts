import { supabase } from '../lib/supabase';
import { repoFailure, repoSuccess } from './types';
import type { RepoResult } from './types';

/** Private Storage bucket holding one image per custom article order. */
export const CUSTOM_ARTICLE_IMAGES_BUCKET = 'handmade-article-images';

/** How long a signed image URL stays valid before it must be re-requested. */
export const SIGNED_URL_EXPIRY_SECONDS = 60 * 60; // 1 hour

/** The minimum an order must expose for its image path to be derivable. */
export interface CustomArticleImageRef {
  id: number;
  profile_id: string | null;
}

/**
 * Deterministic storage key for a custom article's image: `"{profileId}/{orderId}"`.
 *
 * The first path segment is the owning profile, so the customer read policy can
 * scope reads with `(storage.foldername(name))[1] = auth.uid()::text`. The file
 * is keyed on the order id (not the name), so renaming the article never has to
 * move the file — only reassigning its owner does.
 */
export function getPath(order: CustomArticleImageRef): string {
  const folder = order.profile_id ?? 'unowned';
  return `${folder}/${order.id}`;
}

/**
 * Short-lived signed URL for an order's image, or `null` when it has none yet.
 *
 * The bucket is private, so `getPublicUrl()` does not work — per
 * https://supabase.com/docs/guides/storage/buckets/fundamentals private buckets
 * are only readable via `createSignedUrl()` or an authenticated `download()`.
 */
async function getSignedUrl(
  order: CustomArticleImageRef,
  expiresIn: number = SIGNED_URL_EXPIRY_SECONDS
): Promise<RepoResult<string | null>> {
  try {
    const { data, error } = await supabase.storage
      .from(CUSTOM_ARTICLE_IMAGES_BUCKET)
      .createSignedUrl(getPath(order), expiresIn);

    if (error) return repoSuccess(null);
    return repoSuccess(data?.signedUrl ?? null);
  } catch (error) {
    return repoFailure(error, 'No se pudo obtener la imagen.');
  }
}

/**
 * INSERT or UPDATE the stored file. The path is always the same for a given
 * order, so re-uploading with `upsert` is also how "replace the image" works.
 */
async function upload(
  order: CustomArticleImageRef,
  file: File
): Promise<RepoResult<{ path: string; url: string | null }>> {
  const path = getPath(order);

  try {
    const { error } = await supabase.storage
      .from(CUSTOM_ARTICLE_IMAGES_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: true });

    if (error) throw error;

    const signed = await getSignedUrl(order);
    return repoSuccess({ path, url: signed.ok ? signed.data : null });
  } catch (error) {
    return repoFailure(error, 'No se pudo subir la imagen.');
  }
}

/** Delete the stored file for an order. */
async function remove(order: CustomArticleImageRef): Promise<RepoResult<null>> {
  try {
    const { error } = await supabase.storage
      .from(CUSTOM_ARTICLE_IMAGES_BUCKET)
      .remove([getPath(order)]);

    if (error) throw error;
    return repoSuccess(null);
  } catch (error) {
    return repoFailure(error, 'No se pudo eliminar la imagen.');
  }
}

/**
 * Re-key the stored file when an order is reassigned to a different owner, since
 * the path's folder is the profile id.
 *
 * A missing source file (the order never had an image) is not a real failure and
 * resolves as success rather than surfacing an error to the user.
 */
async function move(
  oldOrder: CustomArticleImageRef,
  newOrder: CustomArticleImageRef
): Promise<RepoResult<null>> {
  const fromPath = getPath(oldOrder);
  const toPath = getPath(newOrder);
  if (fromPath === toPath) return repoSuccess(null);

  try {
    const { error } = await supabase.storage
      .from(CUSTOM_ARTICLE_IMAGES_BUCKET)
      .move(fromPath, toPath);
    if (error && !/not.*found/i.test(error.message)) throw error;
    return repoSuccess(null);
  } catch (error) {
    return repoFailure(error, 'No se pudo mover la imagen.');
  }
}

/**
 * The `handmade-article-images` bucket. Storage rather than a table, but still
 * one of the client-talking surfaces, so it lives behind a repository like the
 * rest.
 */
export const customArticleImagesRepository = {
  getPath,
  getSignedUrl,
  upload,
  remove,
  move,
};

export type CustomArticleImagesRepository = typeof customArticleImagesRepository;
