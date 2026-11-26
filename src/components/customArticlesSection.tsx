import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCustomArticlesOrders, ORDERS_PAGE_SIZE } from '../hooks/useCustomArticlesOrders';
import { useProfiles, type Profile } from '../hooks/useProfiles';
import { usePresent } from '../hooks/usePresent';
import { useFormatters } from '../hooks/useFormatters';
import CollapsibleSection from './collapsibleSection';
import EmptyState from './emptyState';
import Button from './button';
import { SkeletonList, SkeletonCard, Pagination } from './ui';
import { useCustomArticleImages } from '../hooks/useCustomArticleImages';
import CustomArticleImage from './customArticleImage';
import type { CustomArticleOrderWithTrack } from '../hooks/useCustomArticlesOrders';

// The create/edit modal (order + payments) is only reachable after a tap, so it
// is split out of the section's first-load chunk.
const CustomArticleOrderModal = lazy(() => import('./customArticleOrderModal'));

/** A profile's human label for the filter and the card: name → email → id prefix. */
function profileLabel(profile: Profile | undefined): string {
  if (!profile) return '';
  return profile.name || profile.email || profile.id.slice(0, 8);
}

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
  const { getSignedUrl } = useCustomArticleImages();

  // Bumped after any image upload/delete (via the modal) so the cards re-fetch
  // their thumbnails.
  const [imageVersion, setImageVersion] = useState(0);

  // `null` means "create"; an order means "edit" (see `usePresent`).
  const orderDialog = usePresent<CustomArticleOrderWithTrack | null>();

  // Filter the list by client (`all` = every order).
  const [clientFilter, setClientFilter] = useState<string>('all');

  // Local pagination over the fully-filtered (client + search) array.
  const [page, setPage] = useState(0);
  const pageSize = ORDERS_PAGE_SIZE;

  // The search box's local text, applied client-side to the full order list.
  const [searchInput, setSearchInput] = useState('');

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  // profile_id -> Profile, for stamping each card with its owner.
  const profileById = useMemo(() => {
    const map = new Map<string, Profile>();
    for (const profile of profiles) map.set(profile.id, profile);
    return map;
  }, [profiles]);

  const filteredOrders = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    return orders.filter((order) => {
      if (clientFilter !== 'all' && order.profile_id !== clientFilter) return false;
      if (q && !(order.name || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [orders, clientFilter, searchInput]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const currentPage = Math.min(page, totalPages - 1);
  const pageOrders = filteredOrders.slice(currentPage * pageSize, currentPage * pageSize + pageSize);

  const clientOptions = useMemo(
    () =>
      [...profiles].sort((a, b) =>
        (a.name || a.email || '').localeCompare(b.name || b.email || '')
      ),
    [profiles]
  );

  // Commit a search keystroke to the local input (and jump back to page 0).
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    setPage(0);
  };

  const meta = loading ? undefined : t('customOrders.count', { count: filteredOrders.length });

  // Closing the modal is the signal that an image may have changed — re-fetch
  // the thumbnails.
  const handleCloseModal = () => {
    orderDialog.close();
    setImageVersion((v) => v + 1);
  };

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
            <div className="filterRow">
              <div className="fieldGroup searchField">
                <label className="label" htmlFor="customOrderSearch">
                  {t('customOrders.searchLabel')}
                </label>
                <input
                  id="customOrderSearch"
                  className="input"
                  type="search"
                  placeholder={t('customOrders.searchPlaceholder')}
                  value={searchInput}
                  onChange={handleSearchChange}
                />
              </div>
              <div className="fieldGroup filterSelectField">
                <label className="label" htmlFor="customOrderClientFilter">
                  {t('customOrders.filterClient')}
                </label>
                <select
                  id="customOrderClientFilter"
                  className="input"
                  value={clientFilter}
                  onChange={(e) => {
                    setClientFilter(e.target.value);
                    setPage(0);
                  }}
                >
                  <option value="all">{t('customOrders.filterAllClients')}</option>
                  {clientOptions.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profileLabel(profile)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className="customOrderCount">
              {t('customOrders.count', { count: filteredOrders.length })}
            </p>
            <div className="articlesGrid">
              {pageOrders.map((order) => {
                const track = order.track;
                const isFullyPaid = Boolean(track?.is_fully_paid);
                const totalOwed = (track?.agreed_fees ?? 0) + (track?.extra_charges_total ?? 0);
                const progressPct = totalOwed
                  ? Math.min(100, Math.round(((track?.amount_paid_so_far ?? 0) / totalOwed) * 100))
                  : 0;
                const creationPct = Math.max(0, Math.min(100, order.creation_progress ?? 0));
                const metaParts: string[] = [];
                if (order.date_to_deliver) {
                  const date = formatDate(order.date_to_deliver);
                  if (date) metaParts.push(date);
                }
                const owner = order.profile_id ? profileById.get(order.profile_id) : undefined;
                return (
                  <button
                    key={order.id}
                    type="button"
                    className="card articleCard"
                    onClick={() => orderDialog.open(order)}
                    aria-haspopup="dialog"
                  >
                    <CustomArticleImage
                      order={order}
                      imageVersion={imageVersion}
                      getSignedUrl={getSignedUrl}
                      className="articleCardImage"
                    />
                    <span className="articleHeader">
                      <span className="articleName">{order.name || t('common.notAvailable')}</span>
                      <span className={`badge ${isFullyPaid ? 'badge--success' : 'badge--warning'}`}>
                        {isFullyPaid ? t('purchases.paid') : t('purchases.pending')}
                      </span>
                    </span>
                    {owner && <span className="articleOwner">{profileLabel(owner)}</span>}
                    {metaParts.length > 0 && (
                      <span className="articleMeta">{metaParts.join(' · ')}</span>
                    )}
                    {order.description && (
                      <span className="articleDescription">{order.description}</span>
                    )}
                    <span className="articleProgress">
                      <span className="progressTitle">{t('customOrders.orderProgress')}</span>
                      <span className="purchaseProgressBar" aria-hidden="true">
                        <span
                          className="purchaseProgressFill"
                          style={{ width: `${creationPct}%` }}
                        />
                      </span>
                    </span>
                    <span className="articleFooter">
                      <span className="articleProgress">
                        <span className="progressTitle">{t('customOrders.paymentProgress')}</span>
                        <span className="purchaseProgressBar" aria-hidden="true">
                          <span
                            className="purchaseProgressFill"
                            style={{ width: `${progressPct}%` }}
                          />
                        </span>
                      </span>
                      <span className="saleMoney">
                        {formatCurrency(track?.amount_paid_so_far)}
                        <span className="saleMoneyTotal">
                          {t('sales.paidOfTotal', { total: formatCurrency(totalOwed) })}
                        </span>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            <Pagination
              page={currentPage}
              totalPages={totalPages}
              onPageChange={setPage}
            />
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
            onClose={handleCloseModal}
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
