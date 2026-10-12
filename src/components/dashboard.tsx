import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useProducts } from '../hooks/useProducts';
import { useProductImages } from '../hooks/useProductImages';
import { useClientPurchases } from '../hooks/useClientPurchases';
import { usePresent } from '../hooks/usePresent';
import { useFormatters } from '../hooks/useFormatters';
import { useAuth } from '../context/authContext';
import ConfirmModal from './confirmModal';
import ProductImage from './productImage';
import Modal from './modal';
import CollapsibleSection from './collapsibleSection';
import SalesSection from './salesSection';
import EmptyState from './emptyState';
import { LanguageSwitch, SkeletonCard, SkeletonCardGrid } from './ui';
import monsterHighLogo from "../../public/monster-high-logo-color.png";

import type { Product, CreateProductInput } from "../hooks/useProducts"
import type { CreateClientPurchaseInput } from "../hooks/useClientPurchases"

// The two heaviest dialogs on this screen are only reachable after a tap, so
// their code is split out of the island's first-load chunk. Vite emits each as
// its own `_astro/*.js` file, fetched on first open — static hosting either way,
// just less JavaScript before the panel appears. `usePresent` already gates
// mounting, so the Suspense fallback is a shape that is effectively never
// painted; it exists because a boundary must have one.
const PurchasesModal = lazy(() => import('./purchasesModal'));
const ProductDetailModal = lazy(() => import('./productDetailModal'));

const emptyFormData: CreateProductInput = {
  name: '',
  description: '',
  value: 0,
  release_date: '',
};

