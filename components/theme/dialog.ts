import type { MouseEvent } from "react";

/**
 * ::backdrop clicks target the <dialog> itself, but so do clicks on its own
 * scrollbar, so also require the pointer to be outside the dialog's box.
 * Shared by My List's EditEntryDialog and the anime details sheet.
 */
export const isBackdropEvent = (event: MouseEvent<HTMLDialogElement>) => {
  if (event.target !== event.currentTarget) return false;
  const rect = event.currentTarget.getBoundingClientRect();
  return (
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom
  );
};
