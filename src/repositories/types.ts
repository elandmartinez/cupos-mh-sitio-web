/**
 * The contract every repository in this folder answers with.
 *
 * A repository is the **only** place in the app that talks to Supabase: the
 * hooks call repositories, and nothing else touches the supabase client. That
 * way the UI layer can trust what it gets back — no exceptions to catch, no
 * half-shaped rows — and changing *how* data is fetched later only edits these
 * files.
 *
 * Every call resolves to a `RepoResult<T>`: either `ok: true` with data that is
 * guaranteed non-null and shaped like the table row, or `ok: false` with a
 * message that is safe to render. Repositories never throw.
 */

export type RepoResult<T> =
  | { ok: true; data: T; error: null }
  | { ok: false; data: null; error: string };

/** Build a successful result. */
export function repoSuccess<T>(data: T): RepoResult<T> {
  return { ok: true, data, error: null };
}

/** Build a failure result out of a thrown or returned Supabase error. */
export function repoFailure<T = never>(error: unknown, fallbackMessage: string): RepoResult<T> {
  return { ok: false, data: null, error: toErrorMessage(error, fallbackMessage) };
}

/**
 * Best-effort message extraction. Supabase errors carry a `message`, but a
 * thrown string or an unexpected shape should still produce copy a human can
 * read instead of `[object Object]` or `undefined`.
 */
export function toErrorMessage(error: unknown, fallbackMessage: string): string {
  if (typeof error === 'string' && error.trim() !== '') return error;

  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim() !== '') return message;
  }

  return fallbackMessage;
}

/**
 * `updated_at` is client-maintained — the column is nullable and the database
 * only defaults it on insert — so every write stamps it through here.
 */
export function nowIso(): string {
  return new Date().toISOString();
}
