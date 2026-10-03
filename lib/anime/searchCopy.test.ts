import { describe, expect, it } from "vitest";
import { searchAnimeQuery } from "@/components/utils/anilist-queries/searchAnimeQuery";
import { MAX_PAGE, SEARCH_PAGE_SIZE, normalizeQuery, searchView, type SearchView } from "@/lib/search";
import {
  CAP_NOTE,
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
    expect(args).not.toMatch(/format/); // "every format" stays true
    // pageInfo asks only what AniList reports truthfully (fact A); total/lastPage can't be printed again.
    const pageInfo = searchAnimeQuery.match(/pageInfo\s*{([^}]*)}/)?.[1] ?? "";
    expect(pageInfo.trim().split(/\s+/).sort()).toEqual(["currentPage", "hasNextPage"]);
  });
});
