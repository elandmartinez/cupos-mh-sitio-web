import { createClient } from '@supabase/supabase-js';
import { i18n, LOCALE_TAG, normaliseLanguage } from '../i18n';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseKey = import.meta.env.PUBLIC_SUPABASE_KEY;

/**
 * Names of the `PUBLIC_*` vars the app cannot boot without, as read from the
 * bundle. They are inlined at build time, so a missing one is always a
 * build/config mistake rather than something a user could fix at runtime.
 */
const missingEnvVars = [
  !supabaseUrl ? 'PUBLIC_SUPABASE_URL' : null,
  !supabaseKey ? 'PUBLIC_SUPABASE_KEY' : null,
].filter((name): name is string => name !== null);

/**
 * Readable, actionable failure message — never a silent `undefined`.
 *
 * Read through the singleton already in hand rather than a hardcoded literal, so
 * the message is in the visitor's language: this is the first thing a
 * misconfigured deploy shows. The conjunction ("y" / "and") comes from
 * `Intl.ListFormat`, so the phrase is never half-translated.
 *
 * `t()` renders its own key when a resource is missing (`returnNull: false`), and
 * a raw key is useless in a message whose whole job is to be actionable — so a
 * miss is re-read explicitly in Spanish, the fallback language and the reference
 * resource. The guard stays loud in every language, from one source of truth.
 */
const CONFIG_ERROR_KEY = 'errors.configMissing';

function configErrorMessageFor(name: string): string {
  const message = i18n.t(CONFIG_ERROR_KEY, { name });
  return message === CONFIG_ERROR_KEY ? i18n.t(CONFIG_ERROR_KEY, { name, lng: 'es' }) : message;
}

const configErrorMessage = configErrorMessageFor(
  new Intl.ListFormat(LOCALE_TAG[normaliseLanguage(i18n.language)], {
    style: 'long',
    type: 'conjunction',
  }).format(missingEnvVars)
);

if (missingEnvVars.length > 0) {
  // A bare module-scope throw would leave the page blank, so paint the reason
  // into the DOM first when one exists, then still throw: the build fails loudly
  // too, with the same message.
  renderConfigError(configErrorMessage);
  throw new Error(configErrorMessage);
}

export const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Last-resort notice for a misconfigured bundle. Writes into the page's `#main`
 * (or `<body>`) using the shared `.banner--danger` styles so a broken deploy
 * shows a sentence a human can act on instead of an empty screen.
 */
function renderConfigError(message: string): void {
  if (typeof document === 'undefined') return; // SSR/build — the throw is enough.

  const mount = document.querySelector('#main') ?? document.body;
  if (!mount) return;

  const notice = document.createElement('div');
  notice.className = 'banner banner--danger';
  notice.setAttribute('role', 'alert');
  notice.style.margin = 'var(--space-24)';
  notice.textContent = message;
  mount.prepend(notice);
}