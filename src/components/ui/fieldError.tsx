interface FieldErrorProps {
  /** id for the error element; the field wires `aria-describedby` to it. */
  id: string;
  /** The translated message to show. */
  message: string;
}

/**
 * An inline validation message, rendered directly below the field it concerns —
 * never in a toast or banner. Mirrors the login form's `.fieldError` pattern
 * (icon + text), which lives in `theme.css`.
 *
 * Accessibility contract: renders with `role="alert"` so the message is
 * announced, and the caller sets `aria-invalid` / `aria-describedby` on the
 * input, pointing `aria-describedby` at this component's `id`.
 */
export default function FieldError({ id, message }: FieldErrorProps) {
  return (
    <p className="fieldError" id={id} role="alert">
      <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false">
        <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 4.6v4.1M8 11.1v.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <span>{message}</span>
    </p>
  );
}
