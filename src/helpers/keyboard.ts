import type { KeyboardEvent } from 'react';

/**
 * Keyboard activation for a semantic container used as a `role="button"` (a
 * real `<button>` can't hold `<div>`/`<p>` children). Mirrors a button: Enter
 * and Space both activate, and Space does not scroll the page.
 */
export function activateOnEnterOrSpace(event: KeyboardEvent<HTMLElement>): void {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    event.currentTarget.click();
  }
}
