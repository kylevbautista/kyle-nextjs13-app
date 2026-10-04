"use client";
import Link from "next/link";
import type { MouseEvent } from "react";
import { MAIN_CONTENT_ID, NAV_SKIP_LINK } from "@/components/theme/tokens";

/**
 * Focuses `element` for a skip, making it focusable just for as long as it holds focus: a permanent tabIndex on a
 * page's <main> would make Next focus it after every navigation (CLAUDE.md §9.15). False if focus didn't move
 * (e.g. the element is still inside a hidden streamed boundary).
 */
function focusForSkip(element: HTMLElement) {
  const added = !element.hasAttribute("tabindex");
  if (added) element.setAttribute("tabindex", "-1");
  element.focus({ preventScroll: true });
  const focused = document.activeElement === element;
  if (added) {
    if (!focused) {
      element.removeAttribute("tabindex");
    } else {
      const done = new AbortController();
      const drop = () => {
        element.removeAttribute("tabindex");
        done.abort();
      };
      element.addEventListener("blur", drop, { signal: done.signal });
      // Also on the next press, before the click's own focus step: while focusable, the element is the nearest focusable
      // ancestor of everything in it, so a click on its text would keep it focused and pin the next Tab to its start.
      document.addEventListener("pointerdown", drop, { capture: true, signal: done.signal });
    }
  }
  return focused;
}

/**
 * "Skip to content" (WCAG 2.4.1), the first Tab stop on every page (except one that autofocuses its own control, like
 * the /search home). Without JavaScript it is a fragment link to MAIN_CONTENT_ID, the span right after the nav: the
 * next Tab is the page's first control. With JavaScript a plain activation never navigates (no URL change, no history
 * entry, so Back is untouched): it focuses the page's <main> landmark (every route has one, loading skeletons included;
 * that span is the fallback) and scrolls back to it if the page was scrolled past it.
 */
export default function SkipLink() {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    // Before next/link's own handler, which then skips its navigation (it checks defaultPrevented).
    event.preventDefault();
    const main = document.querySelector("main");
    const fallback = document.getElementById(MAIN_CONTENT_ID);
    const target = main && focusForSkip(main) ? main : fallback && focusForSkip(fallback) ? fallback : null;
    if (!target) return;
    const navBottom = document.getElementById("main-nav")?.getBoundingClientRect().bottom ?? 0;
    const top = target.getBoundingClientRect().top + window.scrollY - navBottom;
    if (window.scrollY > top) window.scrollTo({ top: Math.max(0, top), behavior: "instant" });
  };

  return (
    // prefetch={false}: a hash link would prefetch the URL the nav first mounted on (it never remounts), maybe bare /search.
    <Link href={`#${MAIN_CONTENT_ID}`} prefetch={false} onClick={handleClick} className={NAV_SKIP_LINK}>
      Skip to content
    </Link>
  );
}