export default function Dashboard() {
  const { t } = useTranslation();
  // Money in the panel follows the interface language (see helpers/currency).
  const { formatCurrency } = useFormatters();
  const { products, loading, error, addProduct, updateProduct, deleteProduct, fetchProducts } = useProducts();
  const { uploadProductImage, renameProductImage, deleteProductImage, getSignedUrl } = useProductImages();
  const {
    purchasesByProduct,
    allPurchases,
    loading: purchasesLoading,
    error: purchasesError,
    fetchPurchasesForProducts,
    fetchAllPurchases,
    addPurchase,
    updatePurchase,
    deletePurchase,
    applyPurchaseUpdate,
  } = useClientPurchases();
  const { user, signOut } = useAuth();

  const [isEditing, setIsEditing] = useState<Product | null>(null);
  // The three dialogs on this screen each own a presence window rather than a
  // boolean, so they stay mounted long enough to animate out (see usePresent).
  const formDialog = usePresent();
  const [formData, setFormData] = useState<CreateProductInput>(emptyFormData);
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null);
  const [currentImageVisible, setCurrentImageVisible] = useState(true);
  // Bumped after any upload/rename/delete so <img> tags re-fetch instead of
  // showing a browser-cached copy of a since-replaced/removed image.
  const [imageVersion, setImageVersion] = useState(0);
  const purchasesDialog = usePresent<Product>();
  const deleteProductDialog = usePresent<Product>();
  // Tapping a product card opens this. The cards carry no controls of their
  // own, so this dialog is also where "Compras", "Editar" and "Eliminar" live.
  const detailDialog = usePresent<Product>();

  // Keep purchase counts in sync with the product list
  useEffect(() => {
    if (products.length > 0) {
      fetchPurchasesForProducts(products.map((product) => product.id));
    }
  }, [products, fetchPurchasesForProducts]);

  // "Mis ventas" spans every product, so it is read once on mount — and again
  // from the refresh button, since a deleted product's purchases cascade away
  // in the database rather than through the hook.
  useEffect(() => {
    fetchAllPurchases();
  }, [fetchAllPurchases]);

  // Drop the product form's fields once its dialog has actually gone. Doing it
  // in `closeForm` instead would empty the form while it is still on screen,
  // halfway through animating out.
  useEffect(() => {
    if (formDialog.isPresent) return;
    setIsEditing(null);
    setFormData(emptyFormData);
    setPendingImagePreview((url) => {
      if (url) URL.revokeObjectURL(url);
      return null;
    });
    setPendingImage(null);
  }, [formDialog.isPresent]);

  const handleRefresh = () => {
    // Re-fetching the products re-runs the effect above, so the per-product
    // purchase counts come along for free.
    fetchProducts();
    fetchAllPurchases();
  };

  const handleAddPurchase = async (input: CreateClientPurchaseInput) => {
    const result = await addPurchase(input);
    // An insert carries no joined product, so re-read the list to show the
    // product the new sale belongs to.
    if (result.data) await fetchAllPurchases();
    return result;
  };

  // Section header summaries: what is still owed, and how big the catalogue is.
  const salesMeta = useMemo(() => {
    if (allPurchases.length === 0) return undefined;

    const pending = allPurchases.filter((purchase) => !purchase.is_fully_paid);
    if (pending.length === 0) return t('summary.allPaid');

    const owed = pending.reduce(
      (total, purchase) =>
        total + Math.max(0, (purchase.agreed_fees ?? 0) - (purchase.amount_paid_so_far ?? 0)),
      0
    );

    // One phrase, not a joined string: English and Spanish inflect differently,
    // so only i18next's plural rules can decide the wording here.
    return t('summary.owed', { count: pending.length, amount: formatCurrency(owed) });
  }, [allPurchases, t, formatCurrency]);

  const productsMeta = loading ? undefined : t('products.count', { count: products.length });

  // One primary action per screen: while the empty state owns the "Nuevo
  // producto" button, the page header must not render a second identical one.
  const showProductsEmptyState = !loading && products.length === 0;

  const bumpImageVersion = () => setImageVersion((v) => v + 1);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'value' ? (value ? parseInt(value, 10) : null) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isEditing) {
      const { data: updated } = await updateProduct(isEditing.id, formData);
      if (updated) {
        if (updated.name !== isEditing.name) {
          await renameProductImage(isEditing, updated);
        }
        if (pendingImage) {
          await uploadProductImage(updated, pendingImage);
        }
        if (updated.name !== isEditing.name || pendingImage) bumpImageVersion();
      }
    } else {
      const { data: created } = await addProduct(formData);
      if (created && pendingImage) {
        await uploadProductImage(created, pendingImage);
        bumpImageVersion();
      }
    }

    closeForm();
  };

  const handleOpenNewForm = () => {
    setIsEditing(null);
    setFormData(emptyFormData);
    clearPendingImage();
    formDialog.open();
  };

  const handleEditClick = (product: Product) => {
    setIsEditing(product);
    setFormData({
      name: product.name || '',
      description: product.description || '',
      value: product.value || 0,
      release_date: product.release_date || '',
    });
    clearPendingImage();
    setCurrentImageVisible(true);
    formDialog.open();
  };

  // Starting the exit is all this does now — the fields are cleared by the
  // effect above, once the dialog has gone.
  const closeForm = () => formDialog.close();

  const clearPendingImage = () => {
    setPendingImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setPendingImage(null);
  };

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
    if (!isEditing) return;
    await deleteProductImage(isEditing);
    setCurrentImageVisible(false);
    bumpImageVersion();
  };

  const handleDeleteProduct = async (product: Product) => {
    await deleteProductImage(product);
    await deleteProduct(product.id);
    // The product's purchases cascade away in the database, so the sales list
    // has to be re-read rather than patched locally.
    await fetchAllPurchases();
  };

  const handleRequestDeleteProduct = (product: Product) => deleteProductDialog.open(product);

  const handleCancelDeleteProduct = () => deleteProductDialog.close();

  const handleConfirmDeleteProduct = async () => {
    const product = deleteProductDialog.value;
    if (!product) return;
    deleteProductDialog.close();
    // The confirm is opened from the product's detail dialog, which is now
    // showing something that no longer exists.
    if (detailDialog.value?.id === product.id) detailDialog.close();
    await handleDeleteProduct(product);
  };

  const handleOpenPurchases = (product: Product) => purchasesDialog.open(product);

  const handleClosePurchases = () => purchasesDialog.close();

  const handleOpenDetails = (product: Product) => detailDialog.open(product);

  const handleCloseDetails = () => detailDialog.close();

  // Bound to consts so the narrowing survives into the JSX below.
  const productForPurchases = purchasesDialog.value;
  const productToDelete = deleteProductDialog.value;

  // The detail dialog reads the catalogue instead of its own snapshot, so an
  // edit saved from inside it is visible the moment the form closes. The
  // `usePresent` value is the fallback: it is what keeps the dialog on screen
  // through its exit even when the product it was showing has just been deleted.
  const detailProductId = detailDialog.value?.id ?? null;
  const detailProduct =
    detailProductId === null
      ? null
      : products.find((product) => product.id === detailProductId) ?? detailDialog.value;

  return (
    <div className="pageContainer">
      <header className="topBar">
        <img
          src={monsterHighLogo.src}
          alt="Monster High"
          className="topBarLogo"
          width="300"
          height="203"
        />
        <span className="userEmail" title={user?.email ?? undefined}>
          {user?.email}
        </span>
        <LanguageSwitch />
        <button type="button" onClick={signOut} className="btnGhost">
          {t('nav.signOut')}
        </button>
      </header>

      <main className="mainContent">
        <div className="pageHeader">
          <div className="pageHeaderText">
            <h1 className="title">{t('nav.dashboardTitle')}</h1>
            <p className="textMuted">{t('nav.dashboardSubtitle')}</p>
          </div>

          <div className="pageHeaderActions">
            <button
              type="button"
              onClick={handleRefresh}
              className="btnIcon btnRefresh"
              aria-label={t('nav.refreshAria')}
              title={t('nav.refresh')}
            >
              <span aria-hidden="true">⟳</span>
            </button>
            {!showProductsEmptyState && (
              <button
                type="button"
                onClick={handleOpenNewForm}
                className="btnPrimary"
                aria-haspopup="dialog"
              >
                <span aria-hidden="true">+</span> {t('products.new')}
              </button>
            )}
          </div>
        </div>

        {/* A failure that blocks the panel is a banner above it, never a toast:
            it stays on screen, names what failed and offers the retry. */}
        {error && (
          <div className="banner banner--danger dashboardBanner" role="alert">
            <p>{error}</p>
            <button type="button" onClick={handleRefresh} className="btnSecondary">
              {t('common.retry')}
            </button>
          </div>
        )}

        <div className="dashboardSections">
          <CollapsibleSection title={t('products.sectionTitle')} meta={productsMeta}>
            {loading && products.length === 0 ? (
              /* First load only: the grid keeps its shape so nothing jumps when
                 the real cards arrive. A refresh leaves the products on screen,
                 which is what tells them apart from a blank first paint. */
              <SkeletonCardGrid label={t('products.loading')} />
            ) : showProductsEmptyState ? (
              <EmptyState
                art="products"
                title={t('products.emptyTitle')}
                body={t('products.emptyBody')}
                action={
                  <button
                    type="button"
                    onClick={handleOpenNewForm}
                    className="btnPrimary"
                    aria-haspopup="dialog"
                  >
                    <span aria-hidden="true">+</span> {t('products.new')}
                  </button>
                }
              />
            ) : (
              <div className="productsGrid">
              {products.map((product) => {
                const productPurchases = purchasesByProduct[product.id] || [];
                // The card carries no controls: it is one tap target that opens
                // the product's dialog, which is where every action lives. It
                // is a real <button>, so everything inside it stays phrasing
                // content — hence spans, not an <h3>.
                return (
                  <button
                    type="button"
                    key={product.id}
                    className="card productCard"
                    onClick={() => handleOpenDetails(product)}
                    aria-haspopup="dialog"
                  >
                    <ProductImage
                      product={product}
                      imageVersion={imageVersion}
                      getSignedUrl={getSignedUrl}
                      className="productImage"
                    />

                    <span className="productHeader">
                      <span className="productName">{product.name}</span>
                      <span className="badge badge--primary">
                        {t('products.idBadge', { id: product.id })}
                      </span>
                    </span>

                    <span className="productCardMeta">
                      <span className="productValue">{formatCurrency(product.value)}</span>
                      <span className="productPurchases">
                        {t('products.purchasesCount', { count: productPurchases.length })}
                      </span>
                    </span>
                  </button>
                );
              })}
              </div>
            )}
          </CollapsibleSection>

          <CollapsibleSection title={t('sales.sectionTitle')} meta={salesMeta}>
            <SalesSection
              purchases={allPurchases}
              loading={purchasesLoading}
              error={purchasesError}
              onRetry={handleRefresh}
            />
          </CollapsibleSection>
        </div>
      </main>

      {/* The detail dialog is rendered first so the dialogs its own actions open
          (the form, the purchases list, the delete confirm) come later in the
          document and are therefore the ones answering Escape and Tab — the
          same nesting `PurchasesModal` uses for its add/edit form. */}
      {detailProduct && (
        <Suspense fallback={<SkeletonCard />}>
          <ProductDetailModal
            product={detailProduct}
            purchaseCount={(purchasesByProduct[detailProduct.id] || []).length}
            imageVersion={imageVersion}
            getSignedUrl={getSignedUrl}
            onClose={handleCloseDetails}
            closing={detailDialog.isClosing}
            onEdit={handleEditClick}
            onDelete={handleRequestDeleteProduct}
            onOpenPurchases={handleOpenPurchases}
          />
        </Suspense>
      )}

      {formDialog.isPresent && (
        <Modal
          labelledBy="productFormTitle"
          onClose={closeForm}
          closing={formDialog.isClosing}
        >
          <div className="formCardHeader">
            <h2 id="productFormTitle">
              {isEditing ? t('products.editTitle') : t('products.createTitle')}
            </h2>
              <button
                type="button"
                onClick={closeForm}
                className="btnIcon btnClose"
                aria-label={t('products.closeFormAria')}
              >
                ×
              </button>
            </div>

          <form onSubmit={handleSubmit} className="form">
            <div className="fieldGroup">
              <label className="label" htmlFor="productName">
                {t('products.name')}
              </label>
              <input
                id="productName"
                type="text"
                name="name"
                value={formData.name || ''}
                onChange={handleInputChange}
                autoComplete="off"
                required
                className="input"
              />
            </div>

            <div className="fieldGroup">
              <label className="label" htmlFor="productDescription">
                {t('products.description')}
              </label>
              <textarea
                id="productDescription"
                name="description"
                value={formData.description || ''}
                onChange={handleInputChange}
                className="textarea"
              />
            </div>

            <div className="fieldGroup">
              <label className="label" htmlFor="productValue">
                {t('products.value')}
              </label>
              <input
                id="productValue"
                type="number"
                name="value"
                inputMode="numeric"
                min="0"
                value={formData.value ?? ''}
                onChange={handleInputChange}
                className="input"
              />
            </div>

            <div className="fieldGroup">
              <label className="label" htmlFor="productReleaseDate">
                {t('products.releaseDate')}
              </label>
              <input
                id="productReleaseDate"
                type="date"
                name="release_date"
                value={formData.release_date || ''}
                onChange={handleInputChange}
                className="input"
              />
            </div>

            <div className="fieldGroup">
              <label className="label" htmlFor="productImage">
                {t('products.image')}
              </label>
              <input
                id="productImage"
                type="file"
                accept="image/*"
                onChange={handleFileSelected}
                className="fileInput"
              />
              <p className="fieldHint">{t('products.imageHint')}</p>

              {(pendingImage || (isEditing && currentImageVisible)) && (
                <div className="imagePreviewGrid">
                  {isEditing && currentImageVisible && !pendingImage && (
                    <div className="imagePreviewItem">
                      <ProductImage
                        product={isEditing}
                        imageVersion={imageVersion}
                        getSignedUrl={getSignedUrl}
                        onMissing={() => setCurrentImageVisible(false)}
                      />
                      <div className="imagePreviewActions">
                        <button
                          type="button"
                          onClick={handleDeleteCurrentImage}
                          className="imageRemoveBtn"
                          aria-label={t('products.removeCurrentImageAria')}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  )}

                  {pendingImage && pendingImagePreview && (
                    <div className="imagePreviewItem imagePreviewItemPending">
                      <img src={pendingImagePreview} alt="" width="200" height="200" />
                      <div className="imagePreviewActions">
                        <button
                          type="button"
                          onClick={clearPendingImage}
                          className="imageRemoveBtn"
                          aria-label={t('products.discardSelectedImageAria')}
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="buttonGroup">
              <button type="button" onClick={closeForm} className="btnSecondary">
                {t('common.cancel')}
              </button>
              <button type="submit" className="btnPrimary">
                {isEditing ? t('common.saveChanges') : t('products.create')}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {productForPurchases && (
        <Suspense fallback={<SkeletonCard />}>
          <PurchasesModal
            product={productForPurchases}
            purchases={purchasesByProduct[productForPurchases.id] || []}
            onClose={handleClosePurchases}
            closing={purchasesDialog.isClosing}
            addPurchase={handleAddPurchase}
            updatePurchase={updatePurchase}
            deletePurchase={deletePurchase}
            applyPurchaseUpdate={applyPurchaseUpdate}
          />
        </Suspense>
      )}

      {productToDelete && (
        <ConfirmModal
          title={t('products.deleteTitle')}
          message={t('products.deleteMessage', { name: productToDelete.name })}
          confirmLabel={t('products.deleteConfirm')}
          cancelLabel={t('common.cancel')}
          onConfirm={handleConfirmDeleteProduct}
          onCancel={handleCancelDeleteProduct}
          closing={deleteProductDialog.isClosing}
        />
      )}
    </div>
  );
}
