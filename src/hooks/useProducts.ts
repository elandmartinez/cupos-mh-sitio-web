import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_KEY;
export const supabase = createClient(supabaseUrl, supabaseKey);

export interface Product {
  id: number;
  created_at: string;
  updated_at: string | null;
  name: string | null;
  description: string | null;
  value: number | null; // smallint in Postgres
  release_date: string | null;
}

export type CreateProductInput = Omit<Product, 'id' | 'created_at' | 'updated_at'>;
export type UpdateProductInput = Partial<CreateProductInput>;

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // FETCH ALL PRODUCTS
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error: fetchError } = await supabase
        .from('products')
        .select('*')
        .order('id', { ascending: false });

      if (fetchError) throw fetchError;
      setProducts(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch products.');
    } finally {
      setLoading(false);
    }
  }, []);

  // CREATE PRODUCT
  const addProduct = async (newProduct: CreateProductInput) => {
    try {
      setError(null);
      const { data, error: insertError } = await supabase
        .from('products')
        .insert([newProduct])
        .select()
        .single();

      if (insertError) throw insertError;
      if (data) {
        setProducts((prev) => [data, ...prev]);
      }
      return { data, error: null };
    } catch (err: any) {
      setError(err.message || 'Failed to create product.');
      return { data: null, error: err.message };
    }
  };

  // UPDATE PRODUCT
  const updateProduct = async (id: number, updates: UpdateProductInput) => {
    try {
      setError(null);
      const { data, error: updateError } = await supabase
        .from('products')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (updateError) throw updateError;
      if (data) {
        setProducts((prev) => prev.map((item) => (item.id === id ? data : item)));
      }
      return { data, error: null };
    } catch (err: any) {
      setError(err.message || 'Failed to update product.');
      return { data: null, error: err.message };
    }
  };

  // DELETE PRODUCT
  const deleteProduct = async (id: number) => {
    try {
      setError(null);
      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      setProducts((prev) => prev.filter((item) => item.id !== id));
      return { error: null };
    } catch (err: any) {
      setError(err.message || 'Failed to delete product.');
      return { error: err.message };
    }
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