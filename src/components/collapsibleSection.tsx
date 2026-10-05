import { useId, useState } from 'react';
import type { ReactNode } from 'react';

interface CollapsibleSectionProps {
  /** Section heading, sentence case (e.g. "Mis ventas"). */
  title: string;
  /** Optional right-aligned one-line summary in the header (e.g. "2 pendientes"). */
  meta?: string;
  /** Sections start expanded; collapsing is an opt-in way to shorten the page. */
  defaultOpen?: boolean;
  children: ReactNode;
}

/**
 * A full-width disclosure region: a heading-styled `<button>` that shows or
 * hides the block under it.
 *
 * It is deliberately **not** a card. The header is a hairline-ruled row on the
 * page background, so the content it wraps (product cards, the sales list)
 * stays the only surface on screen — see "Don't nest cards inside cards" in
 * `DESIGN.md`.
 */
export default function CollapsibleSection({
  title,
  meta,
  defaultOpen = true,
  children,
}: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  // Stable ids so the button can own the heading and the panel it controls.
  const titleId = useId();
  const panelId = useId();

  return (
    <section className="collapsibleSection" aria-labelledby={titleId}>
      <h2 className="collapsibleHeading">
        <button
          type="button"
          className="collapsibleTrigger"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((value) => !value)}
        >
          <span className="collapsibleTitle" id={titleId}>
            {title}
          </span>
          {meta && <span className="collapsibleMeta">{meta}</span>}
          <span className="collapsibleChevron" aria-hidden="true">
            {open ? '▲' : '▼'}
          </span>
        </button>
      </h2>

      {/* Stay mounted so `aria-controls` always resolves; `hidden` hides it. */}
      <div className="collapsibleBody" id={panelId} hidden={!open}>
        {children}
      </div>
    </section>
  );
}
