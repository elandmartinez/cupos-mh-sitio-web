import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import monsterHighLogo from "../../public/monster-high-logo.png";

export default function LoginModal() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    localStorage.setItem('userData', JSON.stringify(data));

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
    } else {
      window.location.href = '/dashboard';
    }
  };

  return (
    <div className="auth-wrapper">

      <div className="auth-logo-wrapper">
        <img src={monsterHighLogo.src} alt="Logo de Monster High" className="logo" />
        <h2 className="logo-subtitle">Y mas.</h2>
        <h2 className="logo-text">GESTION DE CUPOS</h2>
      </div>

      <div className="auth-card">
        <div className="auth-header">
          <h2 className="auth-title">Bienvenida de nuevo</h2>
          <p className="auth-subtitle">Ingresa tus datos para acceder a tu cuenta</p>
        </div>

        {errorMsg && <div className="error-message">{errorMsg}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              Correo electrónico o usuario
            </label>
            <input
              id="email"
              type="text"
              className="form-input"
              placeholder="nombre@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>
        </form>
      </div>
    </div>
  );
}