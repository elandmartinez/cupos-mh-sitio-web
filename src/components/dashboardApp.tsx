import React from 'react';
import { AuthProvider } from '../context/authContext';
import { AuthGuard } from './authGuard';
import Dashboard from './dashboard';

export default function DashboardApp() {
  return (
    <AuthProvider>
      <AuthGuard>
        <Dashboard />
      </AuthGuard>
    </AuthProvider>
  );
}
