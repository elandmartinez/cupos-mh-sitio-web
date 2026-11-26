import { useCallback, useState } from 'react';
import { adminUsersRepository } from '../repositories/adminUsersRepository';
import type {
  AdminUser,
  CreateAdminUserInput,
  PatchAdminUserInput,
} from '../repositories/adminUsersRepository';

// Rows come from the repository; re-exported so components can keep importing
// them from the hook that owns the data.
export type { AdminUser, CreateAdminUserInput, PatchAdminUserInput };

/**
 * Admin user management — the "users" section of the admin dashboard.
 *
 * Reads and writes go through `adminUsersRepository`, which routes every call
 * through the `admin-users` Edge Function (the security boundary). After a
 * successful mutation the list is re-fetched so the UI always reflects the
 * current `auth.users` + `profiles` state.
 */
export function useAdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await adminUsersRepository.list();
    if (!result.ok) {
      setError(result.error);
      setLoading(false);
      return;
    }
    setUsers(result.data);
    setLoading(false);
  }, []);

  const createUser = useCallback(
    async (input: CreateAdminUserInput) => {
      setError(null);
      const result = await adminUsersRepository.create(input);
      if (!result.ok) {
        setError(result.error);
        return { data: null, error: result.error };
      }
      await fetchUsers();
      return { data: result.data, error: null };
    },
    [fetchUsers]
  );

  const updateUser = useCallback(
    async (id: string, patch: PatchAdminUserInput) => {
      setError(null);
      const result = await adminUsersRepository.update(id, patch);
      if (!result.ok) {
        setError(result.error);
        return { data: null, error: result.error };
      }
      await fetchUsers();
      return { data: null, error: null };
    },
    [fetchUsers]
  );

  const setUserDisabled = useCallback(
    async (id: string, disabled: boolean) => {
      setError(null);
      const result = await adminUsersRepository.setDisabled(id, disabled);
      if (!result.ok) {
        setError(result.error);
        return { error: result.error };
      }
      await fetchUsers();
      return { error: null };
    },
    [fetchUsers]
  );

  const deleteUser = useCallback(
    async (id: string) => {
      setError(null);
      const result = await adminUsersRepository.remove(id);
      if (!result.ok) {
        setError(result.error);
        return { error: result.error };
      }
      await fetchUsers();
      return { error: null };
    },
    [fetchUsers]
  );

  return {
    users,
    loading,
    error,
    fetchUsers,
    createUser,
    updateUser,
    setUserDisabled,
    deleteUser,
  };
}
