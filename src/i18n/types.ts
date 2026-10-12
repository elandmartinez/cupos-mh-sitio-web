/**
 * Type-level wiring. Augmenting `CustomTypeOptions` is what makes `t('sales.owed')`
 * a compile-time key and `t('sales.owed', { count, amount })` a compile-time call:
 * a typo or a stale key becomes a `tsc` error, which is the gate this repo has
 * (there is no linter yet).
 */
import type { CustomTypeOptions } from 'i18next';
import type es from './locales/es';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: {
      translation: typeof es;
    };
  }
}

/**
 * The `Layout.astro` shell cannot import this bundle — it is an inline script
 * baked at build time — so it publishes one small function on `window` and the
 * language hook calls it. Declared here rather than cast at the call site, so the
 * contract is checked.
 */
declare global {
  interface Window {
    /** Set by Layout's inline script; absent if the script did not run. */
    __cuposApplyLang?: (lang: 'es' | 'en') => void;
  }
}

export type { CustomTypeOptions };
