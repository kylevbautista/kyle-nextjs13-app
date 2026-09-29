import { describe, expect, it } from "vitest";
import {
  MAX_PAGE,
  MAX_QUERY_LENGTH,
  normalizePage,
  normalizeQuery,
  searchResultsPath,
} from "./searchParams";

describe("normalizeQuery", () => {
  it("returns an empty string when q is missing or blank", () => {
    expect(normalizeQuery(undefined)).toBe("");
    expect(normalizeQuery("   ")).toBe("");
    expect(normalizeQuery([])).toBe("");
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
