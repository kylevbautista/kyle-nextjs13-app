import type { MouseEvent } from "react";

/**
 * A plain left click: no modifier keys, not already handled. Handlers that
 * take over a link's click (preventDefault + their own scroll or flow) check
 * it first, so Ctrl/Cmd/Shift-click still opens a new tab or window.
 */
export const isPlainClick = (event: MouseEvent) =>
  !event.defaultPrevented &&
  event.button === 0 &&
  !event.metaKey &&
  !event.ctrlKey &&
  !event.shiftKey &&
  !event.altKey;
