import { describe, expect, it } from "vitest";
import {
  MAX_PAGE,
  MAX_QUERY_LENGTH,
  NO_FILTERS,
  filtersQuery,
  normalizePage,
  normalizeQuery,
  resultWindow,
  searchKey,
  searchResultsPath,
  searchView,
  type SearchFilters,
} from "./search";
import {
  SEARCH_FORMATS,
  SEARCH_GENRES,
  normalizeFilters,
  parseFiltersQuery,
  readFilterParams,
  searchVariables,
  searchYearOptions,
} from "./searchFilters";
import { RELEASE_STATUSES } from "./anime/releaseStatus";
import { SEASONS } from "./season";

describe("normalizeQuery", () => {
  it("returns an empty string when q is missing or blank", () => {
    expect(normalizeQuery(undefined)).toBe("");
    expect(normalizeQuery("   ")).toBe("");
    expect(normalizeQuery([])).toBe("");
    expect(normalizeQuery(null)).toBe("");
  });

  it("uses the first value and trims/collapses whitespace", () => {
    expect(normalizeQuery(["  cowboy   bebop ", "ignored"])).toBe("cowboy bebop");
  });

  it("caps the length", () => {
    const long = "a".repeat(MAX_QUERY_LENGTH + 20);
    expect(normalizeQuery(long)).toHaveLength(MAX_QUERY_LENGTH);
    expect(normalizeQuery(`${"b".repeat(MAX_QUERY_LENGTH - 1)} c`)).toBe(
      "b".repeat(MAX_QUERY_LENGTH - 1)
    );
  });

  it("never splits a surrogate pair at the cap (links must stay encodable)", () => {
    const query = normalizeQuery(`${"a".repeat(MAX_QUERY_LENGTH - 1)}😀😀`);
    expect(query).toBe(`${"a".repeat(MAX_QUERY_LENGTH - 1)}😀`);
    expect(() => searchResultsPath(query, 2)).not.toThrow();
  });
});

describe("normalizePage", () => {
  it("defaults to 1 for missing or invalid values", () => {
    for (const value of [undefined, "", "abc", "-3", "0", "1.5", "1e3", [] as string[]]) {
      expect(normalizePage(value)).toBe(1);
    }
  });

  it("parses integers and clamps to MAX_PAGE", () => {
    expect(normalizePage("7")).toBe(7);
    expect(normalizePage(["3", "9"])).toBe(3);
    expect(normalizePage("51")).toBe(MAX_PAGE);
    expect(normalizePage("99999999999999999999999")).toBe(MAX_PAGE);
  });
});

describe("searchResultsPath", () => {
  it("omits page 1 and encodes the query", () => {
    expect(searchResultsPath("fullmetal & alchemist")).toBe("/search?q=fullmetal%20%26%20alchemist");
    expect(searchResultsPath("frieren", 1)).toBe("/search?q=frieren");
    expect(searchResultsPath("frieren", 3)).toBe("/search?q=frieren&page=3");
  });

  it("never builds a page link without a query", () => {
    expect(searchResultsPath("", 4)).toBe("/search");
  });
});

describe("resultWindow (hasNextPage is the only reliable pageInfo)", () => {
  it("knows the total only on the last page", () => {
    expect(resultWindow(1, 6, false)).toEqual({
      page: 1,
      shown: 6,
      from: 1,
      to: 6,
      total: 6,
      hasPrevious: false,
      nextPage: null,
      capped: false,
    });
    expect(resultWindow(2, 24, false)).toMatchObject({ from: 31, to: 54, total: 54, hasPrevious: true, nextPage: null });
    expect(resultWindow(1, 30, true)).toMatchObject({ from: 1, to: 30, total: null, nextPage: 2, capped: false });
  });

  it("stops at MAX_PAGE and says so", () => {
    expect(resultWindow(MAX_PAGE - 1, 30, true)).toMatchObject({ nextPage: MAX_PAGE, capped: false });
    expect(resultWindow(MAX_PAGE, 30, true)).toMatchObject({ from: 1471, to: 1500, total: null, nextPage: null, capped: true });
    expect(resultWindow(MAX_PAGE, 12, false)).toMatchObject({ total: 1482, capped: false });
  });

  it("never counts an empty page (AniList reports total = (page − 1) × 30 there)", () => {
    expect(resultWindow(3, 0, false).total).toBeNull();
    expect(resultWindow(3, 0, true)).toMatchObject({ total: null, nextPage: null, capped: false });
  });
});

