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

/** Number of products fetched per page. */
export const PRODUCTS_PAGE_SIZE = 10;

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
  const [page, setPage] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);

  // FETCH ONE PAGE OF PRODUCTS (0-based `page`; also sets the total count).
  const fetchProducts = useCallback(async (page: number = 0) => {
    setLoading(true);
    setError(null);

    const from = page * PRODUCTS_PAGE_SIZE;
    const to = from + PRODUCTS_PAGE_SIZE - 1;
    const result = await productsRepository.findMany({ range: [from, to] });
    const countResult = await productsRepository.count();

    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setProducts(result.data);
    if (countResult.ok) setTotalCount(countResult.data);
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
    page,
    setPage,
    totalCount,
    pageSize: PRODUCTS_PAGE_SIZE,
    fetchProducts,
    addProduct,
    updateProduct,
    deleteProduct,
  };
}
