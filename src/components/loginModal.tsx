import React, { useState } from 'react';
import { authRepository } from '../repositories/authRepository';
import monsterHighLogo from '../../public/monster-high-logo.png';

export default function LoginModal() {
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
      <header className="authHero">
        <img
          src={monsterHighLogo.src}
          alt="Monster High"
          className="authLogo"
          width="860"
          height="213"
        />
        <p className="authEyebrow">Y más.</p>
        <h1 className="authWordmark">Gestión de cupos</h1>
      </header>

      <section className="authCard" aria-labelledby="authTitle">
        <div className="authHeader">
          <h2 id="authTitle" className="authTitle">
            Inicia sesión
          </h2>
          <p className="authSubtitle">Ingresa con tu correo y contraseña para ver tu panel.</p>
        </div>

        <form onSubmit={handleSubmit} className="authForm">
          <div className="fieldGroup">
            <label className="label" htmlFor="email">
              Correo electrónico
            </label>
            <input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="username"
              spellCheck={false}
              className="input"
              placeholder="nombre@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="fieldGroup">
            <label className="label" htmlFor="password">
              Contraseña
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
                <span>Iniciando sesión…</span>
              </>
            ) : (
              'Iniciar sesión'
            )}
          </button>
        </form>
      </section>
    </div>
  );
}
