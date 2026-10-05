/**
 * The season page's remembered sort (per browser): a cookie that proxy.ts
 * reads to serve a static variant of the page already in that order, so a
 * returning reader's first paint is right (no reshuffle after hydration, and
 * the page stays static ISR). Pure; shared by proxy.ts, the season route and
 * the client store (components/animev3/season/seasonSortStore.ts).
 *
 * The variant is the internal path /anime/<year>/<season>/<sort> for every
 * sort but the default. It is never addressable from outside: proxy.ts
 * redirects any third segment to the canonical URL before it rewrites.
 */
import { isSeasonName, seasonRouteRedirect, type SeasonName } from "./season";
import type { SortMode } from "./anime/seasonOrder";

/** What a reader without a stored choice gets (the static HTML of the canonical URL). */
export const DEFAULT_SEASON_SORT: SortMode = "popularity";

/** A cookie name can't hold ":" (RFC 6265), so not the site's usual "kv:" storage prefix. */
export const SEASON_SORT_COOKIE = "kv-season-sort";
/** Only the season pages send it. */
export const SEASON_SORT_COOKIE_PATH = "/anime";
/** A year; the proxy re-issues it on every season visit, so it slides. */
export const SEASON_SORT_COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

const SORTS: readonly SortMode[] = ["countdown", "popularity"];

/** A stored or requested sort, exactly as written ("countdown" / "popularity"); anything else is null. */
export const storedSort = (value: string | null | undefined): SortMode | null =>
  SORTS.includes(value as SortMode) ? (value as SortMode) : null;

/** The variant path's segment for a sort: none for the default. */
export const sortVariantSegment = (sort: SortMode): string | null => (sort === DEFAULT_SEASON_SORT ? null : sort);

/**
 * The cookie as document.cookie writes it. Both choices are stored (not deleted on the
 * default), so a reader who picked Popularity keeps it if the default ever changes.
 */
export const sortCookieString = (sort: SortMode, secure: boolean) =>
  `${SEASON_SORT_COOKIE}=${sort}; Path=${SEASON_SORT_COOKIE_PATH}; Max-Age=${SEASON_SORT_COOKIE_MAX_AGE}; SameSite=Lax${
    secure ? "; Secure" : ""
  }`;

/**
 * Whether proxy.ts re-issues the cookie on this request: full page loads only. A client navigation's
 * or prefetch's request can have left before a chip press, and its answer would put the old choice
 * back. Next strips its own RSC headers before the proxy runs, so this reads the browser's: Fetch
 * Metadata where sent, else the document Accept header (Safari before 16.4).
 */
export function renewsSortCookie(headers: { get(name: string): string | null }): boolean {
  const dest = headers.get("sec-fetch-dest");
  if (dest) return dest === "document";
  return (headers.get("accept") ?? "").includes("text/html");
}

/**
 * A season route as the page sees it (after proxy.ts): [year, season] in the default sort, or
 * [year, season, <variant segment>] for a rewritten request (and ISR's background regeneration of
 * that path, which doesn't pass through the proxy). Null for anything else.
 */
export function parseSeasonRoute(
  segments: readonly string[] = [],
  now: Date = new Date()
): { year: number; season: SeasonName; sort: SortMode } | null {
  const [yearParam, seasonParam, variant, ...rest] = segments;
  if (rest.length) return null;
  if (seasonRouteRedirect([yearParam ?? "", seasonParam ?? ""], now) !== null) return null;
  const year = Number(yearParam);
  const season = seasonParam as SeasonName;
  if (variant === undefined) return { year, season, sort: DEFAULT_SEASON_SORT };
  const sort = storedSort(variant);
  return sort && sortVariantSegment(sort) === variant ? { year, season, sort } : null;
}

/** The same shape check without the year window (the season error page; proxy.ts enforced the window). */
export function parseSeasonShape(segments: readonly string[] | string | undefined): { year: number; season: SeasonName } | null {
  const parts = Array.isArray(segments) ? segments : [];
  const [yearParam, seasonParam, variant] = parts;
  if (parts.length < 2 || parts.length > 3 || !/^\d{4}$/.test(yearParam) || !isSeasonName(seasonParam)) return null;
  if (variant !== undefined) {
    const sort = storedSort(variant);
    if (!sort || sortVariantSegment(sort) !== variant) return null;
  }
  return { year: Number(yearParam), season: seasonParam };
}

/**
 * What proxy.ts does with a request to /anime/…: the canonical redirect first (a bare /anime, a bad
 * year, "Fall", any extra segment, a typed variant path), then, for an exact season path whose cookie
 * holds a non-default sort, a rewrite to that sort's static variant.
 */
export function seasonProxyAction(
  segments: readonly string[],
  cookieValue: string | null | undefined,
  now: Date = new Date()
): { redirect: string } | { rewrite: string } | null {
  const target = seasonRouteRedirect([...segments], now);
  if (target) return { redirect: target };
  const sort = storedSort(cookieValue);
  const variant = sort ? sortVariantSegment(sort) : null;
  if (!variant) return null;
  const [year, season] = segments;
  return { rewrite: `/anime/${year}/${season}/${variant}` };
}

