import { describe, expect, it } from "vitest";
import { searchAnimeQuery } from "@/components/utils/anilist-queries/searchAnimeQuery";
import {
  MAX_PAGE,
  NO_FILTERS,
  SEARCH_PAGE_SIZE,
  hasFilters,
  normalizeQuery,
  searchView,
  type FilterParam,
  type SearchFilters,
  type SearchView,
} from "@/lib/search";
import { SEARCH_GENRES, normalizeFilters, searchVariables } from "@/lib/searchFilters";
import { RELEASE_STATUSES } from "@/lib/anime/releaseStatus";
import { SEASONS } from "@/lib/season";
import {
  CAP_NOTE,
  CAP_NOTE_WORD,
  SEASON_FILING_NOTE,
  filterReadout,
  filterToggleName,
  resultsSub,
  searchFilterOptions,
  NOSCRIPT_SAGE,
  NOSCRIPT_TEXT,
  RESULTS_SUB,
  SEARCH_SUBMIT,
  SEARCH_DESCRIPTION,
  SEARCH_EXAMPLES,
  SEARCH_EXCLUDING,
  SEARCH_NOTE,
  SEARCH_SUB,
  SEASON_DOORWAY,
  capNote,
  errorCopy,
  loadingSageLine,
  loadingStatus,
  noResultsCopy,
  noscriptLink,
  pageLabel,
  pastEndCopy,
  resultsHeading,
  searchDocumentTitle,
  searchMetadata,
  searchSageLine,
  searchStatus,
} from "./searchCopy";

const results = (page: number, shown: number, hasNextPage: boolean) =>
  searchView({ ok: true, shown, hasNextPage }, page);
const win = (view: SearchView) => {
  if (view.kind !== "results") throw new Error(`expected results, got ${view.kind}`);
  return view.window;
};
const num = (text: string) => Number(text.replace(/,/g, ""));

