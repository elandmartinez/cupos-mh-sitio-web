import { useMemo } from 'react';
import { formatCurrency } from '../helpers/currency';
import { formatDate } from '../helpers/date';
import type { ClientPurchaseWithProduct } from '../hooks/useClientPurchases';

interface SalesSectionProps {
  purchases: ClientPurchaseWithProduct[];
  loading: boolean;
  error: string | null;
}

/**
 * "Mis ventas" — every client purchase across all products: the read-only
 * overview that answers "who still owes me?".
 *
 * Rows are hairline-separated, not cards, so the list sits on the page
 * background as a single surface. Editing a purchase still happens in the
 * Compras modal of its product, where its payments live.
 */
export default function SalesSection({ purchases, loading, error }: SalesSectionProps) {
  // Pending first — the reason to open this list — then the newest-first order
  // the query returned (Array#sort is stable, so equal keys keep it).
  const sortedPurchases = useMemo(
    () =>
      [...purchases].sort(
        (a, b) => Number(Boolean(a.is_fully_paid)) - Number(Boolean(b.is_fully_paid))
      ),
    [purchases]
  );

  if (error) {
    return (
      <div className="errorAlert" role="alert">
        {error}
      </div>
    );
  }

  // Only the first load shows a spinner: a refresh keeps the rows that are
  // already on screen (the flag is shared with the per-product purchase fetch).
  if (loading && purchases.length === 0) {
    return (
      <div className="statusMessage" role="status" aria-live="polite">
        <span className="spinner" aria-hidden="true" />
        <p>Cargando ventas…</p>
      </div>
    );
  }

  if (sortedPurchases.length === 0) {
    return (
      <div className="statusMessage">
        <h3 className="emptyStateTitle">Todavía no hay ventas</h3>
        <p className="emptyStateBody">
          Registra una compra en la sección Mis productos y aparecerá aquí, con lo pagado y lo
          pendiente de cada cliente.
        </p>
      </div>
    );
  }

  return (
    <ul className="salesList">
      {sortedPurchases.map((purchase) => {
        const isFullyPaid = Boolean(purchase.is_fully_paid);
        // A row inserted in this session has no joined product yet, so fall
        // back to its id rather than claiming the product was deleted.
        const productName =
          purchase.product?.name ||
          (purchase.product_id != null ? `Producto #${purchase.product_id}` : 'Sin producto');

        const metaParts: string[] = [productName];
        if (purchase.client_phone_number) metaParts.push(purchase.client_phone_number);
        const date = formatDate(purchase.created_at);
        if (date) metaParts.push(date);

        return (
          <li key={purchase.id} className="saleRow">
            <div className="saleMain">
              <div className="saleClientName">{purchase.client_name || 'Cliente sin nombre'}</div>
              <div className="saleMeta">{metaParts.join(' · ')}</div>
            </div>

            <div className="saleSide">
              <div className="saleMoney">
                {formatCurrency(purchase.amount_paid_so_far)}
                <span className="saleMoneyTotal">
                  {' de '}
                  {formatCurrency(purchase.agreed_fees)}
                </span>
              </div>
              <span
                className={`badgePaid ${isFullyPaid ? 'badgePaidDone' : 'badgePaidPending'}`}
              >
                {isFullyPaid ? 'Pagado' : 'Pendiente'}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
