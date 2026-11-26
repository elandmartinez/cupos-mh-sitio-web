import { useTranslation } from 'react-i18next';
import Button from '../button';

interface PaginationProps {
  /** The current page, 0-based. */
  page: number;
  /** The total number of pages (>= 1). */
  totalPages: number;
  /** Called with the new (0-based) page when Previous or Next is pressed. */
  onPageChange: (page: number) => void;
}

/**
 * Previous / page-label / Next bar for a paginated list.
 *
 * It is deliberately minimal: two labelled buttons around a status line, and
 * no numeric page list. That keeps the control usable on a phone and avoids
 * promising a roving-tabindex contract a full page strip would owe. The
 * buttons are real `Button`s with visible text labels, so screen readers
 * announce "Anterior" / "Siguiente" without extra `aria-label`s; the status
 * line is the same `pagination.page` string the sighted user reads.
 *
 * `page` is 0-based because it maps 1:1 onto the paginated hook's `page`
 * state; the status line renders it 1-based for humans. "Previous" is
 * disabled on the first page and "Next" on the last, so the control can never
 * offer a move that lands outside the range.
 *
 * Returns `null` when there is a single page or none — a one-page list has
 * nothing to page through, and rendering an all-disabled bar would only add
 * noise.
 */
export default function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  const { t } = useTranslation();

  if (totalPages <= 1) return null;

  return (
    <nav className="paginationBar" aria-label={t('pagination.page', { page: page + 1, total: totalPages })}>
      <Button
        variant="secondary"
        size="sm"
        disabled={page === 0}
        onClick={() => onPageChange(page - 1)}
      >
        {t('pagination.previous')}
      </Button>
      <span className="paginationStatus">
        {t('pagination.page', { page: page + 1, total: totalPages })}
      </span>
      <Button
        variant="secondary"
        size="sm"
        disabled={page >= totalPages - 1}
        onClick={() => onPageChange(page + 1)}
      >
        {t('pagination.next')}
      </Button>
    </nav>
  );
}
