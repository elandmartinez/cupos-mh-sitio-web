/**
 * Language identity, resolution and storage — with no import of the i18next
 * singleton, so the pure rules stay testable in plain Node (no jsdom, no
 * network, no build-time env) and nothing here can form an import cycle.
 *
 * The rules:
 * - Two languages ship: `es` and `en`. Nothing else is a language to us.
 * - Resolution order is stored choice → browser hint → `es`. A returning visitor
 *   always gets what they picked; the browser only nudges the first visit.
 * - Spanish is the static default, because the HTML is rendered at build time
 *   with `lang="es"` and must be coherent before any JavaScript runs.
 */

export type AppLanguage = 'es' | 'en';

export const SUPPORTED_LANGUAGES: readonly AppLanguage[] = ['es', 'en'];

export const DEFAULT_LANGUAGE: AppLanguage = 'es';

/** Namespaced like the rest of the app's storage keys. */
export const LANGUAGE_STORAGE_KEY = 'cupos.lang';

/**
 * `es` → `es-CO`, `en` → `en-US`. The single place the mapping lives, so the
 * formatters, the date/currency helpers and the tests can never disagree.
 */
export const LOCALE_TAG: Record<AppLanguage, string> = {
  es: 'es-CO',
  en: 'en-US',
};

/** True when `value` is a language the app actually ships. */
export function isAppLanguage(value: unknown): value is AppLanguage {
  return typeof value === 'string' && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

/** Anything starting with `en` is English; everything else is Spanish. */
export function normaliseLanguage(value: string | null | undefined): AppLanguage {
  return typeof value === 'string' && value.toLowerCase().startsWith('en') ? 'en' : 'es';
}

/**
 * The resolution order, as a pure function of its two inputs: a stored value
 * that we do not recognise (an old key, a hand-edited value) is ignored rather
 * than trusted, and the browser hint decides.
 */
export function resolveLanguage(
  stored: string | null | undefined,
  browserLanguage: string | null | undefined
): AppLanguage {
  if (isAppLanguage(stored)) return stored;
  return normaliseLanguage(browserLanguage);
}

/** `localStorage` can be missing (Node, tests) or throw (private mode). */
function readStorage(key: string): string | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, value);
  } catch {
    // A write that fails only costs the visitor their choice on the next visit.
  }
}

/**
 * The persisted choice exactly as written — `null` when there is none — i.e. the
 * raw input to `resolveLanguage`.
 *
 * `readStoredLanguage()` is the *defaulted* convenience (it never returns null);
 * this is the variant the singleton needs, because collapsing "nothing stored" to
 * `'es'` too early would hide the browser hint from the resolution rule.
 */
export function readRawStoredLanguage(): string | null {
  return readStorage(LANGUAGE_STORAGE_KEY);
}

/** The visitor's persisted choice, if it is still one we ship — else `es`. */
export function readStoredLanguage(): AppLanguage {
  const stored = readRawStoredLanguage();
  if (isAppLanguage(stored)) return stored;
  return DEFAULT_LANGUAGE;
}

/** Persists the choice. Called by `useLanguage.setLanguage`. */
export function writeStoredLanguage(language: AppLanguage): void {
  writeStorage(LANGUAGE_STORAGE_KEY, language);
}
