import { useState } from 'react';
import { usePurchasePayments } from '../hooks/usePurchasePayments';
import { usePresent } from '../hooks/usePresent';
import ConfirmModal from './confirmModal';
import Modal from './modal';
import EmptyState from './emptyState';
import Button from './button';
import CollapsibleCard from './collapsibleCard';
import AddPurchaseModal from './addPurchaseModal';
import { formatCurrency } from '../helpers/currency';

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
          <h2 id="purchasesTitle">Compras de {product.name}</h2>
          <Button variant="icon" className="btnClose" aria-label="Cerrar" onClick={onClose}>
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
            Agregar compra
          </Button>
        )}

        <div className="purchasesList">
          {purchases.length === 0 ? (
            <EmptyState
              art="sales"
              plain
              title="Todavía no hay compras"
              body="Registra la primera compra de este producto para poder seguir el avance de sus pagos."
              action={
                <Button variant="primary" icon="+" onClick={openAddModal} aria-haspopup="dialog">
                  Agregar compra
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
                        {purchase.client_name || 'Cliente sin nombre'}
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
                      {purchase.is_fully_paid ? 'Pagado' : 'Pendiente'}
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
                      Editar
                    </Button>
                    <Button
                      variant="ghost-danger"
                      onClick={() => deletePurchaseDialog.open(purchase)}
                      aria-haspopup="dialog"
                      aria-label={`Eliminar la compra de ${purchase.client_name}`}
                    >
                      Eliminar
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
                          Monto del pago
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
                        <p className="fieldHint">Se descuenta del saldo pendiente.</p>
                      </div>
                      <div className="paymentFormRow">
                        <label className="paymentExtraFeeLabel">
                          <input
                            type="checkbox"
                            checked={paymentIsExtraFee}
                            onChange={(e) => setPaymentIsExtraFee(e.target.checked)}
                          />
                          Cargo extra
                        </label>
                        <Button variant="primary" type="submit" className="paymentSubmitBtn">
                          Agregar pago
                        </Button>
                      </div>
                    </form>

                    {payments.length === 0 ? (
                      <p className="fieldHint">
                        Todavía no hay pagos. Registra el primer abono con el formulario de arriba.
                      </p>
                    ) : (
                      <ul className="paymentsList">
                        {payments.map((payment) => (
                          <li key={payment.id} className="paymentItem">
                            <span>
                              {formatCurrency(payment.amount)}
                              {payment.is_extra_fee ? ' (extra)' : ''}
                            </span>
                            <Button
                              variant="icon"
                              onClick={() => deletePaymentDialog.open(payment)}
                              className="rowRemoveBtn"
                              aria-label="Eliminar pago"
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
        <AddPurchaseModal
          product={product}
          purchase={addDialog.value}
          onClose={addDialog.close}
          closing={addDialog.isClosing}
          addPurchase={addPurchase}
          updatePurchase={updatePurchase}
        />
      )}

      {purchaseToDelete && (
        <ConfirmModal
          title="¿Eliminar esta compra?"
          message={`Se eliminará la compra de "${purchaseToDelete.client_name}" y sus pagos registrados. No se puede deshacer.`}
          confirmLabel="Eliminar compra"
          onConfirm={handleConfirmDeletePurchase}
          onCancel={deletePurchaseDialog.close}
          closing={deletePurchaseDialog.isClosing}
        />
      )}

      {paymentToDelete && (
        <ConfirmModal
          title="¿Eliminar este pago?"
          message={`Se eliminará el pago de ${formatCurrency(paymentToDelete.amount)} y se recalculará el saldo. No se puede deshacer.`}
          confirmLabel="Eliminar pago"
          onConfirm={handleConfirmDeletePayment}
          onCancel={deletePaymentDialog.close}
          closing={deletePaymentDialog.isClosing}
        />
      )}
    </>
  );
}

