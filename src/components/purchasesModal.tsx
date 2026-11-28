import { Suspense, lazy } from 'react';
import { activateOnEnterOrSpace } from '../helpers/keyboard';
import { useTranslation } from 'react-i18next';
import { usePresent } from '../hooks/usePresent';
import { useFormatters } from '../hooks/useFormatters';
import Modal from './modal';
import EmptyState from './emptyState';
import Button from './button';
import PurchaseStatusProgress from './purchaseStatusProgress';
import { SkeletonCard } from './ui';

// The client-purchase modal (edit form + payments) is the heaviest dialog here,
// so it loads with the dialog instead of before it.
const ClientPurchaseModal = lazy(() => import('./clientPurchaseModal'));

import type { Product } from '../hooks/useProducts';
import type {
  ClientPurchase,
  CreateClientPurchaseInput,
  UpdateClientPurchaseInput,
} from '../hooks/useClientPurchases';

interface PurchasesModalProps {
  product: Product;
  purchases: ClientPurchase[];
  onClose: () => void;
  /** True while the dialog plays its exit animation (see `usePresent`). */
  closing?: boolean;
  addPurchase: (
    input: CreateClientPurchaseInput
  ) => Promise<{ data: ClientPurchase | null; error: string | null }>;
  updatePurchase: (
    purchase: ClientPurchase,
    updates: UpdateClientPurchaseInput
  ) => Promise<{ data: ClientPurchase | null; error: string | null }>;
  deletePurchase: (purchase: ClientPurchase) => Promise<{ error: string | null }>;
  applyPurchaseUpdate: (purchase: ClientPurchase) => void;
}

/**
 * A product's purchases, each a clickable summary card that opens the
 * client-purchase modal (edit + payments). Registering a new purchase reuses
 * that same modal without the payments/delete sections.
 */
export default function PurchasesModal({
  product,
  purchases,
  onClose,
  closing = false,
  addPurchase,
  updatePurchase,
  deletePurchase,
  applyPurchaseUpdate,
}: PurchasesModalProps) {
  const { t } = useTranslation();
  // The progress bar on each card follows the language.
  const { formatCurrency } = useFormatters();

  // `null` is a real value here — it means "create", not "closed" (see `usePresent`).
  const purchaseDialog = usePresent<ClientPurchase | null>();

  const openAddModal = () => purchaseDialog.open(null);

  // ONE primary per view: the empty state owns the only primary until there is
  // something to add a purchase alongside.
  const showAddButton = purchases.length > 0;

  return (
    <>
      <Modal
        labelledBy="purchasesTitle"
        onClose={onClose}
        cardClassName="purchasesCard"
        closing={closing}
      >
        <div className="formCardHeader">
          <h2 id="purchasesTitle">{t('purchases.title', { product: product.name })}</h2>
          <Button
            variant="icon"
            className="btnClose"
            aria-label={t('common.close')}
            onClick={onClose}
          >
            ×
          </Button>
        </div>
        {showAddButton && (
          <Button
            variant="primary"
            className="purchasesNewBtn"
            icon="+"
            onClick={openAddModal}
            aria-haspopup="dialog"
          >
            {t('purchases.add')}
          </Button>
        )}

        <div className="purchasesList">
          {purchases.length === 0 ? (
            <EmptyState
              art="sales"
              plain
              title={t('purchases.emptyTitle')}
              body={t('purchases.emptyBody')}
              action={
                <Button variant="primary" icon="+" onClick={openAddModal} aria-haspopup="dialog">
                  {t('purchases.add')}
                </Button>
              }
            />
          ) : (
            purchases.map((purchase) => {
              const isFullyPaid = Boolean(purchase.is_fully_paid);
              const totalOwed = (purchase.agreed_fees ?? 0) + (purchase.extra_charges_total ?? 0);
              const progressPct = totalOwed
                ? Math.min(
                    100,
                    Math.round(((purchase.amount_paid_so_far || 0) / totalOwed) * 100)
                  )
                : 0;

              return (
                <article
                  key={purchase.id}
                  className="card purchaseCard"
                  role="button"
                  tabIndex={0}
                  onClick={() => purchaseDialog.open(purchase)}
                  onKeyDown={activateOnEnterOrSpace}
                  aria-haspopup="dialog"
                >
                  <div className="purchaseHeader">
                    <div className="purchaseTitleBlock">
                      <p className="purchaseClientName">
                        {purchase.client_name || t('common.unnamedClient')}
                      </p>
                      {purchase.client_phone_number && (
                        <p className="purchaseClientPhone">
                          {purchase.client_phone_number}
                        </p>
                      )}
                    </div>
                    <div className="purchaseBadges">
                      <span
                        className={`badge ${
                          isFullyPaid ? 'badge--success' : 'badge--warning'
                        }`}
                      >
                        {isFullyPaid ? t('purchases.paid') : t('purchases.pending')}
                      </span>
                    </div>
                  </div>

                  <div className="purchaseProgress">
                    <span className="purchaseProgressBar">
                      <span
                        className="purchaseProgressFill"
                        style={{ width: `${progressPct}%` }}
                      />
                    </span>
                    <span className="purchaseProgressLabel">
                      {formatCurrency(purchase.amount_paid_so_far)} /{' '}
                      {formatCurrency(totalOwed)}
                    </span>
                  </div>

                  <PurchaseStatusProgress status={purchase.status} />
                </article>
              );
            })
          )}
        </div>
      </Modal>

      {purchaseDialog.isPresent && (
        <Suspense fallback={<SkeletonCard />}>
          <ClientPurchaseModal
            product={product}
            purchase={purchaseDialog.value}
            onClose={purchaseDialog.close}
            closing={purchaseDialog.isClosing}
            addPurchase={addPurchase}
            updatePurchase={updatePurchase}
            deletePurchase={deletePurchase}
            applyPurchaseUpdate={applyPurchaseUpdate}
          />
        </Suspense>
      )}
    </>
  );
}
