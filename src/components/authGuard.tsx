import React, { useEffect } from 'react';
import { useAuth } from '../context/authContext';

export const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = '/'; // Redirigir al login si no está autenticado
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="statusMessage" role="status" aria-live="polite">
        <span className="spinner" aria-hidden="true" />
        <span>Verificando sesión…</span>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
};
