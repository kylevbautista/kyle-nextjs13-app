import { searchPath } from "@/lib/routes";

/**
 * /search's rules and math: query/page normalization, URLs, and what one
 * AniList response proves. Pure; shared by the page, its loading UI, the nav
 * search and the landing's console.
 *
 * AniList's pageInfo lies on title search: "gundam" page 1 reports total 5000
 * and lastPage 166 (it has 54 results), and a page past the end reports
 * total = (page − 1) × 30. hasNextPage is reliable. So the query asks for
 * hasNextPage only, and an exact count exists only on the last page:
 * (page − 1) × 30 + shown. (`shown` counts results after normalizeMedia; it
 * has never dropped a search result, but if it did, a total would be short.)
 */
export const MAX_QUERY_LENGTH = 100;
/** Deep pages are rarely useful and each one costs an AniList request. */
export const MAX_PAGE = 50;
/** Results per AniList request (server/lib/anilist.ts#searchAnime). */
export const SEARCH_PAGE_SIZE = 30;

/** The results h1: arrival focus target and the details sheet's fallback focus. */
export const SEARCH_TITLE_ID = "search-results-title";
/** The Results row's h2: arrival focus target after paging. */
export const SEARCH_LIST_TITLE_ID = "search-list-title";

export type RawParam = string | string[] | undefined;
export type SearchPageParams = Promise<{ q?: RawParam; page?: RawParam }>;

const firstValue = (value: RawParam) => (Array.isArray(value) ? value[0] : value);

/** First `q` value, whitespace-collapsed and trimmed, at most 100 code points; "" when absent. */
export function normalizeQuery(value: RawParam | null): string {
  const raw = firstValue(value ?? undefined);
  if (typeof raw !== "string") return "";
  // Cut by code point: slicing UTF-16 units can split an emoji into a lone
  // surrogate, which makes encodeURIComponent (searchPath) throw.
  return Array.from(raw.replace(/\s+/g, " ").trim())
    .slice(0, MAX_QUERY_LENGTH)
    .join("")
    .trim();
}

/** First `page` value as an integer in [1, MAX_PAGE]; anything unparseable is page 1. */
export function normalizePage(value: RawParam | null): number {
  const raw = firstValue(value ?? undefined)?.trim();
  if (!raw || !/^\d+$/.test(raw)) return 1;
  return Math.min(MAX_PAGE, Math.max(1, Number(raw)));
}

export const searchResultsPath = (query: string, page = 1) =>
  query && page > 1 ? `${searchPath(query)}&page=${page}` : searchPath(query);

/** What one results page proves. */
export interface ResultWindow {
  page: number;
  /** Results on this page. */
  shown: number;
  /** 1-based positions of this page's first and last result. */
  from: number;
  to: number;
  /** Exact only on the last page (hasNextPage false); never AniList's pageInfo.total. */
  total: number | null;
  hasPrevious: boolean;
  /** Where Next goes; null on the last page and at MAX_PAGE. */
  nextPage: number | null;
  /** AniList has more, but MAX_PAGE is the last page this site asks for. */
  capped: boolean;
}

export function resultWindow(page: number, shown: number, hasNextPage: boolean): ResultWindow {
  const before = (page - 1) * SEARCH_PAGE_SIZE;
  const more = hasNextPage && shown > 0;
  return {
    page,
    shown,
    from: before + 1,
    to: before + shown,
    total: more || shown === 0 ? null : before + shown,
    hasPrevious: page > 1,
    nextPage: more && page < MAX_PAGE ? page + 1 : null,
    capped: more && page >= MAX_PAGE,
  };
}

export type SearchOutcome =
  | { ok: true; shown: number; hasNextPage: boolean }
  | { ok: false; rateLimited: boolean; retryAfterSeconds: number | null };

export type SearchView =
  | { kind: "results"; window: ResultWindow }
  | { kind: "none" }
  | { kind: "pastEnd"; page: number }
  | { kind: "error"; rateLimited: boolean; retryAfterSeconds: number | null };

/** One response → the page's state. An empty page 1 is "none"; an empty later page is past the end. */
export function searchView(outcome: SearchOutcome, page: number): SearchView {
  if (!outcome.ok) {
    return { kind: "error", rateLimited: outcome.rateLimited, retryAfterSeconds: outcome.retryAfterSeconds };
  }
  if (outcome.shown === 0) return page > 1 ? { kind: "pastEnd", page } : { kind: "none" };
  return { kind: "results", window: resultWindow(page, outcome.shown, outcome.hasNextPage) };
}
