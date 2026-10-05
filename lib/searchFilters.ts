/**
 * /search's filter tables and rules: which values each ?format=&genre=&year=
 * &season=&release= param accepts, how a URL or form becomes SearchFilters,
 * and the AniList variables they send. Pure. Kept out of lib/search.ts, which
 * the nav search and the landing import, so only /search ships these.
 */
import { isReleaseStatus } from "@/lib/anime/releaseStatus";
import { isSeasonName } from "@/lib/season";
import {
  FILTER_PARAMS,
  SEARCH_PAGE_SIZE,
  firstValue,
  type FilterParam,
  type RawParam,
  type SearchFilters,
} from "@/lib/search";

/** AniList's own browse floor. */
export const MIN_SEARCH_YEAR = 1940;
/** The results box's filter panel (app/search/FilteredSearchConsole.tsx); its selects are `${SEARCH_FILTERS_ID}-${param}`. */
export const SEARCH_FILTERS_ID = "search-filters";

export const SEARCH_FORMATS = [
  { slug: "tv", anilist: "TV" },
  { slug: "tv-short", anilist: "TV_SHORT" },
  { slug: "movie", anilist: "MOVIE" },
  { slug: "special", anilist: "SPECIAL" },
  { slug: "ova", anilist: "OVA" },
  { slug: "ona", anilist: "ONA" },
  { slug: "music", anilist: "MUSIC" },
] as const;

/**
 * AniList's GenreCollection minus "Hentai" (the search never returns adult
 * titles, so offering it would mislead). Hard-coded: fetching it costs a request.
 */
export const SEARCH_GENRES = [
  { slug: "action", anilist: "Action" },
  { slug: "adventure", anilist: "Adventure" },
  { slug: "comedy", anilist: "Comedy" },
  { slug: "drama", anilist: "Drama" },
  { slug: "ecchi", anilist: "Ecchi" },
  { slug: "fantasy", anilist: "Fantasy" },
  { slug: "horror", anilist: "Horror" },
  { slug: "mahou-shoujo", anilist: "Mahou Shoujo" },
  { slug: "mecha", anilist: "Mecha" },
  { slug: "music", anilist: "Music" },
  { slug: "mystery", anilist: "Mystery" },
  { slug: "psychological", anilist: "Psychological" },
  { slug: "romance", anilist: "Romance" },
  { slug: "sci-fi", anilist: "Sci-Fi" },
  { slug: "slice-of-life", anilist: "Slice of Life" },
  { slug: "sports", anilist: "Sports" },
  { slug: "supernatural", anilist: "Supernatural" },
  { slug: "thriller", anilist: "Thriller" },
] as const;

export type SearchFormat = (typeof SEARCH_FORMATS)[number]["slug"];
export type SearchGenre = (typeof SEARCH_GENRES)[number]["slug"];

export type FilterSource = Partial<Record<FilterParam, RawParam | null>>;

/** URLSearchParams or FormData → FilterSource (first value; a File entry reads as null). */
export function readFilterParams(params: { get(name: string): unknown }): FilterSource {
  const source: FilterSource = {};
  for (const param of FILTER_PARAMS) {
    const value = params.get(param);
    source[param] = typeof value === "string" ? value : null;
  }
  return source;
}

/**
 * Each filter matched exactly (case-sensitive, untrimmed: the selects send
 * exactly these values); anything else is null and never reaches AniList.
 * The first value only: an empty first value doesn't fall through.
 * `maxYear`: validYearRange(now).max, from the server.
 */
export function normalizeFilters(source: FilterSource, maxYear: number): SearchFilters {
  const raw = (param: FilterParam) => {
    const value = firstValue(source[param] ?? undefined);
    return typeof value === "string" ? value : null;
  };
  const format = SEARCH_FORMATS.find((entry) => entry.slug === raw("format"))?.slug ?? null;
  const genre = SEARCH_GENRES.find((entry) => entry.slug === raw("genre"))?.slug ?? null;
  const yearText = raw("year");
  const yearValue = yearText !== null && /^\d{4}$/.test(yearText) ? Number(yearText) : null;
  const year = yearValue !== null && yearValue >= MIN_SEARCH_YEAR && yearValue <= maxYear ? yearValue : null;
  const season = raw("season");
  const release = raw("release");
  return {
    format,
    genre,
    year,
    season: isSeasonName(season) ? season : null,
    release: isReleaseStatus(release) ? release : null,
  };
}

/** lib/search.ts#filtersQuery's inverse (runSearch's primitive cache key). */
export const parseFiltersQuery = (query: string, maxYear: number): SearchFilters =>
  normalizeFilters(readFilterParams(new URLSearchParams(query)), maxYear);

/** The year select's options, newest first: maxYear … MIN_SEARCH_YEAR. */
export const searchYearOptions = (maxYear: number): number[] =>
  Array.from({ length: Math.max(0, maxYear - MIN_SEARCH_YEAR + 1) }, (_, index) => maxYear - index);

/**
 * searchAnimeQuery's variables; unset filters are left out (AniList ignores
 * absent variables). Year + season is AniList's season filing (the season
 * pages' own); a year alone is the start date, since AniList gives most music
 * videos and many ONAs no season or seasonYear; a season alone is the season.
 */
export function searchVariables(search: string, page: number, filters: SearchFilters): Record<string, string | number> {
  const variables: Record<string, string | number> = { search, page, perPage: SEARCH_PAGE_SIZE };
  if (filters.format) variables.format = SEARCH_FORMATS.find((entry) => entry.slug === filters.format)!.anilist;
  if (filters.genre) variables.genre = SEARCH_GENRES.find((entry) => entry.slug === filters.genre)!.anilist;
  if (filters.season) {
    variables.season = filters.season.toUpperCase();
    if (filters.year !== null) variables.seasonYear = filters.year;
  } else if (filters.year !== null) {
    // FuzzyDateInt (YYYYMMDD): after Dec 31 of the year before, before the next year's "00000000" day.
    variables.startAfter = (filters.year - 1) * 10000 + 1231;
    variables.startBefore = (filters.year + 1) * 10000;
  }
  if (filters.release) variables.status = filters.release;
  return variables;
}
