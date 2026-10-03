/**
 * Every line /search prints or speaks, and when (the landing's search chapter
 * shares the constants). Pure and clock-free; the truth sweep in
 * searchCopy.test.ts checks each line against what one AniList response proves.
 *
 * Rules (CLAUDE.md §5.4, §9.19):
 * - Counts come only from the page, the results shown and hasNextPage
 *   (lib/search.ts): an exact total only on the last page, "More than N" /
 *   "More follow" otherwise. AniList's pageInfo.total is false on title search
 *   and isn't even fetched.
 * - The search covers every format but never adult titles
 *   (searchAnimeQuery: isAdult false), so an exact total carries
 *   SEARCH_EXCLUDING and a "none" carries SEARCH_NOTE in the same sentence.
 * - Only page 1 holds the closest results (sort SEARCH_MATCH, then POPULARITY_DESC).
 * - Spoken strings (status, sr-only) never contain "–" or "+".
 * - The Sage line never contains the query (it can be 100 characters); the h1 does.
 */
import { MAX_PAGE, SEARCH_PAGE_SIZE, type ResultWindow, type SearchView } from "@/lib/search";

/* ------------------------------------------------------------------------- */
/* Shared with the landing (components/home/SageSearch.tsx)                    */

export const SEARCH_EYEBROW = "Skill 04 · Great Sage";
export const SEARCH_QUESTION = "What anime are you looking for?";
export const SEARCH_SUB =
  "Search AniList: older seasons, movies, ONAs, and that one show you half-remember from 2009.";
export const SEARCH_FORM_NAME = "Search anime";
export const SEARCH_INPUT_LABEL = "Anime title (English, romaji or native)";
export const SEARCH_PLACEHOLDER = "Try “Frieren” or “Tensura”";
/** The visible word comes first in the name (label-in-name). */
export const SEARCH_SUBMIT = { text: "Analyze", name: "Analyze: search AniList" } as const;
/**
 * The site's Tensura (the placeholder's nickname; AniList finds the franchise), then the owner's
 * examples: romaji titles, a 1998 show, a movie, a 2005 one. Short enough for one row from 640px.
 */
export const SEARCH_EXAMPLES = [
  "Tensura",
  "Sousou no Frieren",
  "Cowboy Bebop",
  "Kimi no Na wa",
  "Mushishi",
] as const;

/* ------------------------------------------------------------------------- */
/* The /search home                                                            */

export const SEARCH_HOME_TITLE = "Search anime";
export const SEARCH_DESCRIPTION =
  "Search AniList for anime from any season and format (older seasons, movies, ONAs) and add it to your list.";
/** The owner's "Just want what's airing? Browse this season." as a console doorway. */
export const SEASON_DOORWAY = {
  line: "Just want what's airing?",
  lead: "This season:",
  text: "the current lineup, with live countdowns to new episodes.",
  link: "Browse this season",
} as const;

/* ------------------------------------------------------------------------- */
/* Scope and fixed lines                                                       */

export const SEARCH_EXCLUDING = "excluding adult titles";
export const SEARCH_NOTE = "This search skips adult titles.";
/** Banner sub on every query state (loading included, so it never moves). */
export const RESULTS_SUB = "Best match first, then by popularity, across every format on AniList.";
export const RESULTS_LABEL = "Results";
export const CAP_NOTE = `Search stops at page ${MAX_PAGE}, and AniList has more. Add a word to narrow it down.`;
/** The pending report's stand-in without JavaScript (results stream in with JavaScript only). */
export const NOSCRIPT_SAGE = "Search results need JavaScript on this site.";
export const NOSCRIPT_TEXT = "AniList's own search works without JavaScript:";

/** AniList's own search for the query: the no-JavaScript way out (results stream in with JavaScript only). */
export const noscriptLink = (query: string): { href: string; text: string } => ({
  href: `https://anilist.co/search/anime?search=${encodeURIComponent(query)}`,
  text: `Search AniList for “${query}”`,
});

export interface SageLineText {
  kind: "Question" | "Report" | "Warning" | "Analyze";
  text: string;
}

/** Deterministic on server and client. */
const fmt = (value: number) => value.toLocaleString("en-US");
/** "31–54" (visible) or "31 to 54" (spoken); one number when from = to. */
const span = (w: ResultWindow, dash: "–" | " to ") =>
  w.from === w.to ? fmt(w.from) : `${fmt(w.from)}${dash}${fmt(w.to)}`;

const pastEndLine = (page: number) => `Nothing on page ${page}. The results end before it.`;

/* ------------------------------------------------------------------------- */
/* Banner line, status, heading, pager                                         */

function resultsLine(w: ResultWindow): string {
  if (w.total !== null) {
    if (w.page > 1) return `${fmt(w.total)} results, ${SEARCH_EXCLUDING}. This is the last page.`;
    return w.total === 1
      ? `The only result, ${SEARCH_EXCLUDING}.`
      : `${fmt(w.total)} results, ${SEARCH_EXCLUDING}. All on this page.`;
  }
  if (w.page === 1) return `More than ${fmt(SEARCH_PAGE_SIZE)} results. The closest come first.`;
  return `Page ${w.page}: results ${span(w, "–")}. ${w.capped ? "Search stops here." : "More follow."}`;
}

