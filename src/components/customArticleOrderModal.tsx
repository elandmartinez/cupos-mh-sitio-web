import { useEffect, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePresent } from '../hooks/usePresent';
import { useFormatters } from '../hooks/useFormatters';
import Modal from './modal';
import Button from './button';
import ConfirmModal from './confirmModal';
import { DateInput, FieldError } from './ui';
import type { Profile } from '../hooks/useProfiles';
import type {
  CustomArticleOrder,
  CustomArticleOrderWithTrack,
  CustomArticleOrderFormInput,
  ArticleOrderPaymentTrack,
  PurchaseExtraFee,
} from '../hooks/useCustomArticlesOrders';
import type { PurchasePayment } from '../hooks/usePurchasePayments';
import { useCustomArticleImages } from '../hooks/useCustomArticleImages';
import CustomArticleImage from './customArticleImage';

interface CustomArticleOrderModalProps {
  /** The order being edited; `null` means "create a new one". */
  order: CustomArticleOrderWithTrack | null;
  /** Admin-only profile list, for the "owner account" selector. */
  profiles: Profile[];
  onClose: () => void;
  closing?: boolean;
  addOrder: (
    input: CustomArticleOrderFormInput
  ) => Promise<{ data: CustomArticleOrder | null; error: string | null }>;
  updateOrder: (
    order: CustomArticleOrderWithTrack,
    input: CustomArticleOrderFormInput
  ) => Promise<{ data: CustomArticleOrderWithTrack | null; error: string | null }>;
  deleteOrder: (order: CustomArticleOrderWithTrack) => Promise<{ error: string | null }>;
  paymentsByTrack: Record<number, PurchasePayment[]>;
  fetchPaymentsForTrack: (trackId: number) => Promise<void>;
  addPayment: (
    track: ArticleOrderPaymentTrack,
    amount: number
  ) => Promise<{ updatedTrack: ArticleOrderPaymentTrack | null; error: string | null }>;
  deletePayment: (
    payment: PurchasePayment,
    track: ArticleOrderPaymentTrack
  ) => Promise<{ updatedTrack: ArticleOrderPaymentTrack | null; error: string | null }>;
  extraFeesByTrack: Record<number, PurchaseExtraFee[]>;
  fetchExtraFeesForTrack: (trackId: number) => Promise<void>;
  addExtraFee: (
    track: ArticleOrderPaymentTrack,
    reason: string,
    amount: number
  ) => Promise<{ updatedTrack: ArticleOrderPaymentTrack | null; error: string | null }>;
  deleteExtraFee: (
    fee: PurchaseExtraFee,
    track: ArticleOrderPaymentTrack
  ) => Promise<{ updatedTrack: ArticleOrderPaymentTrack | null; error: string | null }>;
}

interface OrderFormState {
  name: string;
  description: string;
  date_to_deliver: string;
  profile_id: string;
  agreed_fees: number;
  creation_progress: number;
  client_gave_starter_payment: boolean;
  starter_payment_amount: number;
}

/** Per-field validation messages, keyed by form field name. */
interface FormFieldErrors {
  date_to_deliver?: string;
  agreed_fees?: string;
  starter_payment_amount?: string;
  profile_id?: string;
}

/**
 * The one modal for a custom article order: the order + money form, and (when
 * editing) the payment and extra-charge management against its
 * `articles_orders_payment_track`. Extra charges are itemized (reason + amount)
 * and only apply once the order has started — so they live in the edit view, not
 * the create form.
 */
