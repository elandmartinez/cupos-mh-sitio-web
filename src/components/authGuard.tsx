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
    return <div className="statusMessage">Verificando sesión...</div>;
  }
  
  console.log("AuthGuard - user:", user, "loading:", loading);
  
  if (!user) {
    return null;
  }

  return <>{children}</>;
};