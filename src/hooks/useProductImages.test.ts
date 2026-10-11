import { describe, expect, it, vi } from 'vitest';

vi.mock('../lib/supabase', () => ({ supabase: {} }));

import { getProductImagePath } from './useProductImages';

describe('getProductImagePath', () => {
  it('is the repository path builder, re-exported for callers', () => {
    expect(getProductImagePath({ id: 7, name: 'Cupo Ñoño' })).toBe('cupo-nono-7');
    expect(getProductImagePath({ id: 3, name: null })).toBe('producto-3');
  });
});
