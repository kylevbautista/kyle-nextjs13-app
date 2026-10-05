"use client";
import { useSyncExternalStore } from "react";
import type { SortMode } from "@/lib/anime/seasonOrder";
import { sortCookieString } from "@/lib/seasonSort";

/**
 * The season page's sort, remembered per browser (lib/seasonSort.ts): the
 * choice made in this tab (module memory, so it survives leaving the season
 * pages for Home and coming back to a page the router fetched earlier in the
 * other order), else the order the page was rendered in, which proxy.ts
 * chose from the kv-season-sort cookie. The live cookie is never read here:
 * a pick in another tab must not re-sort this tab's grid under the reader. It
 * applies to this tab's next fresh page instead.
 */

let memory: SortMode | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** The sort to show: this tab's pick, else the page's own (rendered) order. */
export function useSeasonSort(rendered: SortMode): SortMode {
  return useSyncExternalStore(
    subscribe,
    () => memory ?? rendered,
    () => rendered
  );
}

/**
 * A sort chip: remember it (this tab, and the cookie the proxy reads on the next visit). With
 * cookies blocked the choice still holds in this tab.
 */
export function setSeasonSort(mode: SortMode): void {
  memory = mode;
  try {
    document.cookie = sortCookieString(mode, window.location.protocol === "https:");
  } catch {
    // This tab only.
  }
  listeners.forEach((listener) => listener());
}