/** The banner's Great Sage line for a query state. */
export function searchSageLine(view: SearchView): SageLineText {
  switch (view.kind) {
    case "results":
      return { kind: "Report", text: resultsLine(view.window) };
    case "none":
      return { kind: "Report", text: `No results. ${SEARCH_NOTE}` };
    case "pastEnd":
      return { kind: "Report", text: pastEndLine(view.page) };
    case "error":
      return {
        kind: "Warning",
        text: view.rateLimited ? "AniList's request limit was reached." : "AniList isn't answering right now.",
      };
  }
}

/** Spoken by the layout's status line when a search the reader started arrives. */
export function searchStatus(view: SearchView): string {
  switch (view.kind) {
    case "results": {
      const w = view.window;
      if (w.total !== null && w.page === 1) return resultsLine(w);
      if (w.total !== null) {
        return `Page ${w.page}: results ${span(w, " to ")} of ${fmt(w.total)}, ${SEARCH_EXCLUDING}. This is the last page.`;
      }
      if (w.page === 1) return `More than ${fmt(SEARCH_PAGE_SIZE)} results. Showing ${span(w, " to ")}, the closest first.`;
      return `Page ${w.page}: results ${span(w, " to ")}. ${w.capped ? CAP_NOTE : "More follow."}`;
    }
    case "none":
      return `No results. ${SEARCH_NOTE}`;
    case "pastEnd":
      return pastEndLine(view.page);
    case "error":
      return view.rateLimited
        ? "AniList's request limit was reached. Wait, then try again."
        : "AniList isn't answering right now. Try again in a moment.";
  }
}

/** The Results row's mono count and its spoken suffix ("Results" + ": 31 to 54 of 54"). */
export function resultsHeading(w: ResultWindow): { value: string; spoken: string } {
  if (w.total !== null && w.page === 1) return { value: fmt(w.total), spoken: `: ${fmt(w.total)}` };
  const of = w.total !== null ? ` of ${fmt(w.total)}` : "";
  return { value: `${span(w, "–")}${of}`, spoken: `: ${span(w, " to ")}${of}` };
}

/** The pager's middle cell. "of" only when this page is known to be the last. */
export const pageLabel = (w: ResultWindow) =>
  w.total !== null && w.page > 1 ? `Page ${w.page} of ${w.page}` : `Page ${w.page}`;

export const capNote = (w: ResultWindow) => (w.capped ? CAP_NOTE : null);

/* ------------------------------------------------------------------------- */
/* Panels                                                                      */

export interface PanelCopy {
  title: string;
  text: string;
}

export const noResultsCopy = (query: string): PanelCopy => ({
  title: `No anime found for “${query}”`,
  text: "AniList came back empty-handed, and this search skips adult titles. Check the spelling, try the romaji title (Shingeki no Kyojin for Attack on Titan) or use fewer words.",
});

export const pastEndCopy = (query: string, page: number): PanelCopy => ({
  title: `Nothing on page ${page}`,
  text: `That's past the last page of results for “${query}”.`,
});

/** `retryAfterSeconds`: AniList's Retry-After on the failed 429, when it sent one. */
export function errorCopy(rateLimited: boolean, retryAfterSeconds: number | null): PanelCopy {
  if (!rateLimited) {
    return {
      title: "AniList isn't answering",
      text: "The search couldn't reach AniList just now. It's usually back in a moment.",
    };
  }
  const known =
    retryAfterSeconds !== null &&
    Number.isInteger(retryAfterSeconds) &&
    retryAfterSeconds > 0 &&
    retryAfterSeconds <= 600;
  return {
    title: "AniList needs a breather",
    text: `AniList is limiting this site's requests right now. ${
      known ? `It asked for a ${retryAfterSeconds}-second pause, so try again after that.` : "Wait up to a minute, then try again."
    }`,
  };
}

/* ------------------------------------------------------------------------- */
/* Loading and metadata                                                        */

/** As long as the reports that replace it (so phones don't jump when results land). */
export const loadingSageLine = (page: number): SageLineText => ({
  kind: "Analyze",
  text: page > 1 ? `Fetching page ${page} from AniList…` : "Searching AniList… The closest matches come first.",
});

export const loadingStatus = (query: string, page: number) =>
  page > 1 ? `Fetching page ${page} of the results for “${query}”…` : `Searching AniList for “${query}”…`;

/** The document title as app/layout.tsx's metadata template renders it ("%s · kylevb"); keep the two in step. */
export const searchDocumentTitle = (query: string, page: number) => `${searchMetadata(query, page).title} · kylevb`;

export function searchMetadata(query: string, page: number): { title: string; description: string } {
  if (!query) return { title: SEARCH_HOME_TITLE, description: SEARCH_DESCRIPTION };
  return {
    title: page > 1 ? `Search: ${query} (page ${page})` : `Search: ${query}`,
    description: `AniList results for “${query}”, ${SEARCH_EXCLUDING}.`,
  };
}
