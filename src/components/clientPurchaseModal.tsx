import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePurchasePayments } from '../hooks/usePurchasePayments';
import { useProfiles } from '../hooks/useProfiles';
import { usePresent } from '../hooks/usePresent';
import { useFormatters } from '../hooks/useFormatters';
import Modal from './modal';
import Button from './button';
import ConfirmModal from './confirmModal';
import PurchaseStatusProgress from './purchaseStatusProgress';
import { FieldError } from './ui';
import type { Product } from '../hooks/useProducts';
import { PURCHASE_STATUSES } from '../repositories/clientsPurchasesRepository';
import type { PurchaseStatus } from '../repositories/clientsPurchasesRepository';
import type {
  ClientPurchase,
  CreateClientPurchaseInput,
  UpdateClientPurchaseInput,
} from '../hooks/useClientPurchases';
import type {
  PurchasePayment,
  PurchaseExtraFee,
} from '../hooks/usePurchasePayments';

interface ClientPurchaseModalProps {
  /** The product the purchase belongs to. Optional when the product was deleted. */
  product?: Product | null;
  /** When set, the modal edits this purchase; when null, it registers a new one. */
  purchase?: ClientPurchase | null;
  onClose: () => void;
  /** True while the dialog plays its exit animation (see `usePresent`). */
  closing?: boolean;
  /** From `useClientPurchases` — used to register a new purchase. */
  addPurchase?: (
    input: CreateClientPurchaseInput
  ) => Promise<{ data: ClientPurchase | null; error: string | null }>;
  /** From `useClientPurchases` — used to edit an existing purchase. */
  updatePurchase: (
    purchase: ClientPurchase,
    updates: UpdateClientPurchaseInput
  ) => Promise<{ data: ClientPurchase | null; error: string | null }>;
  /** From `useClientPurchases` — removes the purchase (after a confirm). */
  deletePurchase: (purchase: ClientPurchase) => Promise<{ error: string | null }>;
  /** From `useClientPurchases` — pushes payment-refreshed totals back up. */
  applyPurchaseUpdate: (purchase: ClientPurchase) => void;
}

interface PurchaseFormState {
  client_name: string;
  client_first_name: string;
  client_phone_number: string;
  client_social_media: string;
  agreed_fees: number;
  profile_id: string;
  status: PurchaseStatus;
}

/**
 * The one modal for a client purchase: the edit form plus (when editing) the
 * money — a progress summary, then two titled sections, "Pagos" and "Cargos
 * extra" — and a delete action. Registering a new purchase reuses the same
 * modal without the money/delete sections.
 *
 * It holds the live purchase in `currentPurchase` so the progress bar and the
 * totals stay current after each save / payment / extra-fee mutation.
 */
