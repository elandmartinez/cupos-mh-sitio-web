import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/authContext';
import { useClientPurchases } from '../hooks/useClientPurchases';
import { useCustomArticlesOrders } from '../hooks/useCustomArticlesOrders';
import { usePurchasePayments } from '../hooks/usePurchasePayments';
import { usePresent } from '../hooks/usePresent';
import { useFormatters } from '../hooks/useFormatters';
import CollapsibleSection from './collapsibleSection';
import EmptyState from './emptyState';
import Modal from './modal';
import Button from './button';
import { LanguageSwitch, SkeletonList } from './ui';
import monsterHighLogo from '../../public/monster-high-logo.png';
import type { ClientPurchaseWithProduct } from '../hooks/useClientPurchases';
import type { CustomArticleOrderWithTrack } from '../hooks/useCustomArticlesOrders';

/** A purchase's "of total" figure and progress %, shared by the list and the detail. */
function purchaseTotals(purchase: { agreed_fees: number | null; extra_charges_total: number | null; amount_paid_so_far: number | null }) {
  const totalOwed = (purchase.agreed_fees ?? 0) + (purchase.extra_charges_total ?? 0);
  const progressPct = totalOwed
    ? Math.min(100, Math.round(((purchase.amount_paid_so_far ?? 0) / totalOwed) * 100))
    : 0;
  return { totalOwed, progressPct };
}

/** A custom order's track is nullable, so its totals collapse to 0 when missing. */
function orderTrackTotals(track: CustomArticleOrderWithTrack['track']) {
  const totalOwed = (track?.agreed_fees ?? 0) + (track?.extra_charges_total ?? 0);
  const progressPct = totalOwed
    ? Math.min(100, Math.round(((track?.amount_paid_so_far ?? 0) / totalOwed) * 100))
    : 0;
  return { totalOwed, progressPct };
}

/**
 * The customer's read-only panel. RLS already scopes every query to the signed-in
 * user's own rows, so this screen only renders — there are no create/edit/delete
 * controls anywhere. It shows the two things a customer owns: their product
 * purchases and their custom article orders, each with payment progress, and a
 * read-only detail of the money.
 */
