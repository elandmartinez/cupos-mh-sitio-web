import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { authRepository } from '../repositories/authRepository';
import { LanguageSwitch } from './ui';
import monsterHighLogo from '../../public/monster-high-logo.png';

/**
 * The sign-in screen. Copy-free by construction: every string comes from `t()`,
 * and `LanguageSwitch` (which renders unconditionally) is also what keeps
 * `<html lang>` and the shell's copy in step with the chosen language.
 */
export default function LoginModal() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    // The session is persisted by Supabase itself (and read back through
    // AuthProvider) — the old localStorage copy was never read by anything.
    const result = await authRepository.signInWithPassword(email, password);

    if (!result.ok) {
      setErrorMsg(result.error);
      setLoading(false);
      return;
    }

    window.location.href = '/dashboard';
  };

  return (
    <div className="authShell">
      {/* Language before credentials: a visitor who cannot read the form should
          not have to sign in first to fix that. */}
      <div className="authTopBar">
        <LanguageSwitch />
      </div>

      <header className="authHero">
        <img
          src={monsterHighLogo.src}
          alt="Monster High"
          className="authLogo"
          width="860"
          height="213"
        />
        <p className="authEyebrow">{t('auth.eyebrow')}</p>
        <h1 className="authWordmark">{t('auth.wordmark')}</h1>
      </header>

      <section className="authCard" aria-labelledby="authTitle">
        <div className="authHeader">
          <h2 id="authTitle" className="authTitle">
            {t('auth.title')}
          </h2>
          <p className="authSubtitle">{t('auth.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="authForm">
          <div className="fieldGroup">
            <label className="label" htmlFor="email">
              {t('auth.email')}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="username"
              spellCheck={false}
              className="input"
              placeholder={t('auth.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="fieldGroup">
            <label className="label" htmlFor="password">
              {t('auth.password')}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              className="input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={errorMsg ? true : undefined}
              aria-describedby={errorMsg ? 'passwordError' : undefined}
              required
            />
            {/* A credentials failure belongs to the field it concerns — inline,
                in place, with what to do next. Never a banner or a toast. */}
            {errorMsg && (
              <p className="fieldError" id="passwordError" role="alert">
                <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
                  <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
                  <path
                    d="M8 4.6v4.1M8 11.1v.2"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
                <span>{errorMsg}</span>
              </p>
            )}
          </div>

          <button type="submit" className="btnPrimary submitBtn" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner" aria-hidden="true" />
                <span>{t('auth.submitting')}</span>
              </>
            ) : (
              t('auth.submit')
            )}
          </button>
        </form>
      </section>
    </div>
  );
}
