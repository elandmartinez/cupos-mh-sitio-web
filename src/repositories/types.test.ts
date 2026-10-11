import { describe, expect, it } from 'vitest';
import { nowIso, repoFailure, repoSuccess, toErrorMessage } from './types';

describe('repoSuccess', () => {
  it('wraps data with a null error', () => {
    expect(repoSuccess(5)).toEqual({ ok: true, data: 5, error: null });
  });
});

describe('repoFailure', () => {
  it('wraps a readable error with null data', () => {
    expect(repoFailure(new Error('boom'), 'No se pudo guardar.')).toEqual({
      ok: false,
      data: null,
      error: 'No se pudo guardar. Vuelve a intentarlo.',
    });
  });
});

describe('toErrorMessage', () => {
  it('translates known Supabase failures into Spanish', () => {
    expect(toErrorMessage('Invalid login credentials', 'No se pudo iniciar sesión.')).toBe(
      'El correo o la contraseña no coinciden. Revísalos e inténtalo de nuevo.',
    );
    expect(toErrorMessage('Failed to fetch', 'No se pudo cargar.')).toBe(
      'No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.',
    );
  });

  it('appends a next step to an unrecognized fallback', () => {
    expect(toErrorMessage(new Error('weird'), 'No se pudo guardar.')).toBe(
      'No se pudo guardar. Vuelve a intentarlo.',
    );
  });

  it('leaves a fallback that already carries a next step untouched', () => {
    expect(toErrorMessage('weird', 'Revisa tu conexión.')).toBe('Revisa tu conexión.');
  });
});

describe('nowIso', () => {
  it('returns a parseable ISO timestamp', () => {
    expect(Number.isNaN(Date.parse(nowIso()))).toBe(false);
  });
});
