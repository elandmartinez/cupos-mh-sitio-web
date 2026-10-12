import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  normaliseLanguage,
  readStoredLanguage,
  resolveLanguage,
  writeStoredLanguage,
} from '../i18n/languages';

/**
 * The rules behind the language switch.
 *
 * `useLanguage` itself is not rendered here: the repo has no jsdom and no
 * component-testing library, and the hook is deliberately a thin React skin over
 * the pure rules below (storage in `languages.ts`) — which is exactly what makes
 * the resolution order testable in plain Node. `localStorage` is stubbed rather
 * than mocked module-wide, so `readStoredLanguage`'s own
 * `typeof localStorage === 'undefined'` guard is the code under test too.
 */

function stubStorage(initial: Record<string, string> = {}) {
  const store = new Map(Object.entries(initial));

  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    store,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('resolveLanguage', () => {
  it('lets a stored choice win over the browser hint', () => {
    expect(resolveLanguage('en', 'es-CO')).toBe('en');
    expect(resolveLanguage('es', 'en-US')).toBe('es');
  });

  it('falls back to the browser hint on a first visit', () => {
    expect(resolveLanguage(null, 'en-GB')).toBe('en');
    expect(resolveLanguage(null, 'EN')).toBe('en');
    expect(resolveLanguage(null, 'es-CO')).toBe('es');
  });

  it('ignores a stored value it does not ship and uses the browser hint', () => {
    expect(resolveLanguage('de', 'en')).toBe('en');
    expect(resolveLanguage('fr', 'es-CO')).toBe('es');
  });

  it('defaults to Spanish when nothing is known', () => {
    expect(resolveLanguage(null, null)).toBe(DEFAULT_LANGUAGE);
    expect(resolveLanguage(undefined, undefined)).toBe(DEFAULT_LANGUAGE);
  });
});

describe('normaliseLanguage', () => {
  it('treats any English tag as English and everything else as Spanish', () => {
    expect(normaliseLanguage('en-US')).toBe('en');
    expect(normaliseLanguage('es-CO')).toBe('es');
    expect(normaliseLanguage('pt-BR')).toBe('es');
    expect(normaliseLanguage(null)).toBe('es');
  });
});

describe('stored language', () => {
  it('round-trips through the namespaced storage key', () => {
    const storage = stubStorage();
    vi.stubGlobal('localStorage', storage);

    writeStoredLanguage('en');

    expect(storage.store.get(LANGUAGE_STORAGE_KEY)).toBe('en');
    expect(readStoredLanguage()).toBe('en');
  });

  it('ignores an unrecognised stored value', () => {
    vi.stubGlobal('localStorage', stubStorage({ [LANGUAGE_STORAGE_KEY]: 'klingon' }));

    expect(readStoredLanguage()).toBe(DEFAULT_LANGUAGE);
  });

  it('returns the default when there is no storage at all', () => {
    // Node: the same path the build and the tests take.
    expect(readStoredLanguage()).toBe(DEFAULT_LANGUAGE);
  });

  it('survives storage that throws (private mode) on both read and write', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    });

    expect(readStoredLanguage()).toBe(DEFAULT_LANGUAGE);
    // A failed write only costs the visitor their choice on the next visit — it
    // must never surface as an exception out of a click handler.
    expect(() => writeStoredLanguage('en')).not.toThrow();
  });
});
