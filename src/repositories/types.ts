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
 * Best-effort message extraction, in the app's own voice.
 *
 * UXonFly forbids leaking raw provider text ("Invalid login credentials",
 * "new row violates row-level security policy") and raw error codes: what
 * reaches the screen is either a known failure translated into plain Spanish
 * with a next step, or the caller's own fallback — never an English string or
 * a status code.
 */
const KNOWN_ERRORS: Record<string, string> = {
  'Invalid login credentials':
    'El correo o la contraseña no coinciden. Revísalos e inténtalo de nuevo.',
  'Email not confirmed':
    'Tu correo aún no está confirmado. Confirma tu cuenta desde el enlace que te enviamos.',
  'User already registered':
    'Ese correo ya tiene una cuenta. Inicia sesión con tu contraseña.',
  'Invalid API key': 'La conexión con el servidor no está configurada. Avisa a quien administra el sitio.',
  'Failed to fetch': 'No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.',
  'NetworkError when attempting to fetch resource.':
    'No pudimos conectar. Revisa tu conexión e inténtalo de nuevo.',
};

export function toErrorMessage(error: unknown, fallbackMessage: string): string {
  if (typeof error === 'string') {
    return KNOWN_ERRORS[error] ?? withNextStep(fallbackMessage);
  }

  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') {
      return KNOWN_ERRORS[message] ?? withNextStep(fallbackMessage);
    }
  }

  return withNextStep(fallbackMessage);
}

/**
 * UXonFly: an error says what failed *and* what to do next. Callers pass the
 * first half ("No se pudo crear el producto."); the next step is appended here
 * so all ~30 call sites can't forget it, and a message that already carries
 * one is left untouched.
 */
function withNextStep(message: string): string {
  const trimmed = message.trim();
  if (/rev[íi]sa|confirma|avisa|espera|int[ée]ntalo|vuelve a/i.test(trimmed)) return trimmed;
  return `${trimmed.replace(/[.\s]*$/, '.')} Vuelve a intentarlo.`;
}

/**
 * `updated_at` is client-maintained — the column is nullable and the database
 * only defaults it on insert — so every write stamps it through here.
 */
export function nowIso(): string {
  return new Date().toISOString();
}