export default function ClientPurchaseModal({
  product,
  purchase = null,
  onClose,
  closing = false,
  addPurchase,
  updatePurchase,
  deletePurchase,
  applyPurchaseUpdate,
}: ClientPurchaseModalProps) {
  const { t } = useTranslation();
  const { formatCurrency } = useFormatters();
  const {
    paymentsByPurchase,
    extraFeesByPurchase,
    fetchPaymentsForPurchase,
    fetchExtraFeesForPurchase,
    addPayment,
    deletePayment,
    addExtraFee,
    deleteExtraFee,
  } = usePurchasePayments();
  const { profiles, fetchProfiles } = useProfiles();

  const isEditing = purchase != null;
  const titleId = useId();

  // The live purchase: refreshed after every save / mutation so the totals on
  // screen never lag the database.
  const [currentPurchase, setCurrentPurchase] = useState<ClientPurchase | null>(purchase ?? null);
  const [form, setForm] = useState<PurchaseFormState>(() => ({
    client_name: purchase?.client_name ?? '',
    client_first_name: purchase?.client_first_name ?? '',
    client_phone_number: purchase?.client_phone_number ?? '',
    client_social_media: purchase?.client_social_media ?? '',
    agreed_fees: purchase?.agreed_fees ?? 0,
    profile_id: purchase?.profile_id ?? '',
    status: (PURCHASE_STATUSES as readonly string[]).includes(purchase?.status ?? '')
      ? (purchase!.status as PurchaseStatus)
      : 'shipping_to_locker_abroad',
  }));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // The two money forms are independent: each section toggles its own form.
  const [paymentFormOpen, setPaymentFormOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [extraFeeFormOpen, setExtraFeeFormOpen] = useState(false);
  const [extraFeeAmount, setExtraFeeAmount] = useState(0);

  const deletePurchaseDialog = usePresent<ClientPurchase>();
  const deletePaymentDialog = usePresent<PurchasePayment>();
  const deleteExtraFeeDialog = usePresent<PurchaseExtraFee>();
  const linkToProfileDialog = usePresent();

  // Lazily load the purchase's payments and extra fees on first open for edit.
  useEffect(() => {
    if (purchase) {
      fetchPaymentsForPurchase(purchase.id);
      fetchExtraFeesForPurchase(purchase.id);
    }
  }, [purchase, fetchPaymentsForPurchase, fetchExtraFeesForPurchase]);

  // The account-link selector is populated from the profile list (admin-only).
  useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === 'agreed_fees' ? (value ? parseInt(value, 10) : 0) : value,
    }));
  };

  // Fill the client-data fields from the linked profile. Only `client_name` is
  // autofilled — the profile carries just `name` and `email`, no phone, social
  // media, or first name.
  const autofillFromProfile = (profileId: string) => {
    const profile = profiles.find((p) => p.id === profileId);
    if (!profile) return;
    setForm((prev) => ({
      ...prev,
      profile_id: profileId,
      client_name: profile.name ?? prev.client_name,
    }));
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const profileId = e.target.value;
    autofillFromProfile(profileId);
  };

  const handleConfirmLinkToProfile = () => {
    linkToProfileDialog.close();
    if (form.profile_id) autofillFromProfile(form.profile_id);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    if (isEditing && currentPurchase) {
      const result = await updatePurchase(currentPurchase, {
        ...form,
        profile_id: form.profile_id || null,
      });
      setSaving(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.data) setCurrentPurchase(result.data);
      // Stay open so the operator can keep managing payments after editing.
      return;
    }

    if (!isEditing && addPurchase && product) {
      const result = await addPurchase({
        ...form,
        product_id: product.id,
        profile_id: form.profile_id || null,
      });
      setSaving(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      onClose();
      return;
    }

    setSaving(false);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPurchase) return;
    const remaining = totalOwed - (currentPurchase.amount_paid_so_far ?? 0);
    if (paymentAmount > remaining) {
      setPaymentError(t('payments.exceedsBalance'));
      return;
    }
    const { updatedPurchase } = await addPayment(
      { client_purchase_id: currentPurchase.id, amount: paymentAmount },
      currentPurchase.agreed_fees
    );
    if (updatedPurchase) {
      setCurrentPurchase(updatedPurchase);
      applyPurchaseUpdate(updatedPurchase);
    }
    setPaymentAmount(0);
    setPaymentFormOpen(false);
  };

  const handleExtraFeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPurchase) return;
    const { updatedPurchase } = await addExtraFee(
      { client_purchase_id: currentPurchase.id, amount: extraFeeAmount },
      currentPurchase.agreed_fees
    );
    if (updatedPurchase) {
      setCurrentPurchase(updatedPurchase);
      applyPurchaseUpdate(updatedPurchase);
    }
    setExtraFeeAmount(0);
    setExtraFeeFormOpen(false);
  };

  const handleDeletePayment = async (payment: PurchasePayment) => {
    if (!currentPurchase) return;
    const { updatedPurchase } = await deletePayment(payment, currentPurchase.agreed_fees);
    if (updatedPurchase) {
      setCurrentPurchase(updatedPurchase);
      applyPurchaseUpdate(updatedPurchase);
    }
  };

  const handleDeleteExtraFee = async (fee: PurchaseExtraFee) => {
    if (!currentPurchase) return;
    const { updatedPurchase } = await deleteExtraFee(fee, currentPurchase.agreed_fees);
    if (updatedPurchase) {
      setCurrentPurchase(updatedPurchase);
      applyPurchaseUpdate(updatedPurchase);
    }
  };

  const handleConfirmDeletePayment = async () => {
    const payment = deletePaymentDialog.value;
    if (!payment) return;
    deletePaymentDialog.close();
    await handleDeletePayment(payment);
  };

  const handleConfirmDeleteExtraFee = async () => {
    const fee = deleteExtraFeeDialog.value;
    if (!fee) return;
    deleteExtraFeeDialog.close();
    await handleDeleteExtraFee(fee);
  };

  const handleConfirmDeletePurchase = async () => {
    const purchaseToDelete = deletePurchaseDialog.value;
    if (!purchaseToDelete) return;
    deletePurchaseDialog.close();
    await deletePurchase(purchaseToDelete);
    onClose();
  };

  const payments = currentPurchase ? (paymentsByPurchase[currentPurchase.id] || []) : [];
  const extraFees = currentPurchase ? (extraFeesByPurchase[currentPurchase.id] || []) : [];
  const totalOwed = currentPurchase
    ? (currentPurchase.agreed_fees ?? 0) + (currentPurchase.extra_charges_total ?? 0)
    : 0;
  const progressPct = totalOwed
    ? Math.min(100, Math.round(((currentPurchase?.amount_paid_so_far || 0) / totalOwed) * 100))
    : 0;

  const purchaseToDelete = deletePurchaseDialog.value;
  const paymentToDelete = deletePaymentDialog.value;
  const extraFeeToDelete = deleteExtraFeeDialog.value;

  const selectedProfile = profiles.find((p) => p.id === form.profile_id);
  const selectedProfileDisplayName = selectedProfile
    ? selectedProfile.name || selectedProfile.email || selectedProfile.id.slice(0, 8)
    : t('common.unnamedClient');

  return (
    <>
      <Modal labelledBy={titleId} onClose={onClose} cardClassName="purchasesCard" closing={closing}>
        <div className="formCardHeader">
          <h2 id={titleId}>{isEditing ? t('purchases.editTitle') : t('purchases.addTitle')}</h2>
          <Button
            variant="icon"
            className="btnClose"
            aria-label={t('common.close')}
            onClick={onClose}
          >
            ×
          </Button>
        </div>

        {product?.name ? (
          <p className="textMuted">{t('purchases.productLabel', { name: product.name })}</p>
        ) : null}

        {error && (
          <div className="banner banner--danger" role="alert">
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSave} className="form">
          <div className="fieldGroup">
            <label className="label" htmlFor={`${titleId}-name`}>
              {t('purchases.clientName')}
            </label>
            <input
              id={`${titleId}-name`}
              type="text"
              name="client_name"
              value={form.client_name}
              onChange={handleChange}
              autoComplete="off"
              required
              className="input"
            />
          </div>

          <div className="fieldGroup">
            <label className="label" htmlFor={`${titleId}-firstName`}>
              {t('purchases.firstName')}
            </label>
            <input
              id={`${titleId}-firstName`}
              type="text"
              name="client_first_name"
              value={form.client_first_name}
              onChange={handleChange}
              autoComplete="off"
              className="input"
            />
          </div>

          <div className="fieldGroup">
            <label className="label" htmlFor={`${titleId}-phone`}>
              {t('purchases.phone')}
            </label>
            <input
              id={`${titleId}-phone`}
              type="tel"
              name="client_phone_number"
              value={form.client_phone_number}
              onChange={handleChange}
              autoComplete="off"
              className="input"
            />
          </div>

          <div className="fieldGroup">
            <label className="label" htmlFor={`${titleId}-social`}>
              {t('purchases.socialMedia')}
            </label>
            <select
              id={`${titleId}-social`}
              name="client_social_media"
              value={form.client_social_media}
              onChange={handleChange}
              className="input"
            >
              <option value="">{t('purchases.socialMediaEmpty')}</option>
              <option value="messenger">{t('purchases.socialMessenger')}</option>
              <option value="whatsapp">{t('purchases.socialWhatsapp')}</option>
              <option value="facebook">{t('purchases.socialFacebook')}</option>
              <option value="instagram">{t('purchases.socialInstagram')}</option>
              <option value="tiktok">{t('purchases.socialTiktok')}</option>
            </select>
          </div>

          <div className="fieldGroup">
            <label className="label" htmlFor={`${titleId}-status`}>
              {t('purchases.status')}
            </label>
            <select
              id={`${titleId}-status`}
              name="status"
              value={form.status}
              onChange={handleChange}
              className="input"
            >
              <option value="shipping_to_locker_abroad">
                {t('purchases.statusShippingToLockerAbroad')}
              </option>
              <option value="at_locker_abroad">{t('purchases.statusAtLockerAbroad')}</option>
              <option value="shipping_to_colombia">{t('purchases.statusShippingToColombia')}</option>
              <option value="at_colombia">{t('purchases.statusAtColombia')}</option>
              <option value="shipping_to_client">{t('purchases.statusShippingToClient')}</option>
              <option value="product_delivered_to_customer">
                {t('purchases.statusProductDelivered')}
              </option>
            </select>
          </div>

          <PurchaseStatusProgress status={form.status} />

          <div className="fieldGroup">
            <label className="label" htmlFor={`${titleId}-profile`}>
              {t('purchases.owner')}
            </label>
            <select
              id={`${titleId}-profile`}
              name="profile_id"
              value={form.profile_id}
              onChange={handleProfileChange}
              className="input"
            >
              <option value="">{t('purchases.noOwner')}</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.role === 'ADMIN'
                    ? t('purchases.ownerAdmin')
                    : t('purchases.ownerCustomer')}
                  {' · '}
                  {profile.name || profile.email || profile.id.slice(0, 8)}
                </option>
              ))}
            </select>
          </div>

          {isEditing && (
            <div className="buttonGroup">
              <Button
                variant="secondary"
                type="button"
                disabled={!form.profile_id}
                onClick={() => linkToProfileDialog.open()}
                aria-haspopup="dialog"
              >
                {t('purchases.linkToProfile')}
              </Button>
            </div>
          )}

          <div className="fieldGroup">
            <label className="label" htmlFor={`${titleId}-fees`}>
              {t('purchases.agreedPrice')}
            </label>
            <input
              id={`${titleId}-fees`}
              type="number"
              name="agreed_fees"
              inputMode="numeric"
              min="0"
              value={form.agreed_fees}
              onChange={handleChange}
              className="input"
            />
          </div>

          <div className="buttonGroup">
            <Button variant="primary" type="submit" loading={saving}>
              {isEditing ? t('common.saveChanges') : t('purchases.register')}
            </Button>
          </div>
        </form>

        {isEditing && currentPurchase && (
          <>
            <div className="paymentsSection">
              <div className="purchaseProgress">
                <div className="purchaseProgressBar">
                  <div className="purchaseProgressFill" style={{ width: `${progressPct}%` }} />
                </div>
                <div className="purchaseProgressLabel">
                  {formatCurrency(currentPurchase.amount_paid_so_far)} / {formatCurrency(totalOwed)}
                </div>
              </div>

              <section className="financeSubSection">
                <h3 className="financeSectionTitle">{t('payments.sectionTitle')}</h3>

                {paymentFormOpen ? (
                  <form onSubmit={handlePaymentSubmit} className="paymentForm">
                    <div className="fieldGroup">
                      <label className="label" htmlFor={`${titleId}-paymentAmount`}>
                        {t('payments.amountLabel')}
                      </label>
                      <input
                        id={`${titleId}-paymentAmount`}
                        type="number"
                        name="amount"
                        inputMode="numeric"
                        min="1"
                        value={paymentAmount || ''}
                        onChange={(e) => {
                          setPaymentAmount(e.target.value ? parseInt(e.target.value, 10) : 0);
                          setPaymentError(null);
                        }}
                        className="input"
                        required
                        aria-invalid={paymentError ? true : undefined}
                        aria-describedby={paymentError ? `${titleId}-paymentAmount-error` : undefined}
                      />
                      <p className="fieldHint">{t('payments.amountHint')}</p>
                      {paymentError && (
                        <FieldError id={`${titleId}-paymentAmount-error`} message={paymentError} />
                      )}
                    </div>
                    <div className="buttonGroup">
                      <Button variant="secondary" onClick={() => setPaymentFormOpen(false)}>
                        {t('common.cancel')}
                      </Button>
                      <Button variant="primary" type="submit" style={{marginBottom: '15px'}}>
                        {t('payments.add')}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <Button
                    variant="secondary"
                    className="financeAddBtn"
                    onClick={() => setPaymentFormOpen(true)}
                    style={{marginBottom: '15px'}}
                  >
                    {t('payments.add')}
                  </Button>
                )}

                {payments.length === 0 ? (
                  <p className="fieldHint">{t('payments.empty')}</p>
                ) : (
                  <ul className="paymentsList">
                    {payments.map((payment) => (
                      <li key={payment.id} className="paymentItem">
                        <span>{formatCurrency(payment.amount)}</span>
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
              </section>

              <section className="financeSubSection">
                <h3 className="financeSectionTitle">{t('extraFees.sectionTitle')}</h3>

                {extraFeeFormOpen ? (
                  <form onSubmit={handleExtraFeeSubmit} className="paymentForm">
                    <div className="fieldGroup">
                      <label className="label" htmlFor={`${titleId}-extraFeeAmount`}>
                        {t('extraFees.amountLabel')}
                      </label>
                      <input
                        id={`${titleId}-extraFeeAmount`}
                        type="number"
                        name="amount"
                        inputMode="numeric"
                        min="1"
                        value={extraFeeAmount || ''}
                        onChange={(e) =>
                          setExtraFeeAmount(e.target.value ? parseInt(e.target.value, 10) : 0)
                        }
                        className="input"
                        required
                      />
                      <p className="fieldHint">{t('extraFees.amountHint')}</p>
                    </div>
                    <div className="buttonGroup">
                      <Button variant="secondary" onClick={() => setExtraFeeFormOpen(false)}>
                        {t('common.cancel')}
                      </Button>
                      <Button variant="primary" type="submit" style={{ marginBottom: '15px' }}>
                        {t('extraFees.add')}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <Button
                    variant="secondary"
                    className="financeAddBtn"
                    onClick={() => setExtraFeeFormOpen(true)}
                    style={{ marginBottom: '15px' }}
                  >
                    {t('extraFees.add')}
                  </Button>
                )}

                {extraFees.length === 0 ? (
                  <p className="fieldHint">{t('extraFees.empty')}</p>
                ) : (
                  <ul className="paymentsList">
                    {extraFees.map((fee) => (
                      <li key={fee.id} className="paymentItem">
                        <span>{formatCurrency(fee.amount)}</span>
                        <Button
                          variant="icon"
                          onClick={() => deleteExtraFeeDialog.open(fee)}
                          className="rowRemoveBtn"
                          aria-label={t('extraFees.removeAria')}
                        >
                          ×
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <div className="purchaseDeleteRow">
              <Button
                variant="ghost-danger"
                onClick={() => deletePurchaseDialog.open(currentPurchase)}
                aria-haspopup="dialog"
              >
                {t('purchases.deleteLabel')}
              </Button>
            </div>
          </>
        )}
      </Modal>

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
          message={t('payments.deleteMessage', { amount: formatCurrency(paymentToDelete.amount) })}
          confirmLabel={t('payments.deleteConfirm')}
          onConfirm={handleConfirmDeletePayment}
          onCancel={deletePaymentDialog.close}
          closing={deletePaymentDialog.isClosing}
        />
      )}

      {extraFeeToDelete && (
        <ConfirmModal
          title={t('extraFees.deleteTitle')}
          message={t('extraFees.deleteMessage', {
            amount: formatCurrency(extraFeeToDelete.amount),
          })}
          confirmLabel={t('extraFees.deleteConfirm')}
          onConfirm={handleConfirmDeleteExtraFee}
          onCancel={deleteExtraFeeDialog.close}
          closing={deleteExtraFeeDialog.isClosing}
        />
      )}

      {linkToProfileDialog.isPresent && (
        <ConfirmModal
          title={t('purchases.linkToProfileTitle')}
          message={t('purchases.linkToProfileMessage', { name: selectedProfileDisplayName })}
          confirmLabel={t('purchases.linkToProfileConfirm')}
          confirmVariant="primary"
          onConfirm={handleConfirmLinkToProfile}
          onCancel={linkToProfileDialog.close}
          closing={linkToProfileDialog.isClosing}
        />
      )}
    </>
  );
}
