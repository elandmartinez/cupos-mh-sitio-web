import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../hooks/useLanguage';
import { SUPPORTED_LANGUAGES } from '../../i18n';

interface LanguageSwitchProps {
  /** Extra classes for the host layout (spacing differs per screen). */
  className?: string;
}

/**
 * ES / EN switch — two pressed-state buttons in a labelled group.
 *
 * `aria-pressed` rather than `role="tab"`/`radiogroup`: these are two independent
 * toggles over a stored preference, and `aria-pressed` states exactly that
 * without promising the arrow-key contract a tablist would then owe.
 *
 * The visible label is the two-letter code, never the full word — "Español" /
 * "English" is too wide for a phone top bar (`DESIGN.md` §3). The full name lives
 * in `aria-label`, so assistive tech hears an action ("Cambiar a inglés") and a
 * sighted user reads a compact segment.
 *
 * Copy-free inside: every string comes from `t()`, so this component renders
 * nothing hardcoded in either language.
 */
export default function LanguageSwitch({ className }: LanguageSwitchProps) {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();

  // Both options share one class list, so only the pressed state differs.
  const optionClass = ['btnGhost', 'btnSm', 'langSwitchOption', className]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="langSwitch" role="group" aria-label={t('common.language')}>
      {SUPPORTED_LANGUAGES.map((code) => (
        <button
          key={code}
          type="button"
          className={optionClass}
          // Marks the language of the button's own label ("ES" is Spanish text).
          lang={code}
          aria-pressed={language === code}
          aria-label={code === 'en' ? t('common.switchToEnglish') : t('common.switchToSpanish')}
          onClick={() => setLanguage(code)}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
