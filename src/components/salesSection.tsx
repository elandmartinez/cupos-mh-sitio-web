import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormatters } from '../hooks/useFormatters';
import EmptyState from './emptyState';
import { SkeletonList } from './ui';
import type { ClientPurchaseWithProduct } from '../hooks/useClientPurchases';

interface SalesSectionProps {
  purchases: ClientPurchaseWithProduct[];
  loading: boolean;
  error: string | null;
  /** Re-runs the fetch after a failure: a blocked panel always offers a way out. */
  onRetry: () => void;
  /** Opens the edit modal for one sale — the whole row is the control. */
  onOpenPurchase: (purchase: ClientPurchaseWithProduct) => void;
}

/**
 * "Mis ventas" — every client purchase across all products: the read-only
 * overview that answers "who still owes me?".
 *
 * Each row is a single button that opens the edit modal for that purchase, so a
 * customer can be reached without searching for their product first.
 */
export default function SalesSection({
  purchases,
  loading,
  error,
  onRetry,
  onOpenPurchase,
}: SalesSectionProps) {
  const { t } = useTranslation();
  // Dates and money both follow the language, so a switch re-renders them.
  const { formatCurrency, formatDate } = useFormatters();

  // Pending first — the reason to open this list — then the newest-first order
  // the query returned (Array#sort is stable, so equal keys keep it).
  const sortedPurchases = useMemo(
    () =>
      [...purchases].sort(
        (a, b) => Number(Boolean(a.is_fully_paid)) - Number(Boolean(b.is_fully_paid))
      ),
    [purchases]
  );

  if (error) {
    // Page-level failure: a persistent banner, not a toast, with the retry in it.
    return (
      <div className="banner banner--danger" role="alert">
        <p>{error}</p>
        <button type="button" onClick={onRetry} className="btnSecondary">
          {t('common.retry')}
        </button>
      </div>
    );
  }

  // Only the first load shows a skeleton: a refresh keeps the rows that are
  // already on screen (the flag is shared with the per-product purchase fetch).
  // Waiting on grey boxes when real rows are visible would throw away work the
  // user can already read — the rule the primitives exist to enforce.
  if (loading && purchases.length === 0) {
    return <SkeletonList label={t('sales.loading')} />;
  }

  if (sortedPurchases.length === 0) {
    return <EmptyState art="sales" title={t('sales.emptyTitle')} body={t('sales.emptyBody')} />;
  }

  return (
    <ul className="salesList">
      {sortedPurchases.map((purchase) => {
        const isFullyPaid = Boolean(purchase.is_fully_paid);
        // A row inserted in this session has no joined product yet, so fall
        // back to its id rather than claiming the product was deleted.
        const productName =
          purchase.product?.name ||
          (purchase.product_id != null
            ? t('common.productNumber', { id: purchase.product_id })
            : t('common.productFallback'));

        const metaParts: string[] = [productName];
        if (purchase.client_phone_number) metaParts.push(purchase.client_phone_number);
        const date = formatDate(purchase.created_at);
        if (date) metaParts.push(date);

        // Fines are owed on top of the agreed fee, so the "of total" figure and
        // the progress bar measure against the fee plus any fines.
        const totalOwed = (purchase.agreed_fees ?? 0) + (purchase.extra_charges_total ?? 0);
        const progressPct = totalOwed
          ? Math.min(100, Math.round(((purchase.amount_paid_so_far || 0) / totalOwed) * 100))
          : 0;

        return (
          <li key={purchase.id} className="salesListItem">
            <button
              type="button"
              className="saleRow"
              onClick={() => onOpenPurchase(purchase)}
              aria-haspopup="dialog"
              aria-label={t('sales.editAria', {
                name: purchase.client_name || t('common.unnamedClient'),
              })}
            >
              <span className="saleMain">
                <span className="saleClientName">
                  {purchase.client_name || t('common.unnamedClient')}
                </span>
                <span className="saleMeta">{metaParts.join(' · ')}</span>
              </span>

              <span className="saleSide">
                <span className="saleMoney">
                  {formatCurrency(purchase.amount_paid_so_far)}
                  <span className="saleMoneyTotal">
                    {t('sales.paidOfTotal', { total: formatCurrency(totalOwed) })}
                  </span>
                </span>
                <span className={`badge ${isFullyPaid ? 'badge--success' : 'badge--warning'}`}>
                  {isFullyPaid ? t('purchases.paid') : t('purchases.pending')}
                </span>
              </span>

              <span className="saleProgress" aria-hidden="true">
                <span className="purchaseProgressBar">
                  <span className="purchaseProgressFill" style={{ width: `${progressPct}%` }} />
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
