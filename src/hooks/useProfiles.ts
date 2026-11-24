import { useCallback, useState } from 'react';
import { profilesRepository } from '../repositories/profilesRepository';
import type { Profile } from '../repositories/profilesRepository';

export type { Profile };

/**
 * The list of `profiles`, for the admin's "link a purchase to a customer
 * account" selector. RLS (`profiles_admin_all`) means this returns rows only for
 * an admin; a customer never reaches this hook.
 */
export function useProfiles() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await profilesRepository.findMany();
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }
    setProfiles(result.data);
    setLoading(false);
  }, []);

  return { profiles, loading, error, fetchProfiles };
}
