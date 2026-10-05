import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { repoFailure, repoSuccess } from './types';
import type { RepoResult } from './types';

/** What the app cares about from a session: who is signed in. */
export interface AuthSession {
  session: Session | null;
  user: User | null;
}

/** Restore the persisted session (or `null` when nobody is signed in). */
async function getSession(): Promise<RepoResult<AuthSession>> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return repoSuccess({ session: data.session, user: data.session?.user ?? null });
  } catch (error) {
    return repoFailure(error, 'No se pudo restaurar la sesión.');
  }
}

/** Email + password sign-in. */
async function signInWithPassword(
  email: string,
  password: string
): Promise<RepoResult<AuthSession>> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return repoSuccess({ session: data.session, user: data.user });
  } catch (error) {
    return repoFailure(error, 'No se pudo iniciar sesión.');
  }
}

/** Sign the current user out (clears the persisted session). */
async function signOut(): Promise<RepoResult<null>> {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    return repoSuccess(null);
  } catch (error) {
    return repoFailure(error, 'No se pudo cerrar sesión.');
  }
}

/**
 * Subscribe to login/logout/token-refresh events.
 *
 * Returns an unsubscribe function — call it on unmount (`useEffect` cleanup).
 * The callback is invoked with the session only, because that is all the app
 * reads; add the event name here if a caller ever needs to distinguish them.
 */
function onAuthStateChange(callback: (session: Session | null) => void): () => void {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return () => data.subscription.unsubscribe();
}

/**
 * Supabase Auth. Not a table, but still a client-talking surface, so it lives
 * behind a repository like the data tables do — and it is the single source of
 * the supabase client for the auth screens.
 */
export const authRepository = {
  getSession,
  signInWithPassword,
  signOut,
  onAuthStateChange,
};

export type AuthRepository = typeof authRepository;
