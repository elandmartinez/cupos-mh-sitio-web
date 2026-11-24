import React, { Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from '../context/authContext';
import { AuthGuard } from './authGuard';
import Dashboard from './dashboard';
import { SkeletonCard } from './ui';

// The customer screen is a separate chunk, fetched only for the customer role so
// the admin's first-load bundle is unchanged.
const CustomerDashboard = lazy(() => import('./customerDashboard'));

/**
 * The single role branch. RLS is the real security boundary; this only decides
 * *which screen* to render. `role === null` (still loading) is unreachable here
 * because `AuthGuard` gates on `loading`; a resolved non-`ADMIN` role falls back
 * to the read-only customer screen, which is always safe.
 */
function DashboardRouter() {
  const { role } = useAuth();
  if (role === 'ADMIN') return <Dashboard />;
  return (
    <Suspense fallback={<SkeletonCard />}>
      <CustomerDashboard />
    </Suspense>
  );
}

export default function DashboardApp() {
  return (
    <AuthProvider>
      <AuthGuard>
        <DashboardRouter />
      </AuthGuard>
    </AuthProvider>
  );
}
