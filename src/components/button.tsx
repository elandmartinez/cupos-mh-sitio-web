import type { ButtonHTMLAttributes, ReactNode } from 'react';

/**
 * The design system's button variants, mapped 1:1 to the classes in
 * `src/styles/theme.css` (see DESIGN.md §4). `primary` is the one primary
 * action per screen; `icon` is the square, label-free control that must carry
 * an `aria-label`.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'ghost-danger' | 'danger' | 'icon';

/** sm 32 / md 40 (default) / lg 48 — the size scale from DESIGN.md §4. */
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'btnPrimary',
  secondary: 'btnSecondary',
  ghost: 'btnGhost',
  'ghost-danger': 'btnGhost btnGhost--danger',
  danger: 'btnDanger',
  icon: 'btnIcon',
};

const SIZE_CLASS: Record<ButtonSize, string> = {
  sm: 'btnSm',
  md: '', // the base class already is the md default
  lg: 'btnLg',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Decorative leading glyph (an icon or emoji), kept out of the a11y tree. */
  icon?: ReactNode;
  /** Swaps in the spinner and disables the button while its action runs. */
  loading?: boolean;
}

/**
 * The general-purpose button: drops the right design-system classes onto a
 * native `<button>` and passes every other prop straight through (`type`,
 * `onClick`, `disabled`, `aria-*`, …).
 *
 * It deliberately renders a `<button>` — never an anchor. Navigation uses
 * links (`DESIGN.md` §4: "never use a button for navigation").
 */
export default function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  loading = false,
  className,
  children,
  type = 'button',
  disabled,
  ...rest
}: ButtonProps) {
  const classes = [VARIANT_CLASS[variant], SIZE_CLASS[size], className]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      {...rest}
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
    >
      {loading ? (
        <span className="spinner" aria-hidden="true" />
      ) : (
        icon != null && <span aria-hidden="true">{icon}</span>
      )}
      {children}
    </button>
  );
}
