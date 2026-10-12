import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './modal';
import Button from './button';
import type { Product } from '../hooks/useProducts';
import type {
  ClientPurchase,
  CreateClientPurchaseInput,
  UpdateClientPurchaseInput,
} from '../hooks/useClientPurchases';

interface AddPurchaseModalProps {
  /** The product the purchase belongs to. */
  product: Product;
  /** When set, the modal edits this purchase instead of registering a new one. */
  purchase?: ClientPurchase | null;
  onClose: () => void;
  /** True while the dialog plays its exit animation (see `usePresent`). */
  closing?: boolean;
  /** From `useClientPurchases` — the modal stays a thin shell over the hook. */
  addPurchase: (
    input: CreateClientPurchaseInput
  ) => Promise<{ data: ClientPurchase | null; error: string | null }>;
  /** From `useClientPurchases` — only used when `purchase` is set. */
  updatePurchase: (
    purchase: ClientPurchase,
    updates: UpdateClientPurchaseInput
  ) => Promise<{ data: ClientPurchase | null; error: string | null }>;
}

interface PurchaseFormState {
  client_name: string;
  client_phone_number: string;
  agreed_fees: number;
}

/**
 * The one way to add (or edit) a client purchase. It owns only the form state;
 * every write goes through the `useClientPurchases` functions passed in, so the
 * caller's list stays in sync without this component knowing about it.
 */
export default function AddPurchaseModal({
  product,
  purchase = null,
  onClose,
  closing = false,
  addPurchase,
  updatePurchase,
}: AddPurchaseModalProps) {
  const { t } = useTranslation();
  const isEditing = purchase != null;
  const titleId = useId();

  const [form, setForm] = useState<PurchaseFormState>(() => ({
    client_name: purchase?.client_name ?? '',
    client_phone_number: purchase?.client_phone_number ?? '',
    agreed_fees: purchase?.agreed_fees ?? 0,
  }));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === 'agreed_fees' ? (value ? parseInt(value, 10) : 0) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const result =
      isEditing && purchase
        ? await updatePurchase(purchase, form)
        : await addPurchase({ ...form, product_id: product.id });

    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onClose();
  };

  return (
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

      <p className="textMuted">{t('purchases.productLabel', { name: product.name })}</p>

      {error && (
        <div className="banner banner--danger" role="alert">
          <p>{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="form">
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
          <label className="label" htmlFor={`${titleId}-fees`}>
            {t('purchases.agreedFees')}
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
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" type="submit" loading={saving}>
            {isEditing ? t('common.saveChanges') : t('purchases.register')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