describe("searchView", () => {
  it("classifies one response", () => {
    expect(searchView({ ok: true, shown: 0, hasNextPage: false }, 1)).toEqual({ kind: "none" });
    expect(searchView({ ok: true, shown: 0, hasNextPage: false }, 3)).toEqual({ kind: "pastEnd", page: 3 });
    expect(searchView({ ok: true, shown: 6, hasNextPage: false }, 1)).toEqual({
      kind: "results",
      window: resultWindow(1, 6, false),
    });
    expect(searchView({ ok: false, rateLimited: true, retryAfterSeconds: 30 }, 2)).toEqual({
      kind: "error",
      rateLimited: true,
      retryAfterSeconds: 30,
    });
  });
});

const MAX_YEAR = 2027;
const FULL: SearchFilters = { format: "tv", genre: "slice-of-life", year: 2026, season: "fall", release: "RELEASING" };

describe("normalizeFilters", () => {
  it("keeps every allowed value exactly", () => {
    for (const { slug } of SEARCH_FORMATS) expect(normalizeFilters({ format: slug }, MAX_YEAR).format).toBe(slug);
    for (const { slug } of SEARCH_GENRES) expect(normalizeFilters({ genre: slug }, MAX_YEAR).genre).toBe(slug);
    for (const season of SEASONS) expect(normalizeFilters({ season }, MAX_YEAR).season).toBe(season);
    for (const release of RELEASE_STATUSES) expect(normalizeFilters({ release }, MAX_YEAR).release).toBe(release);
    for (const year of [1940, 2026, 2027]) expect(normalizeFilters({ year: String(year) }, MAX_YEAR).year).toBe(year);
    expect(SEARCH_GENRES).toHaveLength(18);
  });

  it("drops anything else (exact values only, never sent to AniList)", () => {
    const bad = ["TV", " tv", "tv ", "TV_SHORT", "tv_short", "Slice of Life", "slice_of_life", "SLICE-OF-LIFE", "Sci-Fi",
      "manga", "hentai", "Hentai", "FALL", "Fall", "autumn", "airing", "releasing", "paused", "canceled", "",
      "1939", "2028", " 2026", "20x6", "02026", "2026.0", "99999"];
    for (const value of bad) {
      expect(normalizeFilters({ format: value, genre: value, year: value, season: value, release: value }, MAX_YEAR)).toEqual(NO_FILTERS);
    }
  });

  it("takes the first value only, and ignores unknown keys", () => {
    expect(normalizeFilters({ format: ["movie", "tv"] }, MAX_YEAR).format).toBe("movie");
    expect(normalizeFilters({ format: ["", "tv"] }, MAX_YEAR).format).toBeNull();
    expect(normalizeFilters({ sort: "x", utm_source: "y" } as never, MAX_YEAR)).toEqual(NO_FILTERS);
  });

  it("reads URLSearchParams and FormData", () => {
    const source = readFilterParams(new URLSearchParams("format=tv&format=movie&genre="));
    expect(source).toMatchObject({ format: "tv", genre: "" });
    expect(normalizeFilters(source, MAX_YEAR)).toEqual({ ...NO_FILTERS, format: "tv" });
    const data = new FormData();
    data.append("format", new Blob(["tv"]), "file.txt");
    expect(readFilterParams(data).format).toBeNull();
  });
});

