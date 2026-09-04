import { useState } from 'react';
import { usePurchasePayments } from '../hooks/usePurchasePayments';
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

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="formCard purchasesCard" onClick={(e) => e.stopPropagation()}>
        <div className="formCardHeader">
          <h2 className="formTitle">Compras de {product.name}</h2>
          <button type="button" onClick={onClose} className="btnClose" aria-label="Cerrar">
            ×
          </button>
        </div>

        <button type="button" onClick={openNewPurchaseForm} className="btnNew purchasesNewBtn">
          <span className="btnNewIcon">+</span> Nueva compra
        </button>

        {showPurchaseForm && (
          <form onSubmit={handlePurchaseSubmit} className="form purchaseForm">
            <div className="fieldGroup">
              <label className="label">Nombre del cliente</label>
              <input
                type="text"
                name="client_name"
                value={purchaseForm.client_name}
                onChange={handlePurchaseInputChange}
                required
                className="input"
              />
            </div>

            <div className="fieldGroup">
              <label className="label">Teléfono</label>
              <input
                type="text"
                name="client_phone_number"
                value={purchaseForm.client_phone_number}
                onChange={handlePurchaseInputChange}
                className="input"
              />
            </div>

            <div className="fieldGroup">
              <label className="label">Tarifa acordada</label>
              <input
                type="number"
                name="agreed_fees"
                value={purchaseForm.agreed_fees}
                onChange={handlePurchaseInputChange}
                className="input"
              />
            </div>

            <div className="buttonGroup">
              <button type="submit" className="btnPrimary">
                {editingPurchase ? 'Actualizar' : 'Crear'}
              </button>
              <button type="button" onClick={closePurchaseForm} className="btnSecondary">
                Cancelar
              </button>
            </div>
          </form>
        )}

        <div className="purchasesList">
          {purchases.length === 0 ? (
            <div className="statusMessage">Sin compras registradas.</div>
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
                      className={`badgePaid ${
                        purchase.is_fully_paid ? 'badgePaidDone' : 'badgePaidPending'
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
                      className="btnEdit"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => deletePurchase(purchase)}
                      className="btnDelete"
                    >
                      Eliminar
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleExpandPurchase(purchase)}
                      className="btnRefresh purchaseExpandBtn"
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
                        <input
                          type="number"
                          placeholder="Monto"
                          value={paymentAmount || ''}
                          onChange={(e) =>
                            setPaymentAmount(e.target.value ? parseInt(e.target.value, 10) : 0)
                          }
                          className="input paymentAmountInput"
                          required
                        />
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
                      </form>

                      {payments.length === 0 ? (
                        <div className="statusMessage paymentsEmpty">Sin pagos registrados.</div>
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
                                onClick={() => handleDeletePayment(payment)}
                                className="imageRemoveBtn"
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
      </div>
    </div>
  );
}
