import { describe, expect, it, vi } from 'vitest';

// The repository talks to Supabase through the single client; mocking it keeps
// these pure path tests hermetic (no env vars, no network, no side effects).
vi.mock('../lib/supabase', () => ({ supabase: {} }));

import { getPath, sanitizeSegment } from './productImagesRepository';

describe('sanitizeSegment', () => {
  it('strips accents, lowercases and joins words with a single hyphen', () => {
    expect(sanitizeSegment('Cupo Edición Ñoño')).toBe('cupo-edicion-nono');
  });

  it('collapses runs of non-alphanumerics and trims edge hyphens', () => {
    expect(sanitizeSegment('  Hola---Mundo!! ')).toBe('hola-mundo');
  });

  it('keeps digits', () => {
    expect(sanitizeSegment('Café 2024')).toBe('cafe-2024');
  });

  it('returns an empty string when nothing survives', () => {
    expect(sanitizeSegment('¿¡!!')).toBe('');
  });
});

describe('getPath', () => {
  it('derives "<sanitized-name>-<id>"', () => {
    expect(getPath({ id: 7, name: 'Cupo Ñoño' })).toBe('cupo-nono-7');
  });

  it('falls back to "producto" when the name is missing', () => {
    expect(getPath({ id: 3, name: null })).toBe('producto-3');
    expect(getPath({ id: 42, name: '' })).toBe('producto-42');
  });
});
