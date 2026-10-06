import Modal from './modal';
import Button from './button';
import ProductImage from './productImage';
import { formatCurrency } from '../helpers/currency';

import type { Product } from '../hooks/useProducts';

interface ProductDetailModalProps {
  /** The product being read. Its data, never a copy of it. */
  product: Product;
  /** How many purchases the product has — the count on the "Compras" action. */
  purchaseCount: number;
  /** Bumped by the parent after any upload/rename, so the image re-fetches. */
  imageVersion: number;
  getSignedUrl: (product: { id: number; name: string | null }) => Promise<string | null>;
  onClose: () => void;
  /** True while the dialog plays its exit animation (see `usePresent`). */
  closing?: boolean;
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onOpenPurchases: (product: Product) => void;
}

/**
 * The read view of a product: everything the card no longer has room for, plus
 * the three things you can do with it.
 *
 * The dashboard's cards are a single tap target with no controls of their own
 * (they have to stay small on a phone), so this dialog is where "Compras",
 * "Editar" and "Eliminar" live. Each action opens a *further* dialog on top of
 * this one instead of replacing it, so cancelling out of one lands you back on
 * the product you were looking at — the same nesting `PurchasesModal` uses for
 * its add/edit form.
 */
export default function ProductDetailModal({
  product,
  purchaseCount,
  imageVersion,
  getSignedUrl,
  onClose,
  closing = false,
  onEdit,
  onDelete,
  onOpenPurchases,
}: ProductDetailModalProps) {
  return (
    <Modal labelledBy="productDetailTitle" onClose={onClose} closing={closing}>
      <div className="formCardHeader">
        <h2 id="productDetailTitle">{product.name}</h2>
        <button type="button" onClick={onClose} className="btnIcon btnClose" aria-label="Cerrar">
          ×
        </button>
      </div>

      <div className="productDetail">
        <ProductImage
          product={product}
          imageVersion={imageVersion}
          getSignedUrl={getSignedUrl}
          alt={product.name || 'Producto'}
          className="productDetailImage"
        />

        {/* Label/value ledger: the same two columns for every entry, so the
            values line up without a table. */}
        <dl className="productDetailList">
          <div className="productDetailEntry">
            <dt className="productDetailLabel">ID</dt>
            <dd className="productDetailValue">
              <span className="badge badge--primary">ID: {product.id}</span>
            </dd>
          </div>

          {product.description && (
            <div className="productDetailEntry productDetailEntry--stacked">
              <dt className="productDetailLabel">Descripción</dt>
              <dd className="productDetailValue">{product.description}</dd>
            </div>
          )}

          <div className="productDetailEntry">
            <dt className="productDetailLabel">Lanzamiento</dt>
            <dd className="productDetailValue">{product.release_date || 'N/D'}</dd>
          </div>

          <div className="productDetailEntry">
            <dt className="productDetailLabel">Valor</dt>
            <dd className="productDetailValue tabular">{formatCurrency(product.value)}</dd>
          </div>

          <div className="productDetailEntry">
            <dt className="productDetailLabel">Compras</dt>
            <dd className="productDetailValue tabular">{purchaseCount}</dd>
          </div>
        </dl>
      </div>

      <div className="productDetailActions">
        <Button
          variant="secondary"
          className="productDetailPrimary"
          onClick={() => onOpenPurchases(product)}
          aria-haspopup="dialog"
        >
          <span aria-hidden="true">🛍️</span> Compras
          {purchaseCount > 0 ? ` (${purchaseCount})` : ''}
        </Button>

        <div className="buttonGroup productDetailButtonRow">
          <Button variant="secondary" onClick={() => onEdit(product)} aria-haspopup="dialog">
            Editar
          </Button>
          <Button variant="ghost-danger" onClick={() => onDelete(product)} aria-haspopup="dialog">
            Eliminar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
