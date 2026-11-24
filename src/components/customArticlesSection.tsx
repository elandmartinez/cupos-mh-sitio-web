import { Suspense, lazy, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useCustomArticlesOrders } from '../hooks/useCustomArticlesOrders';
import { useProfiles } from '../hooks/useProfiles';
import { usePresent } from '../hooks/usePresent';
import { useFormatters } from '../hooks/useFormatters';
import CollapsibleSection from './collapsibleSection';
import EmptyState from './emptyState';
import Button from './button';
import { SkeletonList, SkeletonCard } from './ui';
import type { CustomArticleOrderWithTrack } from '../hooks/useCustomArticlesOrders';

// The create/edit modal (order + payments) is only reachable after a tap, so it
// is split out of the section's first-load chunk.
const CustomArticleOrderModal = lazy(() => import('./customArticleOrderModal'));

/**
 * The admin's "Pedidos personalizados" section: the list of custom article
 * orders plus the create/edit modal. Self-contained — it owns the
 * `useCustomArticlesOrders` and `useProfiles` hooks and renders its own
 * collapsible section and its dialog as siblings (so the dialog is never hidden
 * by the section folding).
 */
export default function CustomArticlesSection() {
  const { t } = useTranslation();
  const { formatCurrency, formatDate } = useFormatters();
  const {
    orders,
    paymentsByTrack,
    extraFeesByTrack,
    loading,
    error,
    fetchOrders,
    fetchPaymentsForTrack,
    fetchExtraFeesForTrack,
    addOrder,
    updateOrder,
    deleteOrder,
    addPayment,
    deletePayment,
    addExtraFee,
    deleteExtraFee,
  } = useCustomArticlesOrders();
  const { profiles, fetchProfiles } = useProfiles();

  // `null` means "create"; an order means "edit" (see `usePresent`).
  const orderDialog = usePresent<CustomArticleOrderWithTrack | null>();

  useEffect(() => {
    fetchOrders();
    fetchProfiles();
  }, [fetchOrders, fetchProfiles]);

  const meta = loading ? undefined : t('customOrders.count', { count: orders.length });

  return (
    <>
      <CollapsibleSection title={t('customOrders.sectionTitle')} meta={meta}>
        {loading && orders.length === 0 ? (
          <SkeletonList label={t('customOrders.loading')} />
        ) : orders.length === 0 ? (
          <EmptyState
            art="sales"
            title={t('customOrders.emptyTitle')}
            body={t('customOrders.emptyBody')}
            action={
              <Button variant="primary" icon="+" onClick={() => orderDialog.open(null)} aria-haspopup="dialog">
                {t('customOrders.new')}
              </Button>
            }
          />
        ) : (
          <>
            <div className="pageHeaderActions" style={{ marginBottom: 'var(--space-12)' }}>
              <Button variant="primary" icon="+" onClick={() => orderDialog.open(null)} aria-haspopup="dialog">
                {t('customOrders.new')}
              </Button>
            </div>
            <ul className="salesList">
              {orders.map((order) => {
                const track = order.track;
                const isFullyPaid = Boolean(track?.is_fully_paid);
                const totalOwed = (track?.agreed_fees ?? 0) + (track?.extra_charges_total ?? 0);
                const progressPct = totalOwed
                  ? Math.min(100, Math.round(((track?.amount_paid_so_far ?? 0) / totalOwed) * 100))
                  : 0;
                const metaParts: string[] = [];
                if (order.date_to_deliver) {
                  const date = formatDate(order.date_to_deliver);
                  if (date) metaParts.push(date);
                }
                return (
                  <li key={order.id} className="salesListItem">
                    <button
                      type="button"
                      className="saleRow"
                      onClick={() => orderDialog.open(order)}
                      aria-haspopup="dialog"
                    >
                      <span className="saleMain">
                        <span className="saleClientName">
                          {order.name || t('common.notAvailable')}
                        </span>
                        <span className="saleMeta">{metaParts.join(' · ')}</span>
                        {order.description && (
                          <span className="saleDescription">{order.description}</span>
                        )}
                      </span>
                      <span className="saleSide">
                        <span className="saleMoney">
                          {formatCurrency(track?.amount_paid_so_far)}
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
          </>
        )}
      </CollapsibleSection>

      {error && (
        <div className="banner banner--danger dashboardBanner" role="alert">
          <p>{error}</p>
          <button type="button" onClick={fetchOrders} className="btnSecondary">
            {t('common.retry')}
          </button>
        </div>
      )}

      {orderDialog.isPresent && (
        <Suspense fallback={<SkeletonCard />}>
          <CustomArticleOrderModal
            order={orderDialog.value}
            profiles={profiles}
            onClose={orderDialog.close}
            closing={orderDialog.isClosing}
            addOrder={addOrder}
            updateOrder={updateOrder}
            deleteOrder={deleteOrder}
            paymentsByTrack={paymentsByTrack}
            fetchPaymentsForTrack={fetchPaymentsForTrack}
            addPayment={addPayment}
            deletePayment={deletePayment}
            extraFeesByTrack={extraFeesByTrack}
            fetchExtraFeesForTrack={fetchExtraFeesForTrack}
            addExtraFee={addExtraFee}
            deleteExtraFee={deleteExtraFee}
          />
        </Suspense>
      )}
    </>
  );
}