describe("fact A fixtures (measured on AniList)", () => {
  it("frieren: 6 results, one page", () => {
    const view = results(1, 6, false);
    expect(searchSageLine(view)).toEqual({ kind: "Report", text: "6 results, excluding adult titles. All on this page." });
    expect(resultsHeading(win(view))).toEqual({ value: "6", spoken: ": 6" });
    expect(searchStatus(view)).toBe("6 results, excluding adult titles. All on this page.");
  });

  it("gundam page 1: more pages, so no total (AniList's says 5000)", () => {
    const view = results(1, 30, true);
    expect(searchSageLine(view).text).toBe("More than 30 results. The closest come first.");
    expect(resultsHeading(win(view))).toEqual({ value: "1–30", spoken: ": 1 to 30" });
    expect(pageLabel(win(view))).toBe("Page 1");
    expect(searchStatus(view)).toBe("More than 30 results. Showing 1 to 30, the closest first.");
  });

  it("gundam page 2: the last page, so the total is known", () => {
    const view = results(2, 24, false);
    expect(searchSageLine(view).text).toBe("54 results, excluding adult titles. This is the last page.");
    expect(resultsHeading(win(view))).toEqual({ value: "31–54 of 54", spoken: ": 31 to 54 of 54" });
    expect(pageLabel(win(view))).toBe("Page 2 of 2");
    expect(searchStatus(view)).toBe("Page 2: results 31 to 54 of 54, excluding adult titles. This is the last page.");
  });

  it("gundam page 3, one piece page 50: past the end, never a count", () => {
    for (const page of [3, 50]) {
      const view = results(page, 0, false);
      expect(view).toEqual({ kind: "pastEnd", page });
      expect(searchSageLine(view).text).toBe(`Nothing on page ${page}. The results end before it.`);
    }
    expect(pastEndCopy("gundam", 3)).toEqual({
      title: "Nothing on page 3",
      text: "That's past the last page of results for “gundam”.",
    });
  });

  it("one piece page 2: more follow, and only page 1 claims the closest", () => {
    const view = results(2, 30, true);
    expect(searchSageLine(view).text).toBe("Page 2: results 31–60. More follow.");
    expect(resultsHeading(win(view)).value).toBe("31–60");
    expect(pageLabel(win(view))).toBe("Page 2");
    expect(searchStatus(view)).toBe("Page 2: results 31 to 60. More follow.");
  });

  it("a single result", () => {
    const view = results(1, 1, false);
    expect(searchSageLine(view).text).toBe("The only result, excluding adult titles.");
    expect(resultsHeading(win(view))).toEqual({ value: "1", spoken: ": 1" });
  });

  it("page 50 with more: the cap is said, not hidden", () => {
    const view = results(MAX_PAGE, 30, true);
    expect(searchSageLine(view).text).toBe("Page 50: results 1,471–1,500. Search stops here.");
    expect(capNote(win(view))).toBe(CAP_NOTE);
    expect(win(view).nextPage).toBeNull();
    expect(searchStatus(view)).toBe(`Page 50: results 1,471 to 1,500. ${CAP_NOTE}`);
  });

  it("no results", () => {
    const view = results(1, 0, false);
    expect(searchSageLine(view)).toEqual({ kind: "Report", text: "No results. This search skips adult titles." });
    expect(noResultsCopy("zzqqxxvv").title).toBe("No anime found for “zzqqxxvv”");
  });

  it("errors, with AniList's own Retry-After when it is sane", () => {
    const down = searchView({ ok: false, rateLimited: false, retryAfterSeconds: null }, 1);
    expect(searchSageLine(down)).toEqual({ kind: "Warning", text: "AniList isn't answering right now." });
    const limited = searchView({ ok: false, rateLimited: true, retryAfterSeconds: 30 }, 1);
    expect(searchSageLine(limited)).toEqual({ kind: "Warning", text: "AniList's request limit was reached." });
    expect(errorCopy(true, 30).text).toBe(
      "AniList is limiting this site's requests right now. It asked for a 30-second pause, so try again after that."
    );
    expect(errorCopy(true, null).text).toContain("Wait up to a minute");
    expect(errorCopy(true, 9999).text).toContain("Wait up to a minute");
    expect(errorCopy(true, 2.5).text).toContain("Wait up to a minute");
    expect(errorCopy(false, null).title).toBe("AniList isn't answering");
  });

  it("loading and metadata", () => {
    expect(loadingSageLine(1)).toEqual({ kind: "Analyze", text: "Searching AniList… The closest matches come first." });
    expect(loadingSageLine(3).text).toBe("Fetching page 3 from AniList…");
    expect(loadingStatus("gundam", 1)).toBe("Searching AniList for “gundam”…");
    expect(searchMetadata("", 1).title).toBe("Search anime");
    expect(searchMetadata("gundam", 1).title).toBe("Search: gundam");
    expect(searchMetadata("gundam", 2).title).toBe("Search: gundam (page 2)");
    expect(searchDocumentTitle("gundam", 2)).toBe("Search: gundam (page 2) · kylevb");
    expect(searchDocumentTitle("", 1)).toBe("Search anime · kylevb");
  });
});

