import { describe, expect, it } from "vitest";
import {
  MAX_PAGE,
  MAX_QUERY_LENGTH,
  normalizePage,
  normalizeQuery,
  resultWindow,
  searchResultsPath,
  searchView,
} from "./search";

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