export default function CustomArticleOrderModal({
  order = null,
  profiles,
  onClose,
  closing = false,
  addOrder,
  updateOrder,
  deleteOrder,
  paymentsByTrack,
  fetchPaymentsForTrack,
  addPayment,
  deletePayment,
  extraFeesByTrack,
  fetchExtraFeesForTrack,
  addExtraFee,
  deleteExtraFee,
}: CustomArticleOrderModalProps) {
  const { t } = useTranslation();
  const { formatCurrency, formatDate } = useFormatters();
  const isEditing = order != null;
  const titleId = useId();

  const [currentTrack, setCurrentTrack] = useState<ArticleOrderPaymentTrack | null>(
    order?.track ?? null
  );
  // The live order, so a second save (without reopening) shifts the *latest*
  // delivery date — not the snapshot the modal opened with.
  const [currentOrder, setCurrentOrder] = useState<CustomArticleOrderWithTrack | null>(order);
  const [form, setForm] = useState<OrderFormState>(() => ({
    name: order?.name ?? '',
    description: order?.description ?? '',
    date_to_deliver: order?.date_to_deliver ?? '',
    profile_id: order?.profile_id ?? '',
    agreed_fees: order?.track?.agreed_fees ?? 0,
    creation_progress: order?.creation_progress ?? 0,
    client_gave_starter_payment: order?.track?.client_gave_starter_payment ?? false,
    starter_payment_amount: 0,
  }));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FormFieldErrors>({});

  const [paymentFormOpen, setPaymentFormOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const [extraFeeFormOpen, setExtraFeeFormOpen] = useState(false);
  const [extraFeeReason, setExtraFeeReason] = useState('');
  const [extraFeeAmount, setExtraFeeAmount] = useState(0);

  const deleteOrderDialog = usePresent<CustomArticleOrderWithTrack>();
  const deletePaymentDialog = usePresent<PurchasePayment>();
  const deleteExtraFeeDialog = usePresent<PurchaseExtraFee>();

  // Image handling (mirrors the product form): a pending selection for upload,
  // plus the current image shown in edit mode.
  const { uploadImage, removeImage, moveImage, getSignedUrl } = useCustomArticleImages();
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null);
  const [currentImageVisible, setCurrentImageVisible] = useState(true);
  const [imageVersion, setImageVersion] = useState(0);

  // Lazily load the order's payments and extra fees on first open for edit.
  useEffect(() => {
    if (order?.track) {
      fetchPaymentsForTrack(order.track.id);
      fetchExtraFeesForTrack(order.track.id);
    }
  }, [order, fetchPaymentsForTrack, fetchExtraFeesForTrack]);

  const toInput = (): CustomArticleOrderFormInput => ({
    name: form.name,
    description: form.description,
    date_to_deliver: form.date_to_deliver,
    profile_id: form.profile_id || null,
    agreed_fees: form.agreed_fees,
    creation_progress: form.creation_progress,
    client_gave_starter_payment: form.client_gave_starter_payment,
    starter_payment_amount: form.starter_payment_amount,
  });

  /** Drop a field's error once the user edits it, so the message clears as they fix it. */
  const clearFieldError = (name: keyof FormFieldErrors) => {
    setFieldErrors((prev) => {
      if (!(name in prev)) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const validateForm = (): FormFieldErrors => {
    const errors: FormFieldErrors = {};

    if (!form.profile_id) {
      errors.profile_id = t('customOrders.ownerRequired');
    }

    if (form.date_to_deliver) {
      const now = new Date();
      const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      if (form.date_to_deliver < todayIso) {
        errors.date_to_deliver = t('customOrders.datePast');
      }
    }

    if (Number.isNaN(form.agreed_fees) || form.agreed_fees < 0) {
      errors.agreed_fees = t('customOrders.priceMin');
    }

    if (form.client_gave_starter_payment && form.starter_payment_amount > form.agreed_fees) {
      errors.starter_payment_amount = t('customOrders.starterPaymentMax');
    }

    return errors;
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const numeric =
      name === 'agreed_fees' ||
      name === 'creation_progress' ||
      name === 'starter_payment_amount';
    setForm((prev) => ({ ...prev, [name]: numeric ? (value ? parseInt(value, 10) : 0) : value }));
    if (name === 'agreed_fees' || name === 'starter_payment_amount' || name === 'profile_id') {
      clearFieldError(name);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSaving(true);

    if (isEditing && currentOrder) {
      const result = await updateOrder(currentOrder, toInput());
      setSaving(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.data) {
        const ownerChanged = result.data.profile_id !== currentOrder.profile_id;

        if (pendingImage) {
          await uploadImage(result.data, pendingImage);
          // The file was keyed under the old owner's folder; the new upload lands
          // under the new owner, so the orphaned old file is removed.
          if (ownerChanged) {
            await removeImage(currentOrder);
          }
          clearPendingImage();
          setCurrentImageVisible(true);
          bumpImageVersion();
        } else if (ownerChanged) {
          await moveImage(currentOrder, result.data);
          bumpImageVersion();
        }

        setCurrentOrder(result.data);
        setCurrentTrack(result.data.track);
      }
      if (currentOrder.track) fetchPaymentsForTrack(currentOrder.track.id);
      // Stay open so the operator can keep managing payments after editing.
      return;
    }

    const result = await addOrder(toInput());
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.data && pendingImage) {
      await uploadImage(result.data, pendingImage);
    }
    onClose();
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTrack) return;
    const remaining = totalOwed - (currentTrack.amount_paid_so_far ?? 0);
    if (paymentAmount > remaining) {
      setPaymentError(t('payments.exceedsBalance'));
      return;
    }
    const { updatedTrack, error: paymentError } = await addPayment(currentTrack, paymentAmount);
    if (paymentError) {
      setError(paymentError);
      return;
    }
    if (updatedTrack) setCurrentTrack(updatedTrack);
    setPaymentAmount(0);
    setPaymentFormOpen(false);
  };

  const handleDeletePayment = async (payment: PurchasePayment) => {
    if (!currentTrack) return;
    const { updatedTrack, error: paymentError } = await deletePayment(payment, currentTrack);
    if (paymentError) {
      setError(paymentError);
      return;
    }
    if (updatedTrack) setCurrentTrack(updatedTrack);
  };

  const handleExtraFeeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTrack) return;
    const { updatedTrack, error: feeError } = await addExtraFee(
      currentTrack,
      extraFeeReason,
      extraFeeAmount
    );
    if (feeError) {
      setError(feeError);
      return;
    }
    if (updatedTrack) setCurrentTrack(updatedTrack);
    setExtraFeeReason('');
    setExtraFeeAmount(0);
    setExtraFeeFormOpen(false);
  };

  const handleDeleteExtraFee = async (fee: PurchaseExtraFee) => {
    if (!currentTrack) return;
    const { updatedTrack, error: feeError } = await deleteExtraFee(fee, currentTrack);
    if (feeError) {
      setError(feeError);
      return;
    }
    if (updatedTrack) setCurrentTrack(updatedTrack);
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

  const handleConfirmDeleteOrder = async () => {
    const orderToDelete = deleteOrderDialog.value;
    if (!orderToDelete) return;
    deleteOrderDialog.close();
    await deleteOrder(orderToDelete);
    onClose();
  };

  const clearPendingImage = () => {
    setPendingImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setPendingImage(null);
  };

  const bumpImageVersion = () => setImageVersion((v) => v + 1);

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow selecting the same file again later
    if (!file) return;
    setPendingImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setPendingImage(file);
  };

  const handleDeleteCurrentImage = async () => {
    if (!currentOrder) return;
    await removeImage(currentOrder);
    setCurrentImageVisible(false);
    bumpImageVersion();
  };

  const payments = currentTrack ? (paymentsByTrack[currentTrack.id] || []) : [];
  const extraFees = currentTrack ? (extraFeesByTrack[currentTrack.id] || []) : [];
  const totalOwed = (currentTrack?.agreed_fees ?? 0) + (currentTrack?.extra_charges_total ?? 0);
  const progressPct = totalOwed
    ? Math.min(100, Math.round(((currentTrack?.amount_paid_so_far ?? 0) / totalOwed) * 100))
    : 0;

  const orderToDelete = deleteOrderDialog.value;
  const paymentToDelete = deletePaymentDialog.value;
  const extraFeeToDelete = deleteExtraFeeDialog.value;

  return (
    <>
      <Modal labelledBy={titleId} onClose={onClose} cardClassName="purchasesCard" closing={closing}>
        <div className="formCardHeader">
          <h2 id={titleId}>
            {isEditing ? t('customOrders.editTitle') : t('customOrders.createTitle')}
          </h2>
          <Button variant="icon" className="btnClose" aria-label={t('common.close')} onClick={onClose}>
            ×
          </Button>
        </div>

        <div className="articleImageArea">
          {isEditing && currentImageVisible && !pendingImage && currentOrder && (
            <CustomArticleImage
              order={currentOrder}
              imageVersion={imageVersion}
              getSignedUrl={getSignedUrl}
              className="articleModalImage"
              onMissing={() => setCurrentImageVisible(false)}
            />
          )}
          {pendingImage && pendingImagePreview && (
            <img src={pendingImagePreview} alt="" className="articleModalImage" />
          )}
          <input
            id={`${titleId}-image`}
            type="file"
            accept="image/*"
            onChange={handleFileSelected}
            className="fileInput"
            aria-label={t('products.image')}
          />
          <p className="fieldHint">{t('products.imageHint')}</p>
          {isEditing && currentImageVisible && !pendingImage && (
            <button
              type="button"
              onClick={handleDeleteCurrentImage}
              className="btnGhost btnGhost--danger"
            >
              {t('products.removeCurrentImageAria')}
            </button>
          )}
          {pendingImage && (
            <button
              type="button"
              onClick={clearPendingImage}
              className="btnGhost btnGhost--danger"
            >
              {t('products.discardSelectedImageAria')}
            </button>
          )}
        </div>

        {error && (
          <div className="banner banner--danger" role="alert">
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSave} className="form">
          <div className="fieldGroup">
            <label className="label" htmlFor={`${titleId}-name`}>
              {t('customOrders.name')}
            </label>
            <input
              id={`${titleId}-name`}
              type="text"
              name="name"
              value={form.name}
              onChange={handleTextChange}
              autoComplete="off"
              required
              className="input"
            />
          </div>

          <div className="fieldGroup">
            <label className="label" htmlFor={`${titleId}-description`}>
              {t('customOrders.description')}
            </label>
            <textarea
              id={`${titleId}-description`}
              name="description"
              value={form.description}
              onChange={handleTextChange}
              className="textarea"
            />
          </div>

          <div className="fieldGroup">
            <label className="label" htmlFor={`${titleId}-date`}>
              {t('customOrders.dateToDeliver')}
            </label>
            <DateInput
              id={`${titleId}-date`}
              value={form.date_to_deliver}
              onChange={(iso) => {
                setForm((prev) => ({ ...prev, date_to_deliver: iso }));
                clearFieldError('date_to_deliver');
              }}
              className="input"
              invalid={Boolean(fieldErrors.date_to_deliver)}
              ariaDescribedBy={fieldErrors.date_to_deliver ? `${titleId}-date-error` : undefined}
            />
            {isEditing && currentOrder?.last_date_to_deliver && (
              <p className="fieldHint">
                {t('customOrders.lastDateToDeliver')}: {formatDate(currentOrder.last_date_to_deliver)}
              </p>
            )}
            {fieldErrors.date_to_deliver && (
              <FieldError id={`${titleId}-date-error`} message={fieldErrors.date_to_deliver} />
            )}
          </div>

          <div className="fieldGroup">
            <label className="label" htmlFor={`${titleId}-owner`}>
              {t('customOrders.owner')}
            </label>
            <select
              id={`${titleId}-owner`}
              name="profile_id"
              value={form.profile_id}
              onChange={handleTextChange}
              className="input"
              aria-invalid={fieldErrors.profile_id ? true : undefined}
              aria-describedby={fieldErrors.profile_id ? `${titleId}-owner-error` : undefined}
            >
              <option value="">{t('customOrders.ownerPlaceholder')}</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.role === 'ADMIN' ? t('customOrders.ownerAdmin') : t('customOrders.ownerCustomer')}
                  {' · '}
                  {profile.name || profile.email || profile.id.slice(0, 8)}
                </option>
              ))}
            </select>
            {fieldErrors.profile_id && (
              <FieldError id={`${titleId}-owner-error`} message={fieldErrors.profile_id} />
            )}
          </div>

          <div className="fieldGroup">
            <label className="label" htmlFor={`${titleId}-fees`}>
              {t('customOrders.agreedPrice')}
            </label>
            <input
              id={`${titleId}-fees`}
              type="number"
              name="agreed_fees"
              inputMode="numeric"
              step="1"
              value={form.agreed_fees || ''}
              onChange={handleTextChange}
              className="input"
              aria-invalid={fieldErrors.agreed_fees ? true : undefined}
              aria-describedby={fieldErrors.agreed_fees ? `${titleId}-fees-error` : undefined}
            />
            {fieldErrors.agreed_fees && (
              <FieldError id={`${titleId}-fees-error`} message={fieldErrors.agreed_fees} />
            )}
          </div>

          <div className="fieldGroup">
            <label className="label" htmlFor={`${titleId}-creationProgress`}>
              {t('customOrders.creationProgress')}
            </label>
            <input
              id={`${titleId}-creationProgress`}
              type="range"
              min={0}
              max={100}
              step={1}
              name="creation_progress"
              value={form.creation_progress}
              onChange={handleTextChange}
              className="rangeInput"
            />
            <span className="rangeReadout">{form.creation_progress}%</span>
          </div>

          <div className="fieldGroup">
            <label className="checkboxLabel">
              <input
                type="checkbox"
                name="client_gave_starter_payment"
                checked={form.client_gave_starter_payment}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, client_gave_starter_payment: e.target.checked }));
                  clearFieldError('starter_payment_amount');
                }}
              />
              {t('customOrders.starterPayment')}
            </label>
          </div>

          {!isEditing && form.client_gave_starter_payment && (
            <div className="fieldGroup">
              <label className="label" htmlFor={`${titleId}-starterAmount`}>
                {t('customOrders.starterPaymentAmount')}
              </label>
              <input
                id={`${titleId}-starterAmount`}
                type="number"
                name="starter_payment_amount"
                inputMode="numeric"
                step="1"
                value={form.starter_payment_amount || ''}
                onChange={handleTextChange}
                className="input"
                aria-invalid={fieldErrors.starter_payment_amount ? true : undefined}
                aria-describedby={
                  fieldErrors.starter_payment_amount ? `${titleId}-starterAmount-error` : undefined
                }
              />
              {fieldErrors.starter_payment_amount && (
                <FieldError
                  id={`${titleId}-starterAmount-error`}
                  message={fieldErrors.starter_payment_amount}
                />
              )}
            </div>
          )}

          <div className="buttonGroup">
            <Button variant="primary" type="submit" loading={saving}>
              {isEditing ? t('common.saveChanges') : t('customOrders.create')}
            </Button>
          </div>
        </form>

        {isEditing && currentTrack && (
          <>
            <div className="paymentsSection">
              <div className="purchaseProgress">
                <div className="purchaseProgressBar">
                  <div className="purchaseProgressFill" style={{ width: `${progressPct}%` }} />
                </div>
                <div className="purchaseProgressLabel">
                  {formatCurrency(currentTrack.amount_paid_so_far)} / {formatCurrency(totalOwed)}
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
                        <FieldError
                          id={`${titleId}-paymentAmount-error`}
                          message={paymentError}
                        />
                      )}
                    </div>
                    <div className="buttonGroup">
                      <Button variant="secondary" onClick={() => setPaymentFormOpen(false)}>
                        {t('common.cancel')}
                      </Button>
                      <Button variant="primary" type="submit" style={{ marginBottom: '15px' }}>
                        {t('payments.add')}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <Button
                    variant="secondary"
                    className="financeAddBtn"
                    onClick={() => setPaymentFormOpen(true)}
                    style={{ marginBottom: '15px' }}
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
                      <label className="label" htmlFor={`${titleId}-extraFeeReason`}>
                        {t('extraFees.reason')}
                      </label>
                      <input
                        id={`${titleId}-extraFeeReason`}
                        type="text"
                        name="reason"
                        value={extraFeeReason}
                        onChange={(e) => setExtraFeeReason(e.target.value)}
                        autoComplete="off"
                        className="input"
                      />
                    </div>
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
                        <span>
                          {fee.reason ? `${fee.reason} · ` : ''}
                          {formatCurrency(fee.amount)}
                        </span>
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
                onClick={() => deleteOrderDialog.open(order)}
                aria-haspopup="dialog"
              >
                {t('customOrders.deleteLabel')}
              </Button>
            </div>
          </>
        )}
      </Modal>

      {orderToDelete && (
        <ConfirmModal
          title={t('customOrders.deleteTitle')}
          message={t('customOrders.deleteMessage', { name: orderToDelete.name })}
          confirmLabel={t('customOrders.deleteConfirm')}
          onConfirm={handleConfirmDeleteOrder}
          onCancel={deleteOrderDialog.close}
          closing={deleteOrderDialog.isClosing}
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
    </>
  );
}
