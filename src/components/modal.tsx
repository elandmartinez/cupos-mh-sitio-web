import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

interface ModalProps {
  /** id of the element that names the dialog (must be rendered by `children`). */
  labelledBy: string;
  /** Optional id of the element describing the dialog (e.g. a confirm message). */
  describedBy?: string;
  onClose: () => void;
  /** Extra card class, e.g. "purchasesCard" / "confirmCard". */
  cardClassName?: string;
  children: ReactNode;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Shared modal shell: dialog semantics + Escape to close + backdrop click +
 * a focus trap + focus restore + background scroll lock.
 *
 * Three modals used to each re-implement (and omit) this. They now all render
 * through here, so there is exactly one place to get the behaviour right.
 *
 * Presentation (bottom sheet on mobile, centered card from 640px up) lives in
 * `.modalOverlay` / `.formCard` in src/styles/dashboard.css.
 */
export default function Modal({
  labelledBy,
  describedBy,
  onClose,
  cardClassName,
  children,
}: ModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Remember the trigger so focus can go back to it when the dialog closes.
  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    return () => {
      previouslyFocused.current?.focus?.();
    };
  }, []);

  // Lock background scroll while the dialog is open.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  // Move focus into the dialog on open (first control, else the card itself).
  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const first = card.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    (first ?? card).focus();
  }, []);

  // Escape closes; Tab is trapped inside the dialog.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const card = cardRef.current;
      if (!card) return;

      // Only the topmost dialog reacts, so a confirm dialog opened from inside
      // another modal doesn't have its Escape/Tab handled twice.
      const dialogs = document.querySelectorAll<HTMLElement>('[role="dialog"]');
      if (dialogs[dialogs.length - 1] !== card) return;

      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const items = Array.from(card.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (element) => element.getClientRects().length > 0
      );
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && (active === first || active === card)) {
        event.preventDefault();
        last.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div
        ref={cardRef}
        className={cardClassName ? `formCard ${cardClassName}` : 'formCard'}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
