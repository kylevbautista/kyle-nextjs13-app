"use client";
import { useEffect } from "react";

/** Space kept between the nav's bottom edge and a nudged control (its focus ring sits outside it). */
const MARGIN = 8;

/** Fixed things (the landing's StickyCta) don't move when the page scrolls, so there is nothing to nudge. */
function insideFixed(element: Element) {
  let node: Element | null = element;
  for (let depth = 0; node && depth < 12; depth++, node = node.parentElement) {
    if (getComputedStyle(node).position === "fixed") return true;
  }
  return false;
}

/**
 * Keeps keyboard focus out from under the sticky nav (WCAG 2.4.11). Shift+Tab makes the browser scroll the newly
 * focused control to the very top of the viewport, under the 64px bar; this scrolls the window back by the overlap.
 * `html { scroll-padding-top }` is not the fix: it makes the page jump whenever a nav link gets focus while scrolled.
 *
 * Only real keyboard focus moves the page: never focus inside the nav or an open dialog, never after a pointer
 * (Chrome matches :focus-visible on a clicked text field), and never when a window or tab regains focus (the browser
 * refocuses the same element, which may have been scrolled far away since). Renders nothing; NavBar
 * mounts it once. The bottom edge is the landing's StickyCta, handled by its scroll-padding-bottom (globals.css).
 */
export default function FocusNudge() {
  useEffect(() => {
    let fromPointer = false;
    let lastFocusOut: EventTarget | null = null;

    const onPointerDown = () => {
      fromPointer = true;
    };
    const onKeyDown = () => {
      fromPointer = false;
    };
    // Remembered only when the whole document lost focus (a window or tab switch). An in-page blur (a click on
    // plain text) clears it, so a later Shift+Tab back to the same control is still nudged.
    const onFocusOut = (event: FocusEvent) => {
      lastFocusOut = document.hasFocus() ? null : event.target;
    };
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target;
      const refocus = event.relatedTarget === null && target === lastFocusOut;
      lastFocusOut = null;
      if (refocus || fromPointer || !(target instanceof Element)) return;
      const nav = document.getElementById("main-nav");
      if (!nav || nav.contains(target) || target.closest("dialog[open]")) return;
      try {
        if (!target.matches(":focus-visible")) return;
      } catch {
        // A browser without :focus-visible: leave the page alone.
        return;
      }
      if (insideFixed(target)) return;
      // The browser's own focus scroll has landed by the next frame, which still runs before paint.
      requestAnimationFrame(() => {
        if (document.activeElement !== target) return;
        const navBottom = nav.getBoundingClientRect().bottom;
        const top = target.getBoundingClientRect().top;
        if (top < navBottom) window.scrollBy({ top: top - navBottom - MARGIN, behavior: "instant" });
      });
    };

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("focusout", onFocusOut, true);
    document.addEventListener("focusin", onFocusIn);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("focusout", onFocusOut, true);
      document.removeEventListener("focusin", onFocusIn);
    };
  }, []);

  return null;
}
