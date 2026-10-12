/**
 * Skeleton primitives — the shape of content that has not arrived yet.
 *
 * The rule they exist to enforce: **a skeleton is for the first load, never for
 * a refetch.** A refresh that replaces live rows with grey boxes throws away
 * work the user can already see and reads as jank; keep the rows on screen and
 * let the existing spinner carry the "working" signal.
 *
 * Accessibility contract: every leaf here is decorative and `aria-hidden`. The
 * *container* speaks — `SkeletonList` and `SkeletonCardGrid` own the single
 * `role="status"` region and its one visually-hidden label, so a list of ten
 * placeholders is announced once rather than ten times.
 *
 * Geometry lives in the stylesheets: `.skeleton*` in `theme.css` for the shared
 * shimmer and the named line widths, and the card/row twins in `dashboard.css`
 * next to the components whose shape they copy. A skeleton has no tokens of its
 * own; it is built from `--color-surface-sunken` and `--color-border`.
 */

export interface SkeletonProps {
  /** Extra classes, for the shape the caller needs. */
  className?: string;
}

export interface SkeletonTextProps extends SkeletonProps {
  /** How many lines to draw. The last one ends short, like a real paragraph. */
  lines?: number;
}

export interface SkeletonListProps extends SkeletonProps {
  /** How many rows to draw. Four is roughly one phone screen of sales. */
  rows?: number;
  /** The one line a screen reader hears, in the user's language. */
  label: string;
}

export interface SkeletonCardGridProps extends SkeletonProps {
  /** How many cards to draw. Three fills a desktop row without lying. */
  count?: number;
  /** The one line a screen reader hears, in the user's language. */
  label: string;
}

/** Joins the class names that are actually present. */
function cx(...values: Array<string | false | undefined>): string {
  return values.filter(Boolean).join(' ');
}

/**
 * A stand-in for a run of text. One line by default; pass `lines` for a
 * paragraph, whose last line is drawn short so the block does not read as a
 * solid rectangle.
 */
export function SkeletonText({ lines = 1, className }: SkeletonTextProps) {
  if (lines <= 1) {
    return <span aria-hidden="true" className={cx('skeleton', 'skeletonLine', className)} />;
  }

  return (
    <span aria-hidden="true" className={cx('skeletonText', className)}>
      {Array.from({ length: lines }, (_, index) => (
        <span
          key={`skeleton-line-${index}`}
          className={cx(
            'skeleton',
            'skeletonLine',
            index === lines - 1 && 'skeletonLine--short'
          )}
        />
      ))}
    </span>
  );
}

/**
 * The loading twin of a product card: image block, name and badge, value and
 * purchase count. Sits inside the grid a caller already uses, so the real cards
 * land in exactly the same places.
 */
export function SkeletonCard({ className }: SkeletonProps) {
  return (
    <span aria-hidden="true" className={cx('skeletonCard', className)}>
      <span className="skeleton skeletonBlock skeletonCardMedia" />
      <span className="skeletonCardHeader">
        <span className="skeleton skeletonLine skeletonLine--title" />
        <span className="skeleton skeletonLine skeletonLine--label" />
      </span>
      <span className="skeletonCardMeta">
        <span className="skeleton skeletonLine skeletonLine--value" />
        <span className="skeleton skeletonLine skeletonLine--value" />
      </span>
    </span>
  );
}

/**
 * The loading twin of a sale row: client name over its metadata, and the money
 * column on the other side.
 */
export function SkeletonRow({ className }: SkeletonProps) {
  return (
    <span aria-hidden="true" className={cx('skeletonRow', className)}>
      <span className="skeletonRowMain">
        <span className="skeleton skeletonLine skeletonLine--title" />
        <span className="skeleton skeletonLine skeletonLine--meta" />
      </span>
      <span className="skeletonRowSide">
        <span className="skeleton skeletonLine" />
        <span className="skeleton skeletonLine" />
      </span>
    </span>
  );
}

/**
 * A product grid that is still loading. Owns the region's `role="status"`, so
 * pass the translated loading copy in `label` — it is the only thing announced.
 */
export function SkeletonCardGrid({ count = 3, label, className }: SkeletonCardGridProps) {
  return (
    <div className={cx('productsGrid', className)} role="status" aria-live="polite">
      <span className="visuallyHidden">{label}</span>
      {Array.from({ length: count }, (_, index) => (
        <SkeletonCard key={`skeleton-card-${index}`} />
      ))}
    </div>
  );
}

/**
 * The sales list that is still loading. Same contract as `SkeletonCardGrid`:
 * the container speaks once, and the rows themselves are decorative.
 */
export function SkeletonList({ rows = 4, label, className }: SkeletonListProps) {
  return (
    <div className={cx('salesList', className)} role="status" aria-live="polite">
      <span className="visuallyHidden">{label}</span>
      {Array.from({ length: rows }, (_, index) => (
        <SkeletonRow key={`skeleton-row-${index}`} />
      ))}
    </div>
  );
}
