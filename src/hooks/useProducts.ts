import { useState, useEffect, useCallback } from 'react';
import { productsRepository } from '../repositories/productsRepository';
import type {
  CreateProductInput,
  PatchProductInput,
  Product,
} from '../repositories/productsRepository';

// The row/input shapes are defined next to the table they belong to
// (repositories/productsRepository.ts) and re-exported here so components keep
// importing the types from the hook that owns the data.
export type { CreateProductInput, Product };

/** Only the editable columns are written, so a partial object is accepted. */
export type UpdateProductInput = PatchProductInput;

/**
 * The `products` table: the catalogue list plus create/update/delete.
 *
 * Every Supabase call lives in `productsRepository`; this hook only owns the
 * React state (local merges after a write) and the loading/error flags.
 */
export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // FETCH ALL PRODUCTS
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    const result = await productsRepository.findMany();

    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setProducts(result.data);
    setLoading(false);
  }, []);

  // CREATE PRODUCT
  const addProduct = async (newProduct: CreateProductInput) => {
    setError(null);
    const result = await productsRepository.create(newProduct);

    if (!result.ok) {
      setError(result.error);
      return { data: null, error: result.error };
    }

    setProducts((prev) => [result.data, ...prev]);
    return { data: result.data, error: null };
  };

  // UPDATE PRODUCT
  const updateProduct = async (id: number, updates: UpdateProductInput) => {
    setError(null);
    const result = await productsRepository.updatePartial(id, updates);

    if (!result.ok) {
      setError(result.error);
      return { data: null, error: result.error };
    }

    setProducts((prev) => prev.map((item) => (item.id === id ? result.data : item)));
    return { data: result.data, error: null };
  };

  // DELETE PRODUCT
  const deleteProduct = async (id: number) => {
    setError(null);
    const result = await productsRepository.delete(id);

    if (!result.ok) {
      setError(result.error);
      return { error: result.error };
    }

    setProducts((prev) => prev.filter((item) => item.id !== id));
    return { error: null };
  };

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return {
    products,
    loading,
    error,
    fetchProducts,
    addProduct,
    updateProduct,
    deleteProduct,
  };
}