export default function CustomerDashboard() {
  const { t } = useTranslation();
  const { formatCurrency, formatDate } = useFormatters();
  const { user, signOut } = useAuth();

  const {
    allPurchases,
    loading: purchasesLoading,
    error: purchasesError,
    fetchAllPurchases,
  } = useClientPurchases();
  const {
    paymentsByPurchase,
    extraFeesByPurchase,
    fetchPaymentsForPurchase,
    fetchExtraFeesForPurchase,
  } = usePurchasePayments();
  const {
    orders,
    paymentsByTrack,
    extraFeesByTrack,
    loading: ordersLoading,
    error: ordersError,
    fetchOrders,
    fetchPaymentsForTrack,
    fetchExtraFeesForTrack,
  } = useCustomArticlesOrders();

  const purchaseDetailDialog = usePresent<ClientPurchaseWithProduct>();
  const orderDetailDialog = usePresent<CustomArticleOrderWithTrack>();

  useEffect(() => {
    fetchAllPurchases();
    fetchOrders();
  }, [fetchAllPurchases, fetchOrders]);

  const openPurchase = (purchase: ClientPurchaseWithProduct) => {
    fetchPaymentsForPurchase(purchase.id);
    fetchExtraFeesForPurchase(purchase.id);
    purchaseDetailDialog.open(purchase);
  };

  const openOrder = (order: CustomArticleOrderWithTrack) => {
    if (order.track) {
      fetchPaymentsForTrack(order.track.id);
      fetchExtraFeesForTrack(order.track.id);
    }
    orderDetailDialog.open(order);
  };

  const purchaseDetail = purchaseDetailDialog.value;
  const orderDetail = orderDetailDialog.value;

  const purchasePayments = purchaseDetail ? (paymentsByPurchase[purchaseDetail.id] || []) : [];
  const purchaseExtraFees = purchaseDetail ? (extraFeesByPurchase[purchaseDetail.id] || []) : [];
  const orderTrack = orderDetail?.track ?? null;
  const orderPayments = orderTrack ? (paymentsByTrack[orderTrack.id] || []) : [];
  const orderExtraFees = orderTrack ? (extraFeesByTrack[orderTrack.id] || []) : [];

  const purchasesMeta = purchasesLoading
    ? undefined
    : t('customer.purchasesCount', { count: allPurchases.length });
  const ordersMeta = ordersLoading ? undefined : t('customer.ordersCount', { count: orders.length });

  const handleRefresh = () => {
    fetchAllPurchases();
    fetchOrders();
  };

  return (
    <div className="pageContainer">
      <header className="topBar">
        <img
          src={monsterHighLogo.src}
          alt="Monster High"
          className="topBarLogo"
          width="300"
          height="203"
        />
        <span className="userEmail" title={user?.email ?? undefined}>
          {user?.email}
        </span>
        <LanguageSwitch />
        <button type="button" onClick={signOut} className="btnGhost">
          {t('nav.signOut')}
        </button>
      </header>

      <main className="mainContent">
        <div className="pageHeader">
          <div className="pageHeaderText">
            <h1 className="title">{t('customer.title')}</h1>
            <p className="textMuted">{t('customer.subtitle')}</p>
          </div>
          <div className="pageHeaderActions">
            <button
              type="button"
              onClick={handleRefresh}
              className="btnIcon btnRefresh"
              aria-label={t('nav.refreshAria')}
              title={t('nav.refresh')}
            >
              <span aria-hidden="true">⟳</span>
            </button>
          </div>
        </div>

        {(purchasesError || ordersError) && (
          <div className="banner banner--danger dashboardBanner" role="alert">
            <p>{purchasesError || ordersError}</p>
            <button type="button" onClick={handleRefresh} className="btnSecondary">
              {t('common.retry')}
            </button>
          </div>
        )}

        <div className="dashboardSections">
          <CollapsibleSection title={t('customer.purchasesSection')} meta={purchasesMeta}>
            {purchasesLoading && allPurchases.length === 0 ? (
              <SkeletonList label={t('sales.loading')} />
            ) : allPurchases.length === 0 ? (
              <EmptyState art="sales" title={t('customer.noPurchasesTitle')} body={t('customer.noPurchasesBody')} />
            ) : (
              <ul className="salesList">
                {allPurchases.map((purchase) => {
                  const isFullyPaid = Boolean(purchase.is_fully_paid);
                  const productName =
                    purchase.product?.name ||
                    (purchase.product_id != null
                      ? t('common.productNumber', { id: purchase.product_id })
                      : t('common.productFallback'));
                  const { totalOwed, progressPct } = purchaseTotals(purchase);
                  return (
                    <li key={purchase.id} className="salesListItem">
                      <button
                        type="button"
                        className="saleRow"
                        onClick={() => openPurchase(purchase)}
                        aria-haspopup="dialog"
                      >
                        <span className="saleMain">
                          <span className="saleClientName">{productName}</span>
                          <span className="saleMeta">
                            {formatDate(purchase.created_at)}
                          </span>
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
            )}
          </CollapsibleSection>

          <CollapsibleSection title={t('customer.ordersSection')} meta={ordersMeta}>
            {ordersLoading && orders.length === 0 ? (
              <SkeletonList label={t('customer.ordersLoading')} />
            ) : orders.length === 0 ? (
              <EmptyState art="sales" title={t('customer.noOrdersTitle')} body={t('customer.noOrdersBody')} />
            ) : (
              <ul className="salesList">
                {orders.map((order) => {
                  const track = order.track;
                  const isFullyPaid = Boolean(track?.is_fully_paid);
                  const totalOwed =
                    (track?.agreed_fees ?? 0) + (track?.extra_charges_total ?? 0);
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
                        onClick={() => openOrder(order)}
                        aria-haspopup="dialog"
                      >
                        <span className="saleMain">
                          <span className="saleClientName">
                            {order.name || t('common.notAvailable')}
                          </span>
                          <span className="saleMeta">{metaParts.join(' · ')}</span>
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
            )}
          </CollapsibleSection>
        </div>
      </main>

      {purchaseDetail && (
        <Modal
          labelledBy="customerPurchaseDetailTitle"
          onClose={purchaseDetailDialog.close}
          closing={purchaseDetailDialog.isClosing}
        >
          <div className="formCardHeader">
            <h2 id="customerPurchaseDetailTitle">{t('customer.purchaseDetailTitle')}</h2>
            <Button variant="icon" className="btnClose" aria-label={t('common.close')} onClick={purchaseDetailDialog.close}>
              ×
            </Button>
          </div>

          <div className="paymentsSection">
            <div className="purchaseProgress">
              <div className="purchaseProgressBar">
                <div className="purchaseProgressFill" style={{ width: `${purchaseTotals(purchaseDetail).progressPct}%` }} />
              </div>
              <div className="purchaseProgressLabel">
                {formatCurrency(purchaseDetail.amount_paid_so_far)} /{' '}
                {formatCurrency(purchaseTotals(purchaseDetail).totalOwed)}
              </div>
            </div>

            <section className="financeSubSection">
              <h3 className="financeSectionTitle">{t('payments.sectionTitle')}</h3>
              {purchasePayments.length === 0 ? (
                <p className="fieldHint">{t('payments.empty')}</p>
              ) : (
                <ul className="paymentsList">
                  {purchasePayments.map((payment) => (
                    <li key={payment.id} className="paymentItem">
                      <span>{formatCurrency(payment.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="financeSubSection">
              <h3 className="financeSectionTitle">{t('extraFees.sectionTitle')}</h3>
              {purchaseExtraFees.length === 0 ? (
                <p className="fieldHint">{t('extraFees.empty')}</p>
              ) : (
                <ul className="paymentsList">
                  {purchaseExtraFees.map((fee) => (
                    <li key={fee.id} className="paymentItem">
                      <span>{formatCurrency(fee.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </Modal>
      )}

      {orderDetail && (
        <Modal
          labelledBy="customerOrderDetailTitle"
          onClose={orderDetailDialog.close}
          closing={orderDetailDialog.isClosing}
        >
          <div className="formCardHeader">
            <h2 id="customerOrderDetailTitle">{t('customer.orderDetailTitle')}</h2>
            <Button variant="icon" className="btnClose" aria-label={t('common.close')} onClick={orderDetailDialog.close}>
              ×
            </Button>
          </div>

          <div className="paymentsSection">
            <div className="purchaseProgress">
              <div className="purchaseProgressBar">
                <div className="purchaseProgressFill" style={{ width: `${orderTrackTotals(orderTrack).progressPct}%` }} />
              </div>
              <div className="purchaseProgressLabel">
                {formatCurrency(orderTrack?.amount_paid_so_far)} /{' '}
                {formatCurrency(orderTrackTotals(orderTrack).totalOwed)}
              </div>
            </div>

            <section className="financeSubSection">
              <h3 className="financeSectionTitle">{t('payments.sectionTitle')}</h3>
              {orderPayments.length === 0 ? (
                <p className="fieldHint">{t('payments.empty')}</p>
              ) : (
                <ul className="paymentsList">
                  {orderPayments.map((payment) => (
                    <li key={payment.id} className="paymentItem">
                      <span>{formatCurrency(payment.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="financeSubSection">
              <h3 className="financeSectionTitle">{t('extraFees.sectionTitle')}</h3>
              {orderExtraFees.length === 0 ? (
                <p className="fieldHint">{t('extraFees.empty')}</p>
              ) : (
                <ul className="paymentsList">
                  {orderExtraFees.map((fee) => (
                    <li key={fee.id} className="paymentItem">
                      <span>
                        {fee.reason ? `${fee.reason} · ` : ''}
                        {formatCurrency(fee.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </Modal>
      )}
    </div>
  );
}
