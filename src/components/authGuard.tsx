import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/authContext';

export const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { t } = useTranslation();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      window.location.href = '/'; // Redirigir al login si no está autenticado
    }
  }, [user, loading]);

  if (loading) {
    // A session check, not data loading: there is nothing to skeleton — the
    // answer arrives once and the screen either mounts or redirects.
    return (
      <div className="statusMessage" role="status" aria-live="polite">
        <span className="spinner" aria-hidden="true" />
        <span>{t('auth.verifyingSession')}</span>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
};