describe("truth sweep", () => {
  const PAGES = [1, 2, 3, 49, MAX_PAGE];
  const SHOWN = [0, 1, 6, 24, 29, 30];
  const BANNED = /all of AniList|every anime|any anime|every show|\bTBA\b|AniList (has|lists) no|\bmatches\b|5,?000|\b166\b/i;

  it("every number is proven by the one response", () => {
    for (const page of PAGES) {
      for (const shown of SHOWN) {
        for (const hasNextPage of [true, false]) {
          const view = results(page, shown, hasNextPage);
          const sage = searchSageLine(view).text;
          const status = searchStatus(view);
          const visible = [sage];
          const spoken = [status];

          if (view.kind === "results") {
            const w = view.window;
            const heading = resultsHeading(w);
            visible.push(heading.value, pageLabel(w));
            spoken.push(heading.spoken);
            expect(w.from).toBeLessThanOrEqual(w.to);
            expect(capNote(w) !== null).toBe(page === MAX_PAGE && hasNextPage);

            const moreThan = sage.match(/^More than ([\d,]+) results/);
            if (moreThan) {
              expect(page).toBe(1);
              expect(num(moreThan[1])).toBe(page * SEARCH_PAGE_SIZE);
              expect(num(moreThan[1])).toBeGreaterThanOrEqual(w.to);
            }

            if (hasNextPage) {
              // No exact total, no "last", no "of N" anywhere.
              for (const text of [...visible, ...spoken]) {
                expect(text).not.toMatch(/ of \d|^[\d,]+ results,|^The only|All on this page|last page/);
              }
            } else {
              const total = (page - 1) * SEARCH_PAGE_SIZE + shown;
              expect(w.total).toBe(total);
              if (total === 1) expect(sage).toMatch(/^The only result/);
              else expect(sage.startsWith(total.toLocaleString("en-US"))).toBe(true);
              // An exact total carries the scope in the same sentence (§9.19 analog).
              expect(sage).toContain(SEARCH_EXCLUDING);
              expect(status).toContain(SEARCH_EXCLUDING);
              expect(heading.value.endsWith(total.toLocaleString("en-US"))).toBe(true);
            }
            if (page > 1) for (const text of [...visible, ...spoken]) expect(text).not.toMatch(/closest/);
          } else {
            expect(view.kind).toBe(page === 1 ? "none" : "pastEnd");
            expect(sage).not.toMatch(/\d+ results/);
            if (view.kind === "none") {
              expect(sage).toContain(SEARCH_NOTE);
              expect(status).toContain(SEARCH_NOTE);
            }
          }

          expect(`《Report》 ${sage}`.length).toBeLessThanOrEqual(90);
          for (const text of spoken) expect(text).not.toMatch(/[–+]/);
          for (const text of [...visible, ...spoken]) expect(text).not.toMatch(BANNED);
        }
      }
    }
  });

  it("panels, errors, loading and constants carry the scope and no banned claims", () => {
    const texts = [
      SEARCH_SUB,
      SEARCH_DESCRIPTION,
      RESULTS_SUB,
      CAP_NOTE,
      NOSCRIPT_TEXT,
      NOSCRIPT_SAGE,
      SEASON_DOORWAY.text,
      noResultsCopy("x").title,
      noResultsCopy("x").text,
      pastEndCopy("x", 7).text,
      errorCopy(true, 30).text,
      errorCopy(true, null).text,
      errorCopy(false, null).text,
      loadingStatus("x", 1),
      loadingStatus("x", 4),
      searchMetadata("x", 1).description,
    ];
    for (const text of texts) expect(text).not.toMatch(BANNED);
    expect(noResultsCopy("x").text).toContain("skips adult titles");
    // The rate-limit copy states the 429, never a cause the page can't prove ("you", "visitors").
    for (const seconds of [30, null]) expect(errorCopy(true, seconds).text).not.toMatch(/\byou\b|visitors/i);
    for (const page of [1, 4]) expect(loadingStatus("x", page)).not.toMatch(/[–+]/);
  });

  it("the query never reaches the Sage line; long queries stay in titles", () => {
    const long = "x".repeat(100);
    expect(noResultsCopy(long).title).toContain(long);
    for (const view of [results(1, 0, false), results(2, 0, false), results(1, 30, true)]) {
      expect(searchSageLine(view).text).not.toContain("x".repeat(5));
    }
  });

  it("the submit's name starts with its visible word (label-in-name)", () => {
    expect(SEARCH_SUBMIT.name.startsWith(SEARCH_SUBMIT.text)).toBe(true);
  });

  it("the no-JS way out links to AniList's own search, with the query encoded", () => {
    expect(noscriptLink("a&b").href).toBe("https://anilist.co/search/anime?search=a%26b");
    expect(noscriptLink("a&b").text).toBe("Search AniList for “a&b”");
  });

  it("example chips survive normalization unchanged (the token and the page agree)", () => {
    for (const chip of SEARCH_EXAMPLES) expect(normalizeQuery(chip)).toBe(chip);
  });

  it("the scope copy matches the query", () => {
    const args = searchAnimeQuery.match(/media\(([^)]*)\)/)?.[1] ?? "";
    expect(args).toContain("isAdult: false");
    expect(args).toContain("sort: [SEARCH_MATCH, POPULARITY_DESC]");
    // Filters are variables, never hard-coded values (an unfiltered search still covers every format).
    for (const arg of [
      "format: $format",
      "genre: $genre",
      "season: $season",
      "seasonYear: $seasonYear",
      "startDate_greater: $startAfter",
      "startDate_lesser: $startBefore",
      "status: $status",
    ]) {
      expect(args).toContain(arg);
    }
    expect(args).not.toMatch(/format: [A-Z]/);
    expect(args).not.toMatch(/genre_not_in|Hentai/);
    // pageInfo asks only what AniList reports truthfully (fact A); total/lastPage can't be printed again.
    const pageInfo = searchAnimeQuery.match(/pageInfo\s*{([^}]*)}/)?.[1] ?? "";
    expect(pageInfo.trim().split(/\s+/).sort()).toEqual(["currentPage", "hasNextPage"]);
  });
});

