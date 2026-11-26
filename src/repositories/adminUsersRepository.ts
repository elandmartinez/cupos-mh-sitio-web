import { supabase } from '../lib/supabase';
import { repoFailure, repoSuccess } from './types';
import type { RepoResult } from './types';

/**
 * One row of the admin "user management" list, joined by the `admin-users`
 * Edge Function from `auth.users` (id/email/disabled) and `public.profiles`
 * (name/role/email fallback).
 */
export interface AdminUser {
  id: string;
  email: string | null;
  name: string | null;
  role: string | null;
  disabled: boolean;
}

/** Payload for creating a user (the Edge Function links the auth + profile rows). */
export interface CreateAdminUserInput {
  email: string;
  password: string;
  name: string;
  role: 'ADMIN' | 'CUSTOMER';
}

/** Editable fields of an existing user. Omitting a field leaves it unchanged. */
export interface PatchAdminUserInput {
  name?: string;
  email?: string;
  role?: 'ADMIN' | 'CUSTOMER';
  /** New password. Only sent when non-empty — blank means "keep current". */
  password?: string;
}

/**
 * One call to the `admin-users` Edge Function. The browser's anon key cannot do
 * any of this alone — the function re-verifies the caller is an admin with the
 * service key before it touches `auth.admin`, so this is the security boundary
 * for everything below.
 */
async function invokeAdminUsers<T>(
  body: Record<string, unknown>,
  fallbackMessage: string
): Promise<RepoResult<T>> {
  try {
    const { data, error } = await supabase.functions.invoke('admin-users', { body });
    if (error) throw error;
    const result = data as { ok?: boolean; error?: string } & T;
    if (!result || result.ok === false) {
      throw new Error(result?.error ?? 'Unknown error');
    }
    return repoSuccess(result as T);
  } catch (error) {
    return repoFailure(error, fallbackMessage);
  }
}

/** Every user, with their profile fields merged in. */
function list(): Promise<RepoResult<AdminUser[]>> {
  return invokeAdminUsers<{ users: AdminUser[] }>(
    { action: 'list' },
    'No se pudieron cargar los usuarios.'
  ).then((result) => {
    if (!result.ok) return result;
    return repoSuccess(result.data.users);
  });
}

/** Create a user (auth account + profile row), returning the new user's id. */
function create(input: CreateAdminUserInput): Promise<RepoResult<AdminUser>> {
  return invokeAdminUsers<{ user: { id: string } }>(
    { action: 'create', ...input },
    'No se pudo crear el usuario.'
  ).then((result) => {
    if (!result.ok) return result;
    return repoSuccess({ id: result.data.user.id, email: input.email, name: input.name, role: input.role, disabled: false });
  });
}

/** Update a user's name, email and/or role. */
function update(id: string, patch: PatchAdminUserInput): Promise<RepoResult<null>> {
  return invokeAdminUsers<null>({ action: 'update', id, ...patch }, 'No se pudo actualizar el usuario.');
}

/** Ban (disable) or unban (re-enable) a user. */
function setDisabled(id: string, disabled: boolean): Promise<RepoResult<null>> {
  return invokeAdminUsers<null>({ action: 'setDisabled', id, disabled }, 'No se pudo cambiar el estado del usuario.');
}

/** Delete a user's auth account (their profile row cascades). */
function remove(id: string): Promise<RepoResult<null>> {
  return invokeAdminUsers<null>({ action: 'delete', id }, 'No se pudo eliminar el usuario.');
}

/**
 * Admin user management. Every write goes through the `admin-users` Edge
 * Function, which is the only place the service-role key (and `auth.admin`)
 * exists.
 */
export const adminUsersRepository = {
  list,
  create,
  update,
  setDisabled,
  remove,
};

export type AdminUsersRepository = typeof adminUsersRepository;
