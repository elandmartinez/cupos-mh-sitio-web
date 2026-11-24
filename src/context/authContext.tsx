import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { authRepository } from '../repositories/authRepository';
import { profilesRepository } from '../repositories/profilesRepository';
import type { ProfileRole } from '../repositories/profilesRepository';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  /** `'ADMIN'` | `'CUSTOMER'` once resolved; `null` only while still loading. */
  role: ProfileRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  role: null,
  loading: true,
  signOut: async () => {},
});

/**
 * A role string the database may hold, folded to the two the app branches on.
 * `null` (a missing profile) and anything other than `ADMIN` read as `CUSTOMER`,
 * so a failure to fetch the role can never grant the admin screen.
 */
function resolveRole(rawRole: string | null | undefined): ProfileRole {
  return rawRole === 'ADMIN' ? 'ADMIN' : 'CUSTOMER';
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<ProfileRole | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  // The user id whose role is already reflected in `role`, so a token refresh
  // (same id) does not re-fetch and flash the "verifying session" spinner.
  const resolvedUserIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    async function applyUser(nextUser: User | null): Promise<void> {
      const nextId = nextUser?.id ?? null;
      if (resolvedUserIdRef.current === nextId) return; // identity unchanged
      resolvedUserIdRef.current = nextId;
      if (!nextUser) {
        setRole(null);
        return;
      }
      const result = await profilesRepository.findById(nextUser.id);
      if (cancelled) return;
      setRole(resolveRole(result.ok ? result.data?.role : null));
    }

    // Restore the persisted session, then resolve its role before clearing the
    // loading flag — so the router never renders a screen for the wrong role.
    authRepository.getSession().then((result) => {
      if (cancelled) return;
      if (!result.ok) console.error('Error restoring session:', result.error);

      const restored = result.ok ? result.data.session : null;
      setSession(restored);
      setUser(restored?.user ?? null);
      applyUser(restored?.user ?? null).finally(() => {
        if (!cancelled) setLoading(false);
      });
    });

    // Login / logout / token refresh.
    const unsubscribe = authRepository.onAuthStateChange((nextSession) => {
      if (cancelled) return;
      setSession(nextSession);
      const nextUser = nextSession?.user ?? null;
      setUser(nextUser);

      const nextId = nextUser?.id ?? null;
      if (nextId === resolvedUserIdRef.current) {
        // Token refresh: the identity is the same, so nothing needs re-resolving.
        if (nextId === null) setLoading(false);
        return;
      }
      if (nextId === null) {
        resolvedUserIdRef.current = null;
        setRole(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      applyUser(nextUser).finally(() => {
        if (!cancelled) setLoading(false);
      });
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await authRepository.signOut();
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{ session, user, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
