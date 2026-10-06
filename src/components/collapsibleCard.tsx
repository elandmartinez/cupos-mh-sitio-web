import { useId, useState } from 'react';
import { useCollapsiblePanel } from '../hooks/useCollapsiblePanel';
import type { ReactNode } from 'react';

interface CollapsibleCardProps {
  /** The card's heading (plain text or a small block). */
  title: ReactNode;
  /** Optional right-aligned summary shown in the header (a badge, a count…). */
  meta?: ReactNode;
  /** Controls pinned to the end of the header row, outside the toggle button. */
  actions?: ReactNode;
  /** Initial open state when used uncontrolled. Cards start expanded. */
  defaultOpen?: boolean;
  /** Controlled open state. When set, `onToggle` drives every change. */
  open?: boolean;
  /** Called with the *next* open state. Required when `open` is controlled. */
  onToggle?: (open: boolean) => void;
  /** Extra card class for layout tweaks (e.g. "purchaseCard"). */
  className?: string;
  children: ReactNode;
}

/**
 * A card (`DESIGN.md` §6: border-first, 12px radius) whose body folds away
 * behind a header-styled `<button>`.
 *
 * It is the *card* counterpart to `CollapsibleSection`: use this when the
 * disclosure should read as a surface (a thing in a list), and the section when
 * it should read as a page-level heading row. `aria-expanded` / `aria-controls`
 * drive it, and the body stays mounted so the ids always resolve.
 *
 * Works uncontrolled (`defaultOpen`) or controlled (`open` + `onToggle`) — the
 * latter when a parent needs to react to opening (e.g. lazily fetch children).
 */
export default function CollapsibleCard({
  title,
  meta,
  actions,
  defaultOpen = true,
  open,
  onToggle,
  className,
  children,
}: CollapsibleCardProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  // Stable id so the trigger can own the region it controls.
  const bodyId = useId();
  const { ref: bodyRef, hidden } = useCollapsiblePanel(isOpen);

  const handleToggle = () => {
    const next = !isOpen;
    if (!isControlled) setInternalOpen(next);
    onToggle?.(next);
  };

  return (
    <div className={className ? `card collapsibleCard ${className}` : 'card collapsibleCard'}>
      <div className="collapsibleCardHeader">
        <button
          type="button"
          className="collapsibleCardTrigger"
          aria-expanded={isOpen}
          aria-controls={bodyId}
          onClick={handleToggle}
        >
          <span className="collapsibleCardTitle">{title}</span>
          {meta != null && <span className="collapsibleCardMeta">{meta}</span>}
          <span className="collapsibleCardChevron" aria-hidden="true">
            {isOpen ? '▲' : '▼'}
          </span>
        </button>

        {actions != null && <div className="collapsibleCardActions">{actions}</div>}
      </div>

      {/* Stays mounted so `aria-controls` always resolves. A collapsed body
          *rests* `hidden` — `useCollapsiblePanel` lifts it only long enough to
          play the fold, and the padding lives on the inner wrapper so the
          height can animate all the way to flat. */}
      <div className="collapsibleCardBody" id={bodyId} ref={bodyRef} hidden={hidden}>
        <div className="collapsibleCardBodyInner">{children}</div>
      </div>
    </div>
  );
}