const FULL: SearchFilters = { format: "tv", genre: "fantasy", year: 2026, season: "fall", release: "RELEASING" };
const f = (patch: Partial<SearchFilters>): SearchFilters => ({ ...NO_FILTERS, ...patch });

describe("filtered fixtures", () => {
  it("names every filter in counts and none lines", () => {
    expect(searchSageLine(results(1, 6, false), FULL).text).toBe(
      "6 airing Fantasy TV results from Fall 2026, excluding adult titles. All on this page."
    );
    expect(searchSageLine(results(1, 1, false), f({ format: "movie", year: 1998 })).text).toBe(
      "The only movie result that began in 1998, excluding adult titles."
    );
    expect(searchSageLine(results(2, 24, false), f({ format: "ova", season: "fall" })).text).toBe(
      "54 OVA results from Fall seasons, excluding adult titles. This is the last page."
    );
    expect(searchSageLine(results(1, 30, true), f({ release: "FINISHED", year: 2026 })).text).toBe(
      "More than 30 finished results that began in 2026. The closest come first."
    );
    expect(searchSageLine(results(1, 0, false), f({ format: "movie", year: 1998 })).text).toBe(
      "No movie results that began in 1998. This search skips adult titles."
    );
    expect(searchStatus(results(2, 24, false), f({ format: "tv", year: 2009 }))).toBe(
      "Page 2: 31 to 54 of 54 TV results that began in 2009, excluding adult titles. This is the last page."
    );
    expect(searchStatus(results(1, 30, true), f({ format: "tv", year: 2026 }))).toBe(
      "More than 30 TV results that began in 2026. Showing 1 to 30, the closest first."
    );
    // A position, not a count: unchanged (the sub carries the filters).
    expect(searchSageLine(results(2, 30, true), FULL).text).toBe("Page 2: results 31–60. More follow.");
  });

  it("lists the filters by their labels", () => {
    expect(filterReadout(FULL)).toBe("TV, Fantasy, Fall 2026, Airing");
    expect(filterReadout(f({ season: "fall" }))).toBe("Fall seasons");
    expect(filterReadout(f({ year: 1998 }))).toBe("1998");
    expect(resultsSub(FULL)).toBe("Best match first, then by popularity. Filters: TV, Fantasy, Fall 2026, Airing.");
    expect(resultsSub(NO_FILTERS)).toBe(RESULTS_SUB);
    expect(filterToggleName(0)).toBe("Filters");
    expect(filterToggleName(2)).toBe("Filters, 2 active");
  });

  it("loading, panels and the cap note", () => {
    expect(loadingSageLine(1, FULL).text).toBe(
      "Searching for airing Fantasy TV results from Fall 2026. The closest come first."
    );
    expect(loadingSageLine(3, FULL)).toEqual(loadingSageLine(3));
    expect(loadingStatus("frieren", 1, f({ format: "tv", year: 2026, season: "fall" }))).toBe(
      "Searching AniList for “frieren” (TV, Fall 2026)…"
    );
    expect(noResultsCopy("frieren", f({ format: "movie", year: 1998 })).text).toBe(
      "AniList came back empty-handed with these filters (Movie, 1998), and this search skips adult titles. Check the spelling, or clear the filters."
    );
    expect(noResultsCopy("frieren", f({ format: "music", season: "fall" })).text.endsWith(SEASON_FILING_NOTE)).toBe(true);
    expect(pastEndCopy("frieren", 3, FULL).text).toBe("That's past the last page of results for “frieren” with these filters.");
    const capped = win(results(MAX_PAGE, 30, true));
    expect(capNote(capped)).toBe(CAP_NOTE);
    expect(capNote(capped, f({ format: "tv" }))).toBe(CAP_NOTE);
    const all5: SearchFilters = { format: "music", genre: "slice-of-life", year: 2026, season: "summer", release: "HIATUS" };
    expect(capNote(capped, all5)).toBe(CAP_NOTE_WORD);
    expect(searchStatus(results(MAX_PAGE, 30, true), all5).endsWith(CAP_NOTE_WORD)).toBe(true);
  });
});

