import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { PurchaseStatus } from '../repositories/clientsPurchasesRepository';

const STATUS_STEPS: { status: PurchaseStatus; icon: string }[] = [
  { status: 'shipping_to_locker_abroad', icon: '/purchase-status-icons/shipping-to-locker-icon.png' },
  { status: 'at_locker_abroad', icon: '/purchase-status-icons/locker-icon.png' },
  { status: 'shipping_to_colombia', icon: '/purchase-status-icons/shipping-plane.png' },
  { status: 'at_colombia', icon: '/purchase-status-icons/at-colombia-icon.png' },
  { status: 'shipping_to_client', icon: '/purchase-status-icons/shipping-to-client-icon.png' },
  { status: 'product_delivered_to_customer', icon: '/purchase-status-icons/package-delivered-to-client-icon.png' },
];

/** Translate one status to its label key result, handling the legacy rename. */
function statusText(status: string | null, t: TFunction): string | null {
  const s = status === 'shipping_to_you' ? 'shipping_to_client' : status; // legacy rename
  switch (s) {
    case 'shipping_to_locker_abroad': return t('purchases.statusShippingToLockerAbroad');
    case 'at_locker_abroad': return t('purchases.statusAtLockerAbroad');
    case 'shipping_to_colombia': return t('purchases.statusShippingToColombia');
    case 'at_colombia': return t('purchases.statusAtColombia');
    case 'shipping_to_client': return t('purchases.statusShippingToClient');
    case 'product_delivered_to_customer': return t('purchases.statusProductDelivered');
    default: return null;
  }
}

interface PurchaseStatusProgressProps {
  status: PurchaseStatus | null;
}

export default function PurchaseStatusProgress({ status }: PurchaseStatusProgressProps) {
  const { t } = useTranslation();
  // Legacy rows (pre-migration) may still carry `shipping_to_you`; normalise it.
  // The cast widens `PurchaseStatus | null` so the comparison can match that
  // pre-migration value, which is not part of the current enum.
  const normalized: string | null =
    (status as string | null) === 'shipping_to_you' ? 'shipping_to_client' : status;
  const currentIndex = STATUS_STEPS.findIndex((s) => s.status === normalized); // -1 when unknown/null/legacy `bought`
  const label = statusText(status, t);
  return (
    <div className="statusProgress">
      {label && (
        <p className="statusProgressLabel">
          {t('purchases.packageStatus', { status: label })}
        </p>
      )}
      <div className="statusSteps" aria-hidden="true">
        {STATUS_STEPS.map((step, i) => (
          <div
            key={step.status}
            className={`statusStep${i <= currentIndex ? ' is-active' : ''}${i === currentIndex ? ' is-current' : ''}`}
          >
            <img className="statusIcon" src={step.icon} alt="" draggable={false} />
          </div>
        ))}
      </div>
    </div>
  );
}
