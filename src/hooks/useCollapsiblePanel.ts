import { useEffect, useRef, useState } from 'react';

/* Bookends for the fold. Slightly slower opening than closing, so the panel
   feels like it is being *revealed* rather than shoved out. */
const EXPAND_MS = 200;
const COLLAPSE_MS = 160;
const EASING = 'cubic-bezier(0.2, 0.8, 0.2, 1)';

/**
 * Animates a disclosure panel open and closed while keeping `hidden` as its
 * *resting* state.
 *
 * `DESIGN.md` §4 requires a collapsed panel to be `hidden` — that is what takes
 * it out of the accessibility tree and the tab order — and `display: none`
 * cannot be transitioned. So the panel only leaves `hidden` in order to
 * animate, and goes back to it the moment the fold is flat. The height is
 * measured and animated with the Web Animations API; there is no CSS property
 * here to hang a transition on.
 *
 * Spread `ref` onto the panel and pass `hidden` to the `hidden` attribute. The
 * element needs `overflow: hidden` and no padding of its own — wrap the padded
 * content in a child (see `.collapsibleBodyInner` in theme.css).
 */
export function useCollapsiblePanel(open: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  const [hidden, setHidden] = useState(!open);
  // Seeded with the initial value, which also makes the effect a no-op when
  // React replays it on mount (StrictMode) — that replay is not a toggle.
  const wasOpen = useRef(open);

  useEffect(() => {
    const panel = ref.current;
    if (!panel || wasOpen.current === open) return;
    wasOpen.current = open;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (open) {
      setHidden(false);
      if (reducedMotion) return;

      // The state update above has not been committed yet, so at this instant
      // the panel is still `display: none` and would measure as zero. Un-hide it
      // by hand — the pending render agrees with this — then measure for real.
      panel.hidden = false;
      const running = panel.animate(
        [
          { height: '0px', opacity: 0 },
          { height: `${panel.scrollHeight}px`, opacity: 1 },
        ],
        { duration: EXPAND_MS, easing: EASING }
      );
      return () => running.cancel();
    }

    if (reducedMotion) {
      setHidden(true);
      return;
    }

    // Collapsing is measured from the panel as it stands — it is still visible
    // from the previous render. `forwards` holds the flattened frame until
    // `hidden` lands, so the panel cannot flash back to full height for a frame.
    const running = panel.animate(
      [
        { height: `${panel.scrollHeight}px`, opacity: 1 },
        { height: '0px', opacity: 0 },
      ],
      { duration: COLLAPSE_MS, easing: EASING, fill: 'forwards' }
    );
    running.onfinish = () => setHidden(true);
    return () => running.cancel();
  }, [open]);

  return { ref, hidden };
}
