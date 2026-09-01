import { useState } from 'react';
import { useProducts } from '../hooks/useProducts';
import { useAuth } from '../context/authContext';

import type { Product, CreateProductInput } from "../hooks/useProducts"

export default function Dashboard() {
  const { products, loading, error, addProduct, updateProduct, deleteProduct, fetchProducts } = useProducts();
  const { user, signOut } = useAuth();

  const [isEditing, setIsEditing] = useState<Product | null>(null);
  const [formData, setFormData] = useState<CreateProductInput>({
    name: '',
    description: '',
    value: 0,
    release_date: '',
  });

  console.log("user", { user });

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
      await updateProduct(isEditing.id, formData);
      setIsEditing(null);
    } else {
      await addProduct(formData);
    }
    setFormData({ name: '', description: '', value: 0, release_date: '' });
  };

  const handleEditClick = (product: Product) => {
    setIsEditing(product);
    setFormData({
      name: product.name || '',
      description: product.description || '',
      value: product.value || 0,
      release_date: product.release_date || '',
    });
  };

  const handleCancelEdit = () => {
    setIsEditing(null);
    setFormData({ name: '', description: '', value: 0, release_date: '' });
  };

  return (
    <div className="pageContainer">
      <div className="mainLayout">
        
        <div className="headerBar">
          <span>Usuario: {user?.email}</span>
          <button onClick={signOut} className="btnDelete">
            Cerrar sesión
          </button>
        </div>

        {/* Formulario */}
        <div className="formCard">
          <h2 className="formTitle">
            {isEditing ? 'Editar producto' : 'Agregar nuevo producto'}
          </h2>
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

            <div className="buttonGroup">
              <button type="submit" className="btnPrimary">
                {isEditing ? 'Actualizar' : 'Crear'}
              </button>
              {isEditing && (
                <button type="button" onClick={handleCancelEdit} className="btnSecondary">
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Lista de Productos */}
        <div>
          <div className="headerBar">
            <h1 className="title">Lista de productos</h1>
            <button onClick={fetchProducts} className="btnRefresh">
              Refrescar
            </button>
          </div>

          {error && <div className="errorAlert">{error}</div>}

          {loading ? (
            <div className="statusMessage">Cargando productos...</div>
          ) : products.length === 0 ? (
            <div className="statusMessage">No se encontraron productos.</div>
          ) : (
            <div className="productsGrid">
              {products.map((product) => (
                <div key={product.id} className="productCard">
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
                        Valor: {product.value ?? 0}
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
                        onClick={() => deleteProduct(product.id)}
                        className="btnDelete"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}