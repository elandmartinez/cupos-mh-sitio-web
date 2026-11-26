import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface CustomArticleImageRef {
  id: number;
  profile_id: string | null;
}

interface CustomArticleImageProps {
  order: CustomArticleImageRef;
  /** Bumped by the parent after any upload/remove, to force a fresh signed URL. */
  imageVersion: number;
  getSignedUrl: (order: CustomArticleImageRef) => Promise<string | null>;
  className?: string;
  alt?: string;
  /** Called when the order has no image (or the signed URL couldn't be created). */
  onMissing?: () => void;
}

/**
 * Renders a custom article's image via a short-lived signed URL.
 *
 * Mirrors `ProductImage` for the `handmade-article-images` bucket: the bucket is
 * private, so every read goes through `createSignedUrl` (an async call), and this
 * component owns fetching + caching its own signed URL instead of the parent
 * building a `src` string inline. Renders nothing while loading, and a muted
 * placeholder (calling `onMissing`) when the order has no image yet.
 */
export default function CustomArticleImage({
  order,
  imageVersion,
  getSignedUrl,
  className,
  alt = '',
  onMissing,
}: CustomArticleImageProps) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing'>('loading');
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setSrc(null);

    getSignedUrl(order).then((url) => {
      if (cancelled) return;
      if (url) {
        setSrc(url);
        setStatus('ready');
      } else {
        setStatus('missing');
        onMissing?.();
      }
    });

    return () => {
      cancelled = true;
    };
    // Only re-fetch when the order identity, its owner (the path folder) or the
    // image version actually changes — `getSignedUrl`/`onMissing` are excluded
    // so an unrelated parent re-render doesn't burn a new signed-URL request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.id, order.profile_id, imageVersion]);

  if (status === 'loading') return null;

  if (status === 'missing') {
    return (
      <div
        className={`${className ?? ''} imagePlaceholder`}
        role="img"
        aria-label={t('common.imagePlaceholder')}
      >
        <span className="imagePlaceholderIcon" aria-hidden="true">🖼</span>
        <span className="imagePlaceholderText">{t('common.imagePlaceholder')}</span>
      </div>
    );
  }

  return (
    <img
      src={src ?? ''}
      alt={alt}
      className={className}
      width={200}
      height={200}
      loading="lazy"
      decoding="async"
    />
  );
}
