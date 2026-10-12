import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  applyLanguage,
  normaliseLanguage,
  syncDocumentLanguage,
  type AppLanguage,
} from '../i18n';

/**
 * The active language and the way to change it.
 *
 * `language` is always `'es' | 'en'` — never `'es-CO'` — so the switch can
 * compare it exactly instead of pattern-matching a locale tag.
 *
 * Mounting this hook also syncs the document: `<html lang>` and the three
 * strings the Astro shell owns (`Layout.astro`). That matters for a visitor who
 * picked English on a previous visit and lands on a page whose HTML was baked in
 * Spanish — without the sync the page would be Spanish-labelled English.
 */
export function useLanguage() {
  const { i18n } = useTranslation();
  const [language, setLanguageState] = useState<AppLanguage>(() =>
    normaliseLanguage(i18n.language)
  );

  // The init already resolved the stored choice into `i18n.language`; this only
  // pushes it into the document. No storage write, no `changeLanguage` — an
  // effect that re-applied the language on mount would fight the singleton.
  useEffect(() => {
    syncDocumentLanguage(normaliseLanguage(i18n.language));
  }, [i18n]);

  // Track changes made anywhere, not just through `setLanguage` below.
  useEffect(() => {
    const handleChange = (next: string) => setLanguageState(normaliseLanguage(next));
    i18n.on('languageChanged', handleChange);
    return () => {
      i18n.off('languageChanged', handleChange);
    };
  }, [i18n]);

  const setLanguage = useCallback((next: AppLanguage) => {
    void applyLanguage(next);
  }, []);

  return { language, setLanguage };
}
