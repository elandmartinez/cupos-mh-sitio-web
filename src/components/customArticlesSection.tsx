import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCustomArticlesOrders } from '../hooks/useCustomArticlesOrders';
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
    fetchOrdersPage,
    page,
    setPage,
    searchQuery,
    setSearchQuery,
    totalCount,
    pageSize,
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

  // The search box's local text. Committed to `searchQuery` on change, which
  // (like a page change) triggers a server-side refetch.
  const [searchInput, setSearchInput] = useState(searchQuery);

  useEffect(() => {
    fetchOrdersPage(page, searchQuery);
  }, [page, searchQuery, fetchOrdersPage]);

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
    if (clientFilter === 'all') return orders;
    return orders.filter((order) => order.profile_id === clientFilter);
  }, [orders, clientFilter]);

  const clientOptions = useMemo(
    () =>
      [...profiles].sort((a, b) =>
        (a.name || a.email || '').localeCompare(b.name || b.email || '')
      ),
    [profiles]
  );

  // Commit a search keystroke to the hook's query (and jump back to page 0).
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);
    setSearchQuery(value);
    setPage(0);
  };

  const meta = loading ? undefined : t('customOrders.count', { count: totalCount });

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
              <input
                className="input searchInput"
                type="search"
                aria-label={t('customOrders.searchPlaceholder')}
                placeholder={t('customOrders.searchPlaceholder')}
                value={searchInput}
                onChange={handleSearchChange}
              />
              <div className="fieldGroup filterSelectField">
                <label className="label" htmlFor="customOrderClientFilter">
                  {t('customOrders.filterClient')}
                </label>
                <select
                  id="customOrderClientFilter"
                  className="input customOrderFilterSelect"
                  value={clientFilter}
                  onChange={(e) => setClientFilter(e.target.value)}
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
              {clientFilter === 'all'
                ? t('customOrders.count', { count: totalCount })
                : t('customOrders.count', { count: filteredOrders.length })}
            </p>
            <div className="articlesGrid">
              {filteredOrders.map((order) => {
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
                    <span className="articleFooter">
                      <span className="purchaseProgressBar" aria-hidden="true">
                        <span className="purchaseProgressFill" style={{ width: `${progressPct}%` }} />
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
              page={page}
              totalPages={Math.ceil(totalCount / pageSize)}
              onPageChange={setPage}
            />
          </>
        )}
      </CollapsibleSection>

      {error && (
        <div className="banner banner--danger dashboardBanner" role="alert">
          <p>{error}</p>
          <button type="button" onClick={() => fetchOrdersPage(page, searchQuery)} className="btnSecondary">
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
