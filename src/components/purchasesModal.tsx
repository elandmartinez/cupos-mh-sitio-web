import { Suspense, lazy, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePurchasePayments } from '../hooks/usePurchasePayments';
import { usePresent } from '../hooks/usePresent';
import { useFormatters } from '../hooks/useFormatters';
import ConfirmModal from './confirmModal';
import Modal from './modal';
import EmptyState from './emptyState';
import Button from './button';
import CollapsibleCard from './collapsibleCard';
import { SkeletonCard } from './ui';

// The add/edit purchase form is the largest thing in this dialog and the last
// thing anyone needs, so it loads with the dialog instead of before it. Same
// deal as the dashboard's own lazy dialogs: an extra static chunk, fetched on
// first open, and a Suspense shape that `usePresent` means is never painted.
const AddPurchaseModal = lazy(() => import('./addPurchaseModal'));

import type { Product } from '../hooks/useProducts';
import type {
  ClientPurchase,
  CreateClientPurchaseInput,
  UpdateClientPurchaseInput,
} from '../hooks/useClientPurchases';
import type { PurchasePayment } from '../hooks/usePurchasePayments';

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
 * A product's purchases, each folded into a `CollapsibleCard` that reveals its
 * payments. Adding or editing a purchase goes through `AddPurchaseModal` — the
 * only entry point — so there is no second, inline purchase form to maintain.
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
  // Money formatted per the active language, so an English reader sees en-US
  // grouping/decimals on Colombian amounts.
  const { formatCurrency } = useFormatters();
  const { paymentsByPurchase, fetchPaymentsForPurchase, addPayment, deletePayment } =
    usePurchasePayments();

  // The nested dialogs use `usePresent` rather than a plain boolean: it keeps
  // them mounted for one animation cycle after they close, and holds the record
  // they are acting on for the whole exit (no label flipping on the way out).
  // For `addDialog`, `null` is a real value — it means "create", not "closed".
  const addDialog = usePresent<ClientPurchase | null>();
  const [expandedPurchaseId, setExpandedPurchaseId] = useState<number | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentIsExtraFee, setPaymentIsExtraFee] = useState(false);
  // Deleting a purchase or a payment destroys records, so both are confirmed
  // first (never deleted immediately on click).
  const deletePurchaseDialog = usePresent<ClientPurchase>();
  const deletePaymentDialog = usePresent<PurchasePayment>();

  const openAddModal = () => addDialog.open(null);
  const openEditModal = (purchase: ClientPurchase) => addDialog.open(purchase);

  // Opening a row lazily fetches its payments; opening another folds the rest.
  const toggleExpandPurchase = (purchase: ClientPurchase, next: boolean) => {
    if (!next) {
      setExpandedPurchaseId(null);
      return;
    }
    setExpandedPurchaseId(purchase.id);
    setPaymentAmount(0);
    setPaymentIsExtraFee(false);
    fetchPaymentsForPurchase(purchase.id);
  };

  const handlePaymentSubmit = async (e: React.FormEvent, purchase: ClientPurchase) => {
    e.preventDefault();
    const { updatedPurchase } = await addPayment({
      client_purchase_id: purchase.id,
      amount: paymentAmount,
      is_extra_fee: paymentIsExtraFee,
    });
    if (updatedPurchase) applyPurchaseUpdate(updatedPurchase);
    setPaymentAmount(0);
    setPaymentIsExtraFee(false);
  };

  const handleDeletePayment = async (payment: PurchasePayment) => {
    const { updatedPurchase } = await deletePayment(payment);
    if (updatedPurchase) applyPurchaseUpdate(updatedPurchase);
  };

  const handleConfirmDeletePayment = async () => {
    const payment = deletePaymentDialog.value;
    if (!payment) return;
    deletePaymentDialog.close();
    await handleDeletePayment(payment);
  };

  const handleConfirmDeletePurchase = async () => {
    const purchase = deletePurchaseDialog.value;
    if (!purchase) return;
    deletePurchaseDialog.close();
    await deletePurchase(purchase);
  };

  // ONE primary per view: the empty state owns the only primary until there is
  // something to add a purchase alongside.
  const showAddButton = purchases.length > 0;

  // Bound to consts so the narrowing survives into the JSX below.
  const purchaseToDelete = deletePurchaseDialog.value;
  const paymentToDelete = deletePaymentDialog.value;

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
              const isExpanded = expandedPurchaseId === purchase.id;
              const payments = paymentsByPurchase[purchase.id] || [];
              const progressPct = purchase.agreed_fees
                ? Math.min(
                    100,
                    Math.round(((purchase.amount_paid_so_far || 0) / purchase.agreed_fees) * 100)
                  )
                : 0;

              return (
                <CollapsibleCard
                  key={purchase.id}
                  className="purchaseCard"
                  open={isExpanded}
                  onToggle={(next) => toggleExpandPurchase(purchase, next)}
                  title={
                    <span className="purchaseTitleBlock">
                      <span className="purchaseClientName">
                        {purchase.client_name || t('common.unnamedClient')}
                      </span>
                      {purchase.client_phone_number && (
                        <span className="purchaseClientPhone">
                          {purchase.client_phone_number}
                        </span>
                      )}
                    </span>
                  }
                  meta={
                    <span
                      className={`badge ${
                        purchase.is_fully_paid ? 'badge--success' : 'badge--warning'
                      }`}
                    >
                      {purchase.is_fully_paid ? t('purchases.paid') : t('purchases.pending')}
                    </span>
                  }
                >
                  <div className="purchaseProgress">
                    <div className="purchaseProgressBar">
                      <div className="purchaseProgressFill" style={{ width: `${progressPct}%` }} />
                    </div>
                    <div className="purchaseProgressLabel">
                      {formatCurrency(purchase.amount_paid_so_far)} /{' '}
                      {formatCurrency(purchase.agreed_fees)}
                    </div>
                  </div>

                  <div className="purchaseActionRow">
                    <Button variant="secondary" onClick={() => openEditModal(purchase)}>
                      {t('common.edit')}
                    </Button>
                    <Button
                      variant="ghost-danger"
                      onClick={() => deletePurchaseDialog.open(purchase)}
                      aria-haspopup="dialog"
                      aria-label={t('purchases.deleteAria', { name: purchase.client_name })}
                    >
                      {t('common.remove')}
                    </Button>
                  </div>

                  <div className="paymentsSection">
                    <form
                      onSubmit={(e) => handlePaymentSubmit(e, purchase)}
                      className="paymentForm"
                    >
                      {/* Label above the field, never a placeholder standing in
                          for one. The id is scoped per purchase so the ids stay
                          unique even if several rows are expanded. */}
                      <div className="fieldGroup">
                        <label className="label" htmlFor={`paymentAmount-${purchase.id}`}>
                          {t('payments.amountLabel')}
                        </label>
                        <input
                          id={`paymentAmount-${purchase.id}`}
                          type="number"
                          name="amount"
                          inputMode="numeric"
                          min="1"
                          value={paymentAmount || ''}
                          onChange={(e) =>
                            setPaymentAmount(e.target.value ? parseInt(e.target.value, 10) : 0)
                          }
                          className="input"
                          required
                        />
                        <p className="fieldHint">{t('payments.amountHint')}</p>
                      </div>
                      <div className="paymentFormRow">
                        <label className="paymentExtraFeeLabel">
                          <input
                            type="checkbox"
                            checked={paymentIsExtraFee}
                            onChange={(e) => setPaymentIsExtraFee(e.target.checked)}
                          />
                          {t('payments.extraFee')}
                        </label>
                        <Button variant="primary" type="submit" className="paymentSubmitBtn">
                          {t('payments.add')}
                        </Button>
                      </div>
                    </form>

                    {payments.length === 0 ? (
                      <p className="fieldHint">{t('payments.empty')}</p>
                    ) : (
                      <ul className="paymentsList">
                        {payments.map((payment) => (
                          <li key={payment.id} className="paymentItem">
                            <span>
                              {formatCurrency(payment.amount)}
                              {payment.is_extra_fee ? t('payments.extraSuffix') : ''}
                            </span>
                            <Button
                              variant="icon"
                              onClick={() => deletePaymentDialog.open(payment)}
                              className="rowRemoveBtn"
                              aria-label={t('payments.removeAria')}
                            >
                              ×
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </CollapsibleCard>
              );
            })
          )}
        </div>
      </Modal>

      {addDialog.isPresent && (
        <Suspense fallback={<SkeletonCard />}>
          <AddPurchaseModal
            product={product}
            purchase={addDialog.value}
            onClose={addDialog.close}
            closing={addDialog.isClosing}
            addPurchase={addPurchase}
            updatePurchase={updatePurchase}
          />
        </Suspense>
      )}

      {purchaseToDelete && (
        <ConfirmModal
          title={t('purchases.deleteTitle')}
          message={t('purchases.deleteMessage', { name: purchaseToDelete.client_name })}
          confirmLabel={t('purchases.deleteConfirm')}
          onConfirm={handleConfirmDeletePurchase}
          onCancel={deletePurchaseDialog.close}
          closing={deletePurchaseDialog.isClosing}
        />
      )}

      {paymentToDelete && (
        <ConfirmModal
          title={t('payments.deleteTitle')}
          message={t('payments.deleteMessage', {
            amount: formatCurrency(paymentToDelete.amount),
          })}
          confirmLabel={t('payments.deleteConfirm')}
          onConfirm={handleConfirmDeletePayment}
          onCancel={deletePaymentDialog.close}
          closing={deletePaymentDialog.isClosing}
        />
      )}
    </>
  );
}

