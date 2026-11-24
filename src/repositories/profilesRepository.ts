import { supabase } from '../lib/supabase';
import { repoFailure, repoSuccess } from './types';
import type { RepoResult } from './types';

/**
 * The two roles the app acts on. The database stores them uppercase; anything
 * else (including `null`) is treated as `CUSTOMER` — the safe, read-only side.
 */
export type ProfileRole = 'ADMIN' | 'CUSTOMER';

/** One row of `public.profiles`, exactly as the database stores it. */
export interface Profile {
  id: string;
  created_at: string;
  updated_at: string | null;
  role: string | null;
  /** Display name (auto-populated by `handle_new_user`, editable later). */
  name: string | null;
  /** Login email, copied from `auth.users` by the trigger. */
  email: string | null;
}

/** One profile by id. RLS (`profiles_select_own`) limits readers to their own row. */
async function findById(id: string): Promise<RepoResult<Profile | null>> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return repoSuccess(data as Profile | null);
  } catch (error) {
    return repoFailure(error, 'No se pudo obtener el perfil.');
  }
}

/**
 * Every profile. RLS (`profiles_admin_all`) lets only admins read the list, so
 * this powers the admin's "link a purchase to a customer account" selector.
 */
async function findMany(): Promise<RepoResult<Profile[]>> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return repoSuccess((data ?? []) as Profile[]);
  } catch (error) {
    return repoFailure(error, 'No se pudieron obtener los perfiles.');
  }
}

/**
 * The `profiles` table — the link between `auth.users` and an app role.
 */
export const profilesRepository = {
  findById,
  findMany,
};

export type ProfilesRepository = typeof profilesRepository;