describe("filter URLs and keys", () => {
  it("builds canonical URLs", () => {
    expect(searchResultsPath("frieren", 2, FULL)).toBe(
      "/search?q=frieren&format=tv&genre=slice-of-life&year=2026&season=fall&release=RELEASING&page=2"
    );
    expect(searchResultsPath("frieren", 1, { ...NO_FILTERS, year: 1998 })).toBe("/search?q=frieren&year=1998");
    expect(searchResultsPath("", 3, { ...NO_FILTERS, format: "tv" })).toBe("/search");
    expect(searchResultsPath("frieren", 2)).toBe("/search?q=frieren&page=2");
    expect(filtersQuery(NO_FILTERS)).toBe("");
  });

  it("round-trips through the query string and the URL", () => {
    const sets: SearchFilters[] = [
      NO_FILTERS,
      FULL,
      { ...NO_FILTERS, format: "music", year: 2026 },
      { ...NO_FILTERS, season: "winter" },
      { ...NO_FILTERS, genre: "mahou-shoujo", release: "NOT_YET_RELEASED" },
      { ...NO_FILTERS, year: 1940 },
      { format: "tv-short", genre: "sci-fi", year: 2027, season: "summer", release: "HIATUS" },
    ];
    for (const filters of sets) {
      expect(parseFiltersQuery(filtersQuery(filters), MAX_YEAR)).toEqual(filters);
      const url = new URL(searchResultsPath("x", 1, filters), "http://h");
      expect(normalizeFilters(readFilterParams(url.searchParams), MAX_YEAR)).toEqual(filters);
    }
  });

  it("gives every search its own key", () => {
    expect(searchKey("frieren", 1, { ...NO_FILTERS, format: "tv" })).not.toBe(searchKey("frieren", 1, { ...NO_FILTERS, format: "movie" }));
    expect(searchKey("frieren", 1, normalizeFilters({ format: ["tv", "movie"] }, MAX_YEAR))).toBe(
      searchKey("frieren", 1, normalizeFilters({ format: "tv" }, MAX_YEAR))
    );
    expect(searchKey("frieren", 1, normalizeFilters({ format: "TV" }, MAX_YEAR))).toBe(searchKey("frieren", 1));
  });

  it("lists the years newest first", () => {
    const years = searchYearOptions(2027);
    expect(years[0]).toBe(2027);
    expect(years.at(-1)).toBe(1940);
    expect(years).toHaveLength(88);
  });
});

describe("searchVariables", () => {
  it("sends only what is set", () => {
    expect(Object.entries(searchVariables("frieren", 2, NO_FILTERS))).toEqual([
      ["search", "frieren"],
      ["page", 2],
      ["perPage", 30],
    ]);
  });

  it("maps a full set to AniList's spelling", () => {
    expect(searchVariables("x", 1, { format: "tv-short", genre: "slice-of-life", year: 2027, season: "fall", release: "NOT_YET_RELEASED" })).toEqual({
      search: "x",
      page: 1,
      perPage: 30,
      format: "TV_SHORT",
      genre: "Slice of Life",
      season: "FALL",
      seasonYear: 2027,
      status: "NOT_YET_RELEASED",
    });
  });

  it("sends a year alone as the start-date range, and a season alone as the season", () => {
    expect(searchVariables("x", 1, { ...NO_FILTERS, year: 2026 })).toEqual({
      search: "x",
      page: 1,
      perPage: 30,
      startAfter: 20251231,
      startBefore: 20270000,
    });
    expect(searchVariables("x", 1, { ...NO_FILTERS, season: "fall" })).toEqual({ search: "x", page: 1, perPage: 30, season: "FALL" });
  });

  it("never mixes the season filing with the start-date range", () => {
    const seasons = [null, ...SEASONS];
    const years = [null, 1998, 2026];
    for (const season of seasons) {
      for (const year of years) {
        for (const format of [null, "music" as const]) {
          const v = searchVariables("x", 1, { ...NO_FILTERS, season, year, format });
          if ("seasonYear" in v) expect(v.season).toBeDefined();
          if ("startAfter" in v || "startBefore" in v) {
            expect(v.season).toBeUndefined();
            expect("startAfter" in v && "startBefore" in v).toBe(true);
          }
          for (const value of Object.values(v)) {
            expect(value).not.toBeNull();
            expect(value).not.toBeUndefined();
            expect(value).not.toBe("Hentai");
          }
        }
      }
    }
  });
});
