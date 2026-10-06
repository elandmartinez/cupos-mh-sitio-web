import { useCallback, useEffect, useState } from 'react';

/**
 * How long a surface is kept mounted after it is asked to close. Must match
 * `--duration-base` in theme.css — nothing can read a CSS custom property from
 * JavaScript, so the two are kept in step by hand.
 */
export const EXIT_MS = 180;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * A presence window, so a surface can animate *out*.
 *
 * React has no `<Transition>`: the instant `{showModal && <Modal />}` flips, the
 * dialog is unmounted and there is nothing left to animate. This hook owns that
 * flag instead — `open(value)` shows the surface, `close()` starts the exit, and
 * the value is only dropped once the exit has had time to play.
 *
 * Two consequences worth relying on:
 *
 * - `value` stays readable for the *whole* exit, so a closing dialog never has
 *   to cope with its own data vanishing mid-animation (no title flipping from
 *   "Editar compra" back to "Agregar compra" on the way out).
 * - The surface really is unmounted afterwards, so per-open state (form fields,
 *   loaded payments) is rebuilt from scratch next time.
 *
 * Callers render on `value`/`isPresent` and add `isClosing` to the surface's
 * class list. Pair `close` with the component's `onClose`.
 */
export function usePresent<T = undefined>(exitMs: number = EXIT_MS) {
  // Wrapped so that a falsy payload (`null` for "create mode") still counts as
  // present — only `payload === null` means "gone".
  const [payload, setPayload] = useState<{ value: T } | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  // The value is optional so a surface with nothing to carry — the product
  // form, which reads its state from the component around it — can just call
  // `open()`.
  const open = useCallback((value?: T) => {
    setPayload({ value: value as T });
    setIsClosing(false);
  }, []);

  const close = useCallback(() => setIsClosing(true), []);

  useEffect(() => {
    if (!isClosing) return;
    const timer = window.setTimeout(
      () => {
        setPayload(null);
        setIsClosing(false);
      },
      // Reduced motion means no exit animation, so there is nothing to wait for.
      prefersReducedMotion() ? 0 : exitMs
    );
    return () => window.clearTimeout(timer);
  }, [isClosing, exitMs]);

  return {
    /** The value passed to `open`, held until the exit has finished. */
    value: payload ? payload.value : null,
    /** Is there a surface to render at all? Stays true through the exit. */
    isPresent: payload !== null,
    /** True only while the exit animation is playing. */
    isClosing,
    open,
    close,
  };
}
