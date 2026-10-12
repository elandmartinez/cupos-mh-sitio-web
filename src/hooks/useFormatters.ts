import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { LOCALE_TAG, normaliseLanguage } from '../i18n';
import { formatCurrency } from '../helpers/currency';
import { formatDate } from '../helpers/date';

/**
 * The pure formatters bound to the active language.
 *
 * `Intl` stays the engine — this only supplies the locale tag, so `180000`
 * renders as `180.000` in Spanish and `180,000` in English without either
 * helper knowing about React or i18next. Components call this hook; the helpers
 * underneath stay pure and testable.
 */
export function useFormatters() {
  const { i18n } = useTranslation();
  const locale = LOCALE_TAG[normaliseLanguage(i18n.language)];

  return useMemo(
    () => ({
      formatCurrency: (value: number | null | undefined) => formatCurrency(value, locale),
      formatDate: (value: string | null | undefined) => formatDate(value, locale),
    }),
    [locale]
  );
}
