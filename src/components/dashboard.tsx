import { useEffect, useState } from 'react';
import { useProducts } from '../hooks/useProducts';
import { useProductImages } from '../hooks/useProductImages';
import { useClientPurchases } from '../hooks/useClientPurchases';
import { useAuth } from '../context/authContext';
import PurchasesModal from './purchasesModal';
import ConfirmModal from './confirmModal';
import ProductImage from './productImage';
import { formatCurrency } from '../helpers/currency';
import monsterHighLogo from "../../public/monster-high-logo-color.png";

import type { Product, CreateProductInput } from "../hooks/useProducts"

const emptyFormData: CreateProductInput = {
  name: '',
  description: '',
  value: 0,
  release_date: '',
};

export default function Dashboard() {
  const { products, loading, error, addProduct, updateProduct, deleteProduct, fetchProducts } = useProducts();
  const { uploadProductImage, renameProductImage, deleteProductImage, getSignedUrl } = useProductImages();
  const {
    purchasesByProduct,
    fetchPurchasesForProducts,
    addPurchase,
    updatePurchase,
    deletePurchase,
    applyPurchaseUpdate,
  } = useClientPurchases();
  const { user, signOut } = useAuth();

  const [isEditing, setIsEditing] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<CreateProductInput>(emptyFormData);
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [pendingImagePreview, setPendingImagePreview] = useState<string | null>(null);
  const [currentImageVisible, setCurrentImageVisible] = useState(true);
  // Bumped after any upload/rename/delete so <img> tags re-fetch instead of
  // showing a browser-cached copy of a since-replaced/removed image.
  const [imageVersion, setImageVersion] = useState(0);
  const [purchasesProduct, setPurchasesProduct] = useState<Product | null>(null);
  const [productPendingDelete, setProductPendingDelete] = useState<Product | null>(null);

  // Keep purchase counts in sync with the product list
  useEffect(() => {
    if (products.length > 0) {
      fetchPurchasesForProducts(products.map((product) => product.id));
    }
  }, [products, fetchPurchasesForProducts]);

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
    setShowForm(true);
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
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setIsEditing(null);
    setFormData(emptyFormData);
    clearPendingImage();
  };

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
  };

  const handleRequestDeleteProduct = (product: Product) => {
    setProductPendingDelete(product);
  };

  const handleCancelDeleteProduct = () => {
    setProductPendingDelete(null);
  };

  const handleConfirmDeleteProduct = async () => {
    if (!productPendingDelete) return;
    await handleDeleteProduct(productPendingDelete);
    setProductPendingDelete(null);
  };

  const handleOpenPurchases = (product: Product) => {
    setPurchasesProduct(product);
  };

  const handleClosePurchases = () => {
    setPurchasesProduct(null);
  };

  return (
    <div className="pageContainer">
      <header className="topBar">
        <img src={monsterHighLogo.src} alt="Monster High" className="topBarLogo" />
        <span className="userEmail">{user?.email}</span>
        <button onClick={signOut} className="btnGhost">
          Cerrar sesión
        </button>
      </header>

      <main className="mainContent">
        <div className="pageHeader">
          <div className="pageHeaderText">
            <h1 className="title">Productos</h1>
            <p className="subtitle">Gestiona tu catálogo de cupos</p>
          </div>

          <div className="pageHeaderActions">
            <button
              onClick={fetchProducts}
              className="btnRefresh"
              aria-label="Refrescar productos"
              title="Refrescar"
            >
              ⟳
            </button>
            <button onClick={handleOpenNewForm} className="btnNew">
              <span className="btnNewIcon">+</span> Nuevo producto
            </button>
          </div>
        </div>

        {error && <div className="errorAlert">{error}</div>}

        {loading ? (
          <div className="statusMessage">Cargando productos...</div>
        ) : products.length === 0 ? (
          <div className="statusMessage">No se encontraron productos.</div>
        ) : (
          <div className="productsGrid">
            {products.map((product) => {
              const productPurchases = purchasesByProduct[product.id] || [];
              return (
              <div key={product.id} className="productCard">
                <ProductImage
                  product={product}
                  imageVersion={imageVersion}
                  getSignedUrl={getSignedUrl}
                  alt={product.name || 'Producto'}
                  className="productImage"
                />
                <div>
                  <div className="productHeader">
                    <h3 className="productName">{product.name}</h3>
                    <span className="badgeId">ID: {product.id}</span>
                  </div>
                  <p className="productDescription">{product.description}</p>
                </div>

                <div className="productFooter">
                  <div>
                    <div className="metaRelease">
                      Lanzamiento: {product.release_date || 'N/D'}
                    </div>
                    <div className="metaValue">
                      Valor: {formatCurrency(product.value)}
                    </div>
                  </div>

                  <div className="actionRow">
                    <button
                      onClick={() => handleEditClick(product)}
                      className="btnEdit"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleRequestDeleteProduct(product)}
                      className="btnDelete"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenPurchases(product)}
                  className="btnPurchases"
                >
                  🛍️ Compras{productPurchases.length > 0 ? ` (${productPurchases.length})` : ''}
                </button>
              </div>
              );
            })}
          </div>
        )}
      </main>

      {showForm && (
        <div className="modalOverlay" onClick={closeForm}>
          <div className="formCard" onClick={(e) => e.stopPropagation()}>
            <div className="formCardHeader">
              <h2 className="formTitle">
                {isEditing ? 'Editar producto' : 'Agregar nuevo producto'}
              </h2>
              <button
                type="button"
                onClick={closeForm}
                className="btnClose"
                aria-label="Cerrar formulario"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="form">
              <div className="fieldGroup">
                <label className="label">Nombre</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name || ''}
                  onChange={handleInputChange}
                  required
                  className="input"
                />
              </div>

              <div className="fieldGroup">
                <label className="label">Descripción</label>
                <textarea
                  name="description"
                  value={formData.description || ''}
                  onChange={handleInputChange}
                  className="textarea"
                />
              </div>

              <div className="fieldGroup">
                <label className="label">Valor</label>
                <input
                  type="number"
                  name="value"
                  value={formData.value ?? ''}
                  onChange={handleInputChange}
                  className="input"
                />
              </div>

              <div className="fieldGroup">
                <label className="label">Fecha de lanzamiento</label>
                <input
                  type="date"
                  name="release_date"
                  value={formData.release_date || ''}
                  onChange={handleInputChange}
                  className="input"
                />
              </div>

              <div className="fieldGroup">
                <label className="label">Imagen</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelected}
                  className="fileInput"
                />

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
                            aria-label="Eliminar imagen"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    )}

                    {pendingImage && pendingImagePreview && (
                      <div className="imagePreviewItem imagePreviewItemPending">
                        <img src={pendingImagePreview} alt="" />
                        <div className="imagePreviewActions">
                          <button
                            type="button"
                            onClick={clearPendingImage}
                            className="imageRemoveBtn"
                            aria-label="Quitar imagen"
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
                <button type="submit" className="btnPrimary">
                  {isEditing ? 'Actualizar' : 'Crear'}
                </button>
                <button type="button" onClick={closeForm} className="btnSecondary">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {purchasesProduct && (
        <PurchasesModal
          product={purchasesProduct}
          purchases={purchasesByProduct[purchasesProduct.id] || []}
          onClose={handleClosePurchases}
          addPurchase={addPurchase}
          updatePurchase={updatePurchase}
          deletePurchase={deletePurchase}
          applyPurchaseUpdate={applyPurchaseUpdate}
        />
      )}

      {productPendingDelete && (
        <ConfirmModal
          title="Eliminar producto"
          message={`¿Estás seguro de que quieres eliminar "${productPendingDelete.name}"? Esta acción no se puede deshacer.`}
          confirmLabel="Eliminar"
          cancelLabel="Cancelar"
          onConfirm={handleConfirmDeleteProduct}
          onCancel={handleCancelDeleteProduct}
        />
      )}
    </div>
  );
}
