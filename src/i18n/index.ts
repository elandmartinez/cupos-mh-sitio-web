/**
 * The i18n singleton.
 *
 * Client-side only and fully static: the resources are two bundled modules, so
 * nothing here fetches at build time or at run time, and no server is involved
 * (`AGENTS.md` — shippable by default). Two Astro islands import this module, so
 * `init()` is guarded: a second React root must reuse the instance, not rebuild
 * it.
 */
import i18next from 'i18next';
import { initReactI18next } from 'react-i18next';
import es from './locales/es';
import en from './locales/en';
import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  readRawStoredLanguage,
  resolveLanguage,
  writeStoredLanguage,
  type AppLanguage,
} from './languages';

// One import surface for the rest of the app: components reach for `useLanguage`
// or `useFormatters`, and the storage/locale rules stay behind this barrel.
export {
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  LOCALE_TAG,
  SUPPORTED_LANGUAGES,
  isAppLanguage,
  normaliseLanguage,
  readRawStoredLanguage,
  readStoredLanguage,
  resolveLanguage,
  writeStoredLanguage,
} from './languages';
export type { AppLanguage } from './languages';

/**
 * The browser's preference, or `undefined` where there is no `navigator` (Node,
 * the test runner, a stripped environment). i18next has no detector installed, so
 * this is the only source of that hint — pass it to `resolveLanguage`.
 */
function browserLanguage(): string | undefined {
  return typeof navigator === 'undefined' ? undefined : navigator.language;
}

/**
 * Built once, at module scope. ES modules evaluate once, so both islands on a
 * page (and HMR reloads) reuse this instance instead of re-running `init()` —
 * which would reset the active language and re-register the React binding.
 * `createInstance` + `initReactI18next` is the supported two-root pattern;
 * `initReactI18next` publishes the instance to `useTranslation`.
 */
function createInstance() {
  const instance = i18next.createInstance();

  instance.use(initReactI18next).init({
    resources: {
      es: { translation: es },
      en: { translation: en },
    },
    // The resolution order (stored → browser hint → `es`) belongs to
    // `resolveLanguage`: defaulting "nothing stored" to `es` here would hide the
    // hint and leave that rule as tested-but-unused code.
    lng: resolveLanguage(readRawStoredLanguage(), browserLanguage()),
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: [...SUPPORTED_LANGUAGES],
    // React escapes interpolated values itself; escaping here would double-encode.
    interpolation: { escapeValue: false },
    // A missing key must render its key — never an empty node that silently eats
    // a label. The parity test is what stops this from happening in practice.
    returnNull: false,
  });

  if (import.meta.env.DEV) {
    // Only in dev: text turned up that no resource file knows about. Stripped
    // from the production bundle, so an English gap is loud while writing it and
    // free once it ships.
    instance.on('missingKey', (_lngs, namespace, key) => {
      console.warn(`[i18n] missing key: ${namespace}:${key}`);
    });
  }

  return instance;
}

export const i18n = createInstance();

/**
 * Pushes the language into the Astro shell: `<html lang>` plus the three strings
 * it owns (skip link, `<title>`, `<meta description>`).
 *
 * The shell is a build-time inline script and cannot import this bundle, so it
 * publishes `window.__cuposApplyLang`. Absent (script stripped, or a test), the
 * `lang` attribute is still correct here. Safe to call repeatedly — the script's
 * function is idempotent by construction.
 */
export function syncDocumentLanguage(language: AppLanguage): void {
  if (typeof document === 'undefined') return;

  document.documentElement.lang = language;
  window.__cuposApplyLang?.(language);
}

/**
 * The one place a language *change* is applied — so the switch, the initial sync
 * and any future caller cannot drift apart: i18next first (React re-renders
 * through `useTranslation`), then the persisted choice, then the shell.
 */
export async function applyLanguage(language: AppLanguage): Promise<void> {
  await i18n.changeLanguage(language);
  writeStoredLanguage(language);
  syncDocumentLanguage(language);
}

export default i18n;
export { i18next };
