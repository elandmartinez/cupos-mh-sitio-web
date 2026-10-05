import { useState } from 'react';
import { usePurchasePayments } from '../hooks/usePurchasePayments';
import ConfirmModal from './confirmModal';
import Modal from './modal';
import EmptyState from './emptyState';
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

interface PurchaseFormState {
  client_name: string;
  client_phone_number: string;
  agreed_fees: number;
}

const emptyPurchaseForm: PurchaseFormState = {
  client_name: '',
  client_phone_number: '',
  agreed_fees: 0,
};

export default function PurchasesModal({
  product,
  purchases,
  onClose,
  addPurchase,
  updatePurchase,
  deletePurchase,
  applyPurchaseUpdate,
}: PurchasesModalProps) {
  const { paymentsByPurchase, fetchPaymentsForPurchase, addPayment, deletePayment } =
    usePurchasePayments();

  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<ClientPurchase | null>(null);
  const [purchaseForm, setPurchaseForm] = useState<PurchaseFormState>(emptyPurchaseForm);
  const [expandedPurchaseId, setExpandedPurchaseId] = useState<number | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentIsExtraFee, setPaymentIsExtraFee] = useState(false);
  // Deleting a purchase or a payment destroys records, so both are confirmed
  // first (never deleted immediately on click).
  const [purchasePendingDelete, setPurchasePendingDelete] = useState<ClientPurchase | null>(null);
  const [paymentPendingDelete, setPaymentPendingDelete] = useState<PurchasePayment | null>(null);

  // ONE primary per view: while the empty state, an open form or an expanded
  // row owns the call to action, the header must not render a second one.
  const showNewPurchaseCta =
    purchases.length > 0 && !showPurchaseForm && expandedPurchaseId === null;

  const handlePurchaseInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPurchaseForm((prev) => ({
      ...prev,
      [name]: name === 'agreed_fees' ? (value ? parseInt(value, 10) : 0) : value,
    }));
  };

  const openNewPurchaseForm = () => {
    setEditingPurchase(null);
    setPurchaseForm(emptyPurchaseForm);
    setShowPurchaseForm(true);
  };

  const openEditPurchaseForm = (purchase: ClientPurchase) => {
    setEditingPurchase(purchase);
    setPurchaseForm({
      client_name: purchase.client_name || '',
      client_phone_number: purchase.client_phone_number || '',
      agreed_fees: purchase.agreed_fees || 0,
    });
    setShowPurchaseForm(true);
  };

  const closePurchaseForm = () => {
    setShowPurchaseForm(false);
    setEditingPurchase(null);
    setPurchaseForm(emptyPurchaseForm);
  };

  const handlePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPurchase) {
      await updatePurchase(editingPurchase, purchaseForm);
    } else {
      await addPurchase({ ...purchaseForm, product_id: product.id });
    }
    closePurchaseForm();
  };

  const toggleExpandPurchase = (purchase: ClientPurchase) => {
    if (expandedPurchaseId === purchase.id) {
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
    if (!paymentPendingDelete) return;
    const payment = paymentPendingDelete;
    setPaymentPendingDelete(null);
    await handleDeletePayment(payment);
  };

  const handleConfirmDeletePurchase = async () => {
    if (!purchasePendingDelete) return;
    const purchase = purchasePendingDelete;
    setPurchasePendingDelete(null);
    await deletePurchase(purchase);
  };

  return (
    <>
      <Modal labelledBy="purchasesTitle" onClose={onClose} cardClassName="purchasesCard">
        <div className="formCardHeader">
          <h2 id="purchasesTitle">Compras de {product.name}</h2>
          <button type="button" onClick={onClose} className="btnIcon btnClose" aria-label="Cerrar">
            ×
          </button>
        </div>

        {showNewPurchaseCta && (
          <button
            type="button"
            onClick={openNewPurchaseForm}
            className="btnPrimary purchasesNewBtn"
          >
            <span aria-hidden="true">+</span> Nueva compra
          </button>
        )}

        {showPurchaseForm && (
          <form onSubmit={handlePurchaseSubmit} className="form purchaseForm">
            <div className="fieldGroup">
              <label className="label" htmlFor="purchaseClientName">
                Nombre del cliente
              </label>
              <input
                id="purchaseClientName"
                type="text"
                name="client_name"
                value={purchaseForm.client_name}
                onChange={handlePurchaseInputChange}
                autoComplete="off"
                required
                className="input"
              />
            </div>

            <div className="fieldGroup">
              <label className="label" htmlFor="purchaseClientPhone">
                Teléfono
              </label>
              <input
                id="purchaseClientPhone"
                type="tel"
                name="client_phone_number"
                inputMode="tel"
                value={purchaseForm.client_phone_number}
                onChange={handlePurchaseInputChange}
                autoComplete="off"
                className="input"
              />
            </div>

            <div className="fieldGroup">
              <label className="label" htmlFor="purchaseAgreedFees">
                Tarifa acordada
              </label>
              <input
                id="purchaseAgreedFees"
                type="number"
                name="agreed_fees"
                inputMode="numeric"
                min="0"
                value={purchaseForm.agreed_fees}
                onChange={handlePurchaseInputChange}
                className="input"
              />
            </div>

            <div className="buttonGroup">
              <button type="button" onClick={closePurchaseForm} className="btnSecondary">
                Cancelar
              </button>
              <button type="submit" className="btnPrimary">
                {editingPurchase ? 'Guardar cambios' : 'Registrar compra'}
              </button>
            </div>
          </form>
        )}

        <div className="purchasesList">
          {purchases.length === 0 ? (
            <EmptyState
              art="sales"
              plain
              title="Todavía no hay compras"
              body="Registra la primera compra de este producto para poder seguir el avance de sus pagos."
              action={
                <button type="button" onClick={openNewPurchaseForm} className="btnPrimary">
                  <span aria-hidden="true">+</span> Nueva compra
                </button>
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
                <div key={purchase.id} className="purchaseCard">
                  <div className="purchaseHeader">
                    <div>
                      <div className="purchaseClientName">{purchase.client_name}</div>
                      {purchase.client_phone_number && (
                        <div className="purchaseClientPhone">{purchase.client_phone_number}</div>
                      )}
                    </div>
                    <span
                      className={`badge ${
                        purchase.is_fully_paid ? 'badge--success' : 'badge--warning'
                      }`}
                    >
                      {purchase.is_fully_paid ? 'Pagado' : 'Pendiente'}
                    </span>
                  </div>

                  <div className="purchaseProgress">
                    <div className="purchaseProgressBar">
                      <div
                        className="purchaseProgressFill"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                    <div className="purchaseProgressLabel">
                      {formatCurrency(purchase.amount_paid_so_far)} / {formatCurrency(purchase.agreed_fees)}
                    </div>
                  </div>

                  <div className="purchaseActionRow">
                    <button
                      type="button"
                      onClick={() => openEditPurchaseForm(purchase)}
                      className="btnSecondary"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => setPurchasePendingDelete(purchase)}
                      className="btnGhost btnGhost--danger"
                      aria-haspopup="dialog"
                      aria-label={`Eliminar la compra de ${purchase.client_name}`}
                    >
                      Eliminar
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleExpandPurchase(purchase)}
                      className="btnIcon purchaseExpandBtn"
                      aria-label={isExpanded ? 'Ocultar pagos' : 'Ver pagos'}
                    >
                      {isExpanded ? '▲' : '▼'}
                    </button>
                  </div>

                  {isExpanded && (
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
                          <button type="submit" className="btnPrimary paymentSubmitBtn">
                            Agregar pago
                          </button>
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
                              <button
                                type="button"
                                onClick={() => setPaymentPendingDelete(payment)}
                                className="btnIcon rowRemoveBtn"
                                aria-label="Eliminar pago"
                              >
                                ×
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </Modal>

      {purchasePendingDelete && (
        <ConfirmModal
          title="¿Eliminar esta compra?"
          message={`Se eliminará la compra de "${purchasePendingDelete.client_name}" y sus pagos registrados. No se puede deshacer.`}
          confirmLabel="Eliminar compra"
          onConfirm={handleConfirmDeletePurchase}
          onCancel={() => setPurchasePendingDelete(null)}
        />
      )}

      {paymentPendingDelete && (
        <ConfirmModal
          title="¿Eliminar este pago?"
          message={`Se eliminará el pago de ${formatCurrency(paymentPendingDelete.amount)} y se recalculará el saldo. No se puede deshacer.`}
          confirmLabel="Eliminar pago"
          onConfirm={handleConfirmDeletePayment}
          onCancel={() => setPaymentPendingDelete(null)}
        />
      )}
    </>
  );
}
