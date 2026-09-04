import { useEffect, useState } from 'react';

interface ProductImageRef {
  id: number;
  name: string | null;
}

interface ProductImageProps {
  product: ProductImageRef;
  /** Bumped by the parent after any upload/rename/delete, to force a fresh signed URL. */
  imageVersion: number;
  getSignedUrl: (product: ProductImageRef) => Promise<string | null>;
  className?: string;
  alt?: string;
  /** Called when the product has no image (or the signed URL couldn't be created). */
  onMissing?: () => void;
}

/**
 * Renders a product's image via a short-lived signed URL.
 *
 * The storage bucket is private, so `getPublicUrl` never actually serves the
 * file — every private-bucket read has to go through `createSignedUrl` (or
 * an authenticated `download()`), per
 * https://supabase.com/docs/guides/storage/buckets/fundamentals. Since that
 * call is async (unlike `getPublicUrl`, which just builds a string), this
 * component owns fetching + caching its own signed URL instead of the
 * parent building a `src` string inline.
 *
 * Renders nothing while loading, and nothing (calling `onMissing`) when the
 * product has no image yet or the URL request fails.
 */
export default function ProductImage({
  product,
  imageVersion,
  getSignedUrl,
  className,
  alt = '',
  onMissing,
}: ProductImageProps) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSrc(null);

    getSignedUrl(product).then((url) => {
      if (cancelled) return;
      if (url) {
        setSrc(url);
      } else {
        onMissing?.();
      }
    });

    return () => {
      cancelled = true;
    };
    // Only re-fetch when the product identity/name or the image version
    // actually changes — `getSignedUrl`/`onMissing` are intentionally
    // excluded so an unrelated parent re-render doesn't burn a new signed
    // URL request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id, product.name, imageVersion]);

  if (!src) return null;

  return <img src={src} alt={alt} className={className} />;
}
