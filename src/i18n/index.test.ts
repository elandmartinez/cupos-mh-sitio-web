import { afterEach, describe, expect, it, vi } from 'vitest';
import { LANGUAGE_STORAGE_KEY } from './languages';

/**
 * The singleton's *initialisation* is the code under test here, and it runs once
 * per module instance — so each case stubs the environment, resets the module
 * registry and re-imports. This is what proves the browser hint in
 * `resolveLanguage` is actually wired to `init({ lng })`: without it, the rule is
 * a tested helper that production never calls.
 *
 * `react-i18next` only needs a React context to exist at import time; no rendering
 * happens, so there is still no jsdom in the repo.
 */

async function initLanguage(options: { stored?: string | null; browser?: string }) {
  if (options.stored === undefined || options.stored === null) {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => {},
    });
  } else {
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => (key === LANGUAGE_STORAGE_KEY ? options.stored! : null),
      setItem: () => {},
    });
  }

  if (options.browser === undefined) {
    vi.stubGlobal('navigator', undefined);
  } else {
    vi.stubGlobal('navigator', { language: options.browser });
  }

  vi.resetModules();
  const { i18n } = await import('./index');
  return i18n.language;
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe('i18n singleton initialisation', () => {
  it('uses the browser hint on a first visit (nothing stored)', async () => {
    await expect(initLanguage({ browser: 'en-US' })).resolves.toBe('en');
  });

  it('stays Spanish for a Spanish or unknown browser', async () => {
    await expect(initLanguage({ browser: 'es-CO' })).resolves.toBe('es');
    // `pt-BR` is not a language we ship; only English tags become `en`.
    await expect(initLanguage({ browser: 'pt-BR' })).resolves.toBe('es');
  });

  it('lets a stored choice win over the browser hint', async () => {
    await expect(initLanguage({ stored: 'es', browser: 'en-US' })).resolves.toBe('es');
    await expect(initLanguage({ stored: 'en', browser: 'es-CO' })).resolves.toBe('en');
  });

  it('ignores a stored value it does not ship and falls back to the hint', async () => {
    await expect(initLanguage({ stored: 'klingon', browser: 'en-GB' })).resolves.toBe('en');
  });

  it('defaults to Spanish with no storage and no navigator (the build/tests path)', async () => {
    await expect(initLanguage({ browser: undefined })).resolves.toBe('es');
  });
});
