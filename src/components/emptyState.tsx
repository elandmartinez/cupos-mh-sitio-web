import type { ReactNode } from 'react';

type EmptyStateArt = 'products' | 'sales' | 'payments';

interface EmptyStateProps {
  /** Which monochrome illustration to draw. */
  art?: EmptyStateArt;
  /** What the state *is*, never an apology ("Todavía no hay ventas"). */
  title: string;
  /** What to expect and what to do next. */
  body: string;
  /** The single call to action that resolves the empty state, if there is one. */
  action?: ReactNode;
  /**
   * Drop the frame when the empty state already sits inside a surface (a card
   * or a modal), so two boxes never nest.
   */
  plain?: boolean;
}

const ART_PATHS: Record<EmptyStateArt, ReactNode> = {
  products: (
    <>
      <path d="M31 34h34l6 41a4 4 0 0 1-4 4.5H29a4 4 0 0 1-4-4.5l6-41Z" />
      <path d="M38 34v-7a10 10 0 0 1 20 0v7" />
    </>
  ),
  sales: (
    <>
      <path d="M31 17h34v62l-5.5-4.5L54 79l-6-4.5L42 79l-5.5-4.5L31 79V17Z" />
      <path d="M40 34h16M40 45h16" />
    </>
  ),
  payments: (
    <>
      <ellipse cx="48" cy="31" rx="19" ry="7.5" />
      <path d="M29 31v15c0 4.1 8.5 7.5 19 7.5s19-3.4 19-7.5V31" />
      <path d="M29 46v15c0 4.1 8.5 7.5 19 7.5s19-3.4 19-7.5V46" />
    </>
  ),
};

/**
 * UXonFly empty state: a small monochrome illustration, a heading that states
 * the situation, one line of explanation and at most ONE call to action — in
 * that order, always all four in spirit (the CTA only when an action resolves
 * the state). The illustration never exceeds 120px and never carries meaning
 * on its own, so it is decorative and `aria-hidden`.
 */
export default function EmptyState({
  art = 'products',
  title,
  body,
  action,
  plain = false,
}: EmptyStateProps) {
  return (
    <div className={plain ? 'emptyState emptyState--plain' : 'emptyState'}>
      <svg
        className="emptyStateArt"
        viewBox="0 0 96 96"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        focusable="false"
      >
        {ART_PATHS[art]}
      </svg>
      <h3 className="emptyStateTitle">{title}</h3>
      <p className="emptyStateBody">{body}</p>
      {action ? <div className="emptyStateAction">{action}</div> : null}
    </div>
  );
}