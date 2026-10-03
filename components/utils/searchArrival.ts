import { useSyncExternalStore } from "react";
import { normalizePage, normalizeQuery, SEARCH_TITLE_ID } from "@/lib/search";

/**
 * /search's arrival focus and its one spoken channel.
 *
 * Focus: Next reuses the /search page across ?q / ?page navigations, but the
 * page keys its results (and the search box) by query and page, so a new
 * search remounts them: the control that started it unmounts and focus falls
 * to <body>. Every control that starts a search leaves a one-shot token here
 * (a form submit; a link's onNavigate, so never a modified click), and the
 * arriving results' SearchArrival takes it: the h1 after a new search, the
 * Results h2 after paging. Like components/animev3/season/seasonFocus.ts, but
 * matched on (query, page), and Back/Forward (popstate) drops it, so only the
 * navigation that left it can take it.
 *
 * Status: app/search/layout.tsx renders the page's one sr-only role="status"
 * (SearchStatus). It persists across searches, so text written into it is
 * announced (a region that mounts with its text often isn't).
 */
export type SearchFocusTarget = "title" | "list";

/**
 * Old tokens (an abandoned navigation) never steal focus later. 30 s: a slow
 * or rate-limited search can take ~29 s (8 s headers + a ≤5 s 429 wait + 8 s
 * headers + 8 s body, server/lib/anilist.ts), and the pending state re-stamps it.
 */
const TOKEN_TTL_MS = 30_000;

let token: { target: SearchFocusTarget; query: string; page: number; at: number } | null = null;

const keyOf = (query: string, page: number) => `${page}\n${query}`;

/** The search /search shows now (from the URL), or null off /search. */
function shownSearch(): string | null {
  if (typeof window === "undefined" || window.location.pathname !== "/search") return null;
  const params = new URLSearchParams(window.location.search);
  return keyOf(normalizeQuery(params.get("q")), normalizePage(params.get("page")));
}

// Back/Forward never takes a token (only the navigation that left it may).
if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    token = null;
  });
}

/**
 * Call from an event handler with the normalized query of the search being
 * started. Returns false, and leaves no token, when that search is already
 * on screen: the URL doesn't change, so nothing arrives to take it (the
 * caller repeats the arrival instead: repeatSearchArrival).
 */
export function rememberSearchFocus(target: SearchFocusTarget, query: string, page: number): boolean {
  if (query && shownSearch() === keyOf(query, page)) {
    token = null;
    return false;
  }
  token = query ? { target, query, page, at: Date.now() } : null;
  return true;
}

const fresh = (query: string, page: number) =>
  token !== null && Date.now() - token.at <= TOKEN_TTL_MS && token.query === query && token.page === page;

/**
 * The pending state: is this a search the reader just started? Doesn't
 * consume the token, but restarts its clock (the wait for AniList starts now).
 */
export function holdSearchFocus(query: string, page: number): boolean {
  if (!fresh(query, page) || !token) return false;
  token = { ...token, at: Date.now() };
  return true;
}

/** The arriving page: the target to focus, once. Every call clears the token. */
export function takeSearchFocus(query: string, page: number): SearchFocusTarget | null {
  const current = token;
  token = null;
  if (!current || Date.now() - current.at > TOKEN_TTL_MS) return null;
  return current.query === query && current.page === page ? current.target : null;
}

type Status = { text: string; count: number };
const EMPTY: Status = { text: "", count: 0 };
let status: Status = EMPTY;
/** The page (query + page) whose outcome the status line holds; null while it holds anything else. */
let spokenFor: string | null = null;
/** The last results page that arrived, and what its outcome says (repeatSearchArrival). */
let lastArrival: { key: string; outcome: string } | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Speak a line through the layout's status region (call from effects and handlers). */
export function announceSearch(text: string): void {
  status = { text, count: status.count + 1 };
  emit();
}

/** "Searching AniList…": no page's outcome any more, so an arrival without a token clears it. */
export function announcePending(text: string): void {
  spokenFor = null;
  announceSearch(text);
}

export function clearSearchStatus(): void {
  spokenFor = null;
  if (status.text === "") return;
  status = { text: "", count: status.count + 1 };
  emit();
}

/**
 * A results page arrived (SearchArrival's effect). With a token for it: the
 * focus target, and its outcome is spoken. Without one (a full load, Back /
 * Forward): null, and the status line empties, so it never holds another
 * page's count. Re-running for the same page (React StrictMode's effect
 * replay) keeps what was said.
 */
export function arriveAtSearch(query: string, page: number, outcome: string): SearchFocusTarget | null {
  const key = keyOf(query, page);
  lastArrival = query ? { key, outcome } : null;
  const target = takeSearchFocus(query, page);
  if (target) {
    announceSearch(outcome);
    spokenFor = key;
  } else if (spokenFor !== key) {
    clearSearchStatus();
  }
  return target;
}

/**
 * The reader searched again for what is already on screen (the same URL, so
 * nothing remounts or arrives): say the outcome again and focus the results
 * h1, as an arrival would. Call from the submit handler.
 */
export function repeatSearchArrival(): void {
  const key = shownSearch();
  if (!lastArrival || lastArrival.key !== key) return;
  announceSearch(lastArrival.outcome);
  spokenFor = key;
  const active = document.activeElement;
  if (!active || active === document.body) document.getElementById(SEARCH_TITLE_ID)?.focus();
}

/** What the status line says now (the store's snapshot). */
export const searchStatusSnapshot = (): Status => status;

export function useSearchStatus(): Status {
  return useSyncExternalStore(subscribe, searchStatusSnapshot, () => EMPTY);
}
