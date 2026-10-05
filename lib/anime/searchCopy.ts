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
 * - Filters (the results box's panel) add their scope to every count and
 *   "none" line ("2 TV results from Fall 2026, excluding adult titles."), and
 *   the sub lists them. With no filters every line is what it always was.
 */
import { RELEASE_STATUSES, RELEASE_STATUS_LABELS, type ReleaseStatus } from "@/lib/anime/releaseStatus";
import {
  MAX_PAGE,
  NO_FILTERS,
  SEARCH_PAGE_SIZE,
  activeFilterCount,
  hasFilters,
  type FilterParam,
  type ResultWindow,
  type SearchFilters,
  type SearchView,
} from "@/lib/search";
import { SEARCH_FORMATS, SEARCH_GENRES, searchYearOptions, type SearchFormat } from "@/lib/searchFilters";
import { SEASONS, SEASON_LABELS } from "@/lib/season";

/* ------------------------------------------------------------------------- */
/* Shared with the landing: lib/anime/searchConsoleCopy.ts (re-exported here)  */

export {
  SEARCH_EXAMPLES,
  SEARCH_EYEBROW,
  SEARCH_FORM_NAME,
  SEARCH_INPUT_LABEL,
  SEARCH_PLACEHOLDER,
  SEARCH_QUESTION,
  SEARCH_SUB,
  SEARCH_SUBMIT,
} from "./searchConsoleCopy";

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
export const CAP_NOTE = `Search stops at page ${MAX_PAGE}, and AniList has more. Add a word or a filter to narrow it down.`;
/** The cap note when every filter is already set ("or a filter" would be impossible advice). */
export const CAP_NOTE_WORD = `Search stops at page ${MAX_PAGE}, and AniList has more. Add a word to narrow it down.`;
/** The pending report's stand-in without JavaScript (results stream in with JavaScript only). */
export const NOSCRIPT_SAGE = "Search results need JavaScript on this site.";
export const NOSCRIPT_TEXT = "AniList's own search works without JavaScript:";

/** AniList's own search for the query: the no-JavaScript way out (results stream in with JavaScript only). */
export const noscriptLink = (query: string): { href: string; text: string } => ({
  href: `https://anilist.co/search/anime?search=${encodeURIComponent(query)}`,
  text: `Search AniList for “${query}”`,
});

/* ------------------------------------------------------------------------- */
/* Filters (the results box's panel: app/search/FilteredSearchConsole.tsx)     */

export const FILTERS_LABEL = "Filters";
export const APPLY_FILTERS = "Apply filters";
export const CLEAR_FILTERS = "Clear filters";
export const FILTER_FIELDS = {
  format: "Format",
  genre: "Genre",
  year: "Year",
  season: "Season",
  release: "Release status",
} as const satisfies Record<FilterParam, string>;
/** My List's "All years", "All seasons", "Any status", and the same pattern for the two new fields. */
export const FILTER_ANY = {
  format: "All formats",
  genre: "All genres",
  year: "All years",
  season: "All seasons",
  release: "Any status",
} as const satisfies Record<FilterParam, string>;
/** Select labels. "Music video", so it can't be confused with the Music genre in the same panel. */
export const FORMAT_LABELS: Record<SearchFormat, string> = {
  tv: "TV",
  "tv-short": "TV Short",
  movie: "Movie",
  special: "Special",
  ova: "OVA",
  ona: "ONA",
  music: "Music video",
};
/** In sentences, before "result". */
const FORMAT_NOUNS: Record<SearchFormat, string> = {
  tv: "TV",
  "tv-short": "TV short",
  movie: "movie",
  special: "special",
  ova: "OVA",
  ona: "ONA",
  music: "music video",
};
/** In sentences, first in the scope. */
const RELEASE_WORDS: Record<ReleaseStatus, string> = {
  RELEASING: "airing",
  FINISHED: "finished",
  NOT_YET_RELEASED: "upcoming",
  HIATUS: "on-hiatus",
  CANCELLED: "cancelled",
};
/** Shown with a season filter: the season is AniList's filing, and some formats have none (rule 8). */
export const SEASON_FILING_NOTE =
  "Season is AniList's filing, the same one the season pages use (their continuing series premiered earlier). AniList gives most music videos and many ONAs no season.";

/** The toggle's accessible name: starts with its visible word. */
export const filterToggleName = (count: number) => (count ? `${FILTERS_LABEL}, ${count} active` : FILTERS_LABEL);

const genreName = (filters: SearchFilters) =>
  filters.genre ? SEARCH_GENRES.find((entry) => entry.slug === filters.genre)!.anilist : null;

/** "Fall 2026" / "2026" / "Fall seasons" (the readout's labels). */
function whenLabel(filters: SearchFilters): string | null {
  const season = filters.season ? SEASON_LABELS[filters.season] : null;
  if (season && filters.year !== null) return `${season} ${filters.year}`;
  if (filters.year !== null) return String(filters.year);
  return season ? `${season} seasons` : null;
}

/** "airing Fantasy TV " + "result(s)" + " from Fall 2026": the filters' scope in a sentence. */
function scope(filters: SearchFilters, plural: boolean): string {
  const pre = [
    filters.release ? RELEASE_WORDS[filters.release] : null,
    genreName(filters),
    filters.format ? FORMAT_NOUNS[filters.format] : null,
  ]
    .filter((part): part is string => part !== null)
    .map((part) => `${part} `)
    .join("");
  // Year + season is AniList's filing ("from Fall 2026"); a year alone is the start date ("that
  // began in 2026"), which can differ for December premieres AniList files under the next winter.
  const when = whenLabel(filters);
  const tail = !when ? "" : filters.year !== null && !filters.season ? ` that began in ${filters.year}` : ` from ${when}`;
  return `${pre}${plural ? "results" : "result"}${tail}`;
}

/** The select labels of the set filters: "TV, Fantasy, Fall 2026, Airing". */
export function filterReadout(filters: SearchFilters): string {
  return [
    filters.format ? FORMAT_LABELS[filters.format] : null,
    genreName(filters),
    whenLabel(filters),
    filters.release ? RELEASE_STATUS_LABELS[filters.release] : null,
  ]
    .filter((part): part is string => part !== null)
    .join(", ");
}

export interface FilterOption {
  value: string;
  label: string;
}

/** Each select's options: "All …" (empty value) first, then the allowed values (lib/search.ts). */
export function searchFilterOptions(maxYear: number): Record<FilterParam, FilterOption[]> {
  const any = (param: FilterParam): FilterOption => ({ value: "", label: FILTER_ANY[param] });
  return {
    format: [any("format"), ...SEARCH_FORMATS.map(({ slug }) => ({ value: slug, label: FORMAT_LABELS[slug] }))],
    genre: [any("genre"), ...SEARCH_GENRES.map(({ slug, anilist }) => ({ value: slug, label: anilist }))],
    year: [any("year"), ...searchYearOptions(maxYear).map((year) => ({ value: String(year), label: String(year) }))],
    season: [any("season"), ...SEASONS.map((season) => ({ value: season, label: SEASON_LABELS[season] }))],
    release: [any("release"), ...RELEASE_STATUSES.map((status) => ({ value: status, label: RELEASE_STATUS_LABELS[status] }))],
  };
}

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

function resultsLine(w: ResultWindow, filters: SearchFilters): string {
  if (w.total !== null) {
    if (w.page > 1) return `${fmt(w.total)} ${scope(filters, true)}, ${SEARCH_EXCLUDING}. This is the last page.`;
    return w.total === 1
      ? `The only ${scope(filters, false)}, ${SEARCH_EXCLUDING}.`
      : `${fmt(w.total)} ${scope(filters, true)}, ${SEARCH_EXCLUDING}. All on this page.`;
  }
  if (w.page === 1) return `More than ${fmt(SEARCH_PAGE_SIZE)} ${scope(filters, true)}. The closest come first.`;
  // A position, not a count: the sub carries the filters.
  return `Page ${w.page}: results ${span(w, "–")}. ${w.capped ? "Search stops here." : "More follow."}`;
}

/** The banner's Great Sage line for a query state. */
export function searchSageLine(view: SearchView, filters: SearchFilters = NO_FILTERS): SageLineText {
  switch (view.kind) {
    case "results":
      return { kind: "Report", text: resultsLine(view.window, filters) };
    case "none":
      return { kind: "Report", text: `No ${scope(filters, true)}. ${SEARCH_NOTE}` };
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
export function searchStatus(view: SearchView, filters: SearchFilters = NO_FILTERS): string {
  switch (view.kind) {
    case "results": {
      const w = view.window;
      if (w.total !== null && w.page === 1) return resultsLine(w, filters);
      if (w.total !== null) {
        return hasFilters(filters)
          ? `Page ${w.page}: ${span(w, " to ")} of ${fmt(w.total)} ${scope(filters, true)}, ${SEARCH_EXCLUDING}. This is the last page.`
          : `Page ${w.page}: results ${span(w, " to ")} of ${fmt(w.total)}, ${SEARCH_EXCLUDING}. This is the last page.`;
      }
      if (w.page === 1) {
        return `More than ${fmt(SEARCH_PAGE_SIZE)} ${scope(filters, true)}. Showing ${span(w, " to ")}, the closest first.`;
      }
      return `Page ${w.page}: results ${span(w, " to ")}. ${capNote(w, filters) ?? "More follow."}`;
    }
    case "none":
      return `No ${scope(filters, true)}. ${SEARCH_NOTE}`;
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

export const capNote = (w: ResultWindow, filters: SearchFilters = NO_FILTERS) =>
  w.capped ? (activeFilterCount(filters) === 5 ? CAP_NOTE_WORD : CAP_NOTE) : null;

/** The banner sub: RESULTS_SUB, or the set filters by their select labels (shown while loading too). */
export const resultsSub = (filters: SearchFilters) =>
  hasFilters(filters) ? `Best match first, then by popularity. Filters: ${filterReadout(filters)}.` : RESULTS_SUB;

/* ------------------------------------------------------------------------- */
/* Panels                                                                      */

export interface PanelCopy {
  title: string;
  text: string;
}

export const noResultsCopy = (query: string, filters: SearchFilters = NO_FILTERS): PanelCopy => ({
  title: `No anime found for “${query}”`,
  text: hasFilters(filters)
    ? `AniList came back empty-handed with these filters (${filterReadout(filters)}), and this search skips adult titles. Check the spelling, or clear the filters.${
        filters.season ? ` ${SEASON_FILING_NOTE}` : ""
      }`
    : "AniList came back empty-handed, and this search skips adult titles. Check the spelling, try the romaji title (Shingeki no Kyojin for Attack on Titan) or use fewer words.",
});

export const pastEndCopy = (query: string, page: number, filters: SearchFilters = NO_FILTERS): PanelCopy => ({
  title: `Nothing on page ${page}`,
  text: `That's past the last page of results for “${query}”${hasFilters(filters) ? " with these filters" : ""}.`,
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
export const loadingSageLine = (page: number, filters: SearchFilters = NO_FILTERS): SageLineText => ({
  kind: "Analyze",
  text:
    page > 1
      ? `Fetching page ${page} from AniList…`
      : hasFilters(filters)
        ? `Searching for ${scope(filters, true)}. The closest come first.`
        : "Searching AniList… The closest matches come first.",
});

export const loadingStatus = (query: string, page: number, filters: SearchFilters = NO_FILTERS) =>
  page > 1
    ? `Fetching page ${page} of the results for “${query}”…`
    : hasFilters(filters)
      ? `Searching AniList for “${query}” (${filterReadout(filters)})…`
      : `Searching AniList for “${query}”…`;

/** The document title as app/layout.tsx's metadata template renders it ("%s · kylevb"); keep the two in step. */
export const searchDocumentTitle = (query: string, page: number) => `${searchMetadata(query, page).title} · kylevb`;

export function searchMetadata(query: string, page: number): { title: string; description: string } {
  if (!query) return { title: SEARCH_HOME_TITLE, description: SEARCH_DESCRIPTION };
  return {
    title: page > 1 ? `Search: ${query} (page ${page})` : `Search: ${query}`,
    description: `AniList results for “${query}”, ${SEARCH_EXCLUDING}.`,
  };
}
