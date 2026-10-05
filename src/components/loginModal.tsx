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
            Bienvenida de nuevo
          </h2>
          <p className="authSubtitle">Ingresa tus datos para acceder a tu cuenta</p>
        </div>

        {errorMsg && (
          <p className="errorMessage" role="alert">
            {errorMsg}
          </p>
        )}

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
              required
            />
          </div>

          <button type="submit" className="submitBtn" disabled={loading}>
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