describe("filter truth sweep", () => {
  const PAGES = [1, 2, 3, 49, MAX_PAGE];
  const SHOWN = [0, 1, 6, 24, 29, 30];
  const BANNED = /all of AniList|every anime|any anime|every show|\bTBA\b|AniList (has|lists) no|\bmatches\b|5,?000|\b166\b/i;
  // An independent oracle: the words a filter must put in a sentence.
  const FORMAT_WORDS: Record<string, string> = { tv: "TV", "tv-short": "TV short", movie: "movie", special: "special", ova: "OVA", ona: "ONA", music: "music video" };
  const RELEASE_WORDS: Record<string, string> = { RELEASING: "airing", FINISHED: "finished", NOT_YET_RELEASED: "upcoming", HIATUS: "on-hiatus", CANCELLED: "cancelled" };
  const SEASON_WORDS: Record<string, string> = { winter: "Winter", spring: "Spring", summer: "Summer", fall: "Fall" };
  const FILTER_SETS: SearchFilters[] = [
    NO_FILTERS,
    ...["tv", "tv-short", "movie", "special", "ova", "ona", "music"].map((format) => f({ format: format as SearchFilters["format"] })),
    ...SEARCH_GENRES.map(({ slug }) => f({ genre: slug })),
    ...RELEASE_STATUSES.map((release) => f({ release })),
    ...SEASONS.map((season) => f({ season })),
    f({ year: 1998 }),
    f({ year: 2026, season: "fall" }),
    f({ format: "movie", year: 1998 }),
    f({ format: "ova", season: "fall" }),
    f({ format: "music", year: 2026 }),
    FULL,
    { format: "music", genre: "slice-of-life", year: 2026, season: "summer", release: "HIATUS" },
  ];
  const phrases = (filters: SearchFilters) => {
    const out: string[] = [];
    if (filters.format) out.push(FORMAT_WORDS[filters.format]);
    if (filters.genre) out.push(SEARCH_GENRES.find((g) => g.slug === filters.genre)!.anilist);
    if (filters.release) out.push(RELEASE_WORDS[filters.release]);
    if (filters.season && filters.year !== null) out.push(`from ${SEASON_WORDS[filters.season]} ${filters.year}`);
    else if (filters.year !== null) out.push(`that began in ${filters.year}`);
    else if (filters.season) out.push(`from ${SEASON_WORDS[filters.season]} seasons`);
    return out;
  };
  const parts = (filters: SearchFilters) =>
    [filters.format, filters.genre, filters.release, filters.season ?? filters.year].filter((v) => v !== null).length;

  it("every line names exactly what AniList was asked, and nothing else", () => {
    for (const filters of FILTER_SETS) {
      const V = searchVariables("x", 1, filters);
      const expected = phrases(filters);
      const longestPage1: number[] = [];
      for (const page of PAGES) {
        for (const shown of SHOWN) {
          for (const hasNextPage of [true, false]) {
            const view = results(page, shown, hasNextPage);
            const sage = searchSageLine(view, filters).text;
            const status = searchStatus(view, filters);
            const label = `${JSON.stringify(filters)} p${page} n${shown} next=${hasNextPage}`;
            if (!hasFilters(filters)) {
              expect(sage).toBe(searchSageLine(view).text);
              expect(status).toBe(searchStatus(view));
            }
            const exact = view.kind === "results" && view.window.total !== null;
            const page1More = view.kind === "results" && view.window.total === null && page === 1;
            if (exact || page1More || view.kind === "none") {
              for (const phrase of expected) {
                expect(sage, label).toContain(phrase);
                expect(status, label).toContain(phrase);
              }
              // Scope ⇔ variables.
              const fmtWord = filters.format ? FORMAT_WORDS[filters.format] : null;
              expect(Boolean(fmtWord && sage.includes(fmtWord)), label).toBe(Boolean(V.format));
              expect(/ from (Winter|Spring|Summer|Fall) \d{4}/.test(sage), label).toBe(Boolean(V.season && V.seasonYear));
              expect(/ that began in \d{4}/.test(sage), label).toBe(Boolean(V.startAfter && V.startBefore));
              expect(/ from (Winter|Spring|Summer|Fall) seasons/.test(sage), label).toBe(Boolean(V.season && !V.seasonYear));
              if (filters.year !== null && !filters.season) {
                expect(V.startAfter).toBe((filters.year - 1) * 10000 + 1231);
                expect(V.startBefore).toBe((filters.year + 1) * 10000);
              }
              if (page === 1) longestPage1.push(`《Report》 ${sage}`.length);
            }
            if (exact) {
              expect(sage, label).toContain(SEARCH_EXCLUDING);
              expect(status, label).toContain(SEARCH_EXCLUDING);
              const total = (view as { window: { total: number } }).window.total;
              if (total === 1) {
                expect(sage.startsWith("The only"), label).toBe(true);
                expect(sage.split(",")[0], label).not.toMatch(/results/);
              } else {
                expect(sage.startsWith(total.toLocaleString("en-US")), label).toBe(true);
              }
              expect(sage.startsWith("1 "), label).toBe(false);
            } else if (page1More) {
              expect(sage.startsWith("More than 30 "), label).toBe(true);
            } else if (view.kind === "none") {
              expect(sage, label).toContain(SEARCH_NOTE);
              expect(status, label).toContain(SEARCH_NOTE);
            } else if (view.kind === "results") {
              // Page > 1 with more: a position; the capped status differs only by the cap note.
              expect(sage, label).toBe(searchSageLine(view).text);
              if (!view.window.capped) expect(status, label).toBe(searchStatus(view));
            } else {
              expect(sage, label).toBe(searchSageLine(view).text);
              expect(status, label).toBe(searchStatus(view));
            }
            if (page > 1) expect(`${sage} ${status}`, label).not.toMatch(/closest/);
            expect(status, label).not.toMatch(/[–+·]/);
            for (const text of [sage, status]) expect(text, label).not.toMatch(BANNED);
            const cap = parts(filters) <= 1 ? 90 : 125;
            expect(`《Report》 ${sage}`.length, label).toBeLessThanOrEqual(cap);
          }
        }
      }
      const loading = loadingSageLine(1, filters).text;
      expect(`《Analyze》 ${loading}`.length).toBeLessThanOrEqual(parts(filters) <= 1 ? 90 : 125);
      if (hasFilters(filters)) {
        // (The unfiltered loading line keeps its old "matches" wording; the filtered one never says it.)
        expect(loading).not.toMatch(BANNED);
        for (const phrase of expected) expect(loading).toContain(phrase);
        // Close to every page-1 report it can turn into, so phones don't jump when results land.
        for (const shown of [1, 6, 30, 0]) {
          const report = searchSageLine(results(1, shown, shown === 30), filters).text;
          expect(Math.abs(`《Analyze》 ${loading}`.length - `《Report》 ${report}`.length), report).toBeLessThanOrEqual(8);
        }
        expect(longestPage1.length).toBeGreaterThan(0);
      }
      expect(loadingSageLine(3, filters)).toEqual(loadingSageLine(3));
      for (const page of [1, 3]) expect(loadingStatus("q", page, filters)).not.toMatch(/[–+·]/);

      // Sub, panels, cap note.
      const sub = resultsSub(filters);
      expect(sub === RESULTS_SUB).toBe(!hasFilters(filters));
      if (hasFilters(filters)) {
        expect(sub.startsWith("Best match first, then by popularity. Filters: ")).toBe(true);
        expect(sub).not.toMatch(/every format/);
      }
      const none = noResultsCopy("q", filters);
      expect(none.text).toContain("skips adult titles");
      expect(none.title).toBe(noResultsCopy("q").title);
      expect(none.text.includes(SEASON_FILING_NOTE)).toBe(filters.season !== null);
      if (hasFilters(filters)) {
        expect(none.text).toContain(filterReadout(filters));
        expect(none.text).toContain("Check the spelling, or clear the filters.");
        expect(none.text.replace(` ${SEASON_FILING_NOTE}`, "").length).toBeLessThanOrEqual(190);
      }
      expect(pastEndCopy("q", 3, filters).text.includes("with these filters")).toBe(hasFilters(filters));
      const capped = win(results(MAX_PAGE, 30, true));
      const allFive = Object.values(filters).every((v) => v !== null);
      expect(capNote(capped, filters)).toBe(allFive ? CAP_NOTE_WORD : CAP_NOTE);
      expect(capNote(win(results(2, 30, true)), filters)).toBeNull();
    }
  });

  it("every option survives normalization", () => {
    const options = searchFilterOptions(2027);
    for (const param of Object.keys(options) as FilterParam[]) {
      expect(options[param][0].value).toBe("");
      for (const { value } of options[param]) {
        const normalized = normalizeFilters({ [param]: value }, 2027)[param];
        expect(normalized === null ? "" : String(normalized)).toBe(value);
        expect(value).not.toMatch(/hentai/i);
      }
    }
    expect(Object.values(options).map((list) => list[0].label)).toEqual([
      "All formats",
      "All genres",
      "All years",
      "All seasons",
      "Any status",
    ]);
  });
});
