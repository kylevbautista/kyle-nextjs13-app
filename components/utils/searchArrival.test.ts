import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NO_FILTERS, searchKey, type SearchFilters } from "@/lib/search";
import {
  arriveAtSearch,
  clearSearchStatus,
  holdSearchFocus,
  rememberSearchFocus,
  rememberSearchKey,
  repeatSearchArrival,
  searchStatusSnapshot,
  takeSearchFocus,
} from "./searchArrival";

const status = () => searchStatusSnapshot().text;
const K = (query: string, page: number, filters?: SearchFilters) => searchKey(query, page, filters);
const tv: SearchFilters = { ...NO_FILTERS, format: "tv" };

describe("the arrival token", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(Date.UTC(2026, 9, 2, 12));
    takeSearchFocus("");
    clearSearchStatus();
  });
  afterEach(() => vi.useRealTimers());

  it("is taken once, for the same search only", () => {
    rememberSearchFocus("title", "frieren", 1);
    expect(takeSearchFocus(K("frieren", 1))).toBe("title");
    expect(takeSearchFocus(K("frieren", 1))).toBeNull();

    rememberSearchFocus("list", "gundam", 2);
    // A mismatch clears it: a stale token never fires on a later arrival.
    expect(takeSearchFocus(K("gundam", 3))).toBeNull();
    expect(takeSearchFocus(K("gundam", 2))).toBeNull();
  });

  it("expires after 30 s, and the pending state restarts the clock without consuming it", () => {
    rememberSearchFocus("title", "slow", 1);
    vi.advanceTimersByTime(20_000);
    expect(holdSearchFocus(K("slow", 1))).toBe(true);
    vi.advanceTimersByTime(25_000); // 45 s since the submit, 25 s since loading began
    expect(takeSearchFocus(K("slow", 1))).toBe("title");

    rememberSearchFocus("title", "slow", 1);
    vi.advanceTimersByTime(30_001);
    expect(holdSearchFocus(K("slow", 1))).toBe(false);
    expect(takeSearchFocus(K("slow", 1))).toBeNull();
  });

  it("an empty query leaves no token (the /search home)", () => {
    rememberSearchFocus("title", "frieren", 1);
    rememberSearchFocus("title", "", 1);
    expect(takeSearchFocus(K("frieren", 1))).toBeNull();
    rememberSearchFocus("title", "frieren", 1);
    rememberSearchKey("title", "/search");
    expect(takeSearchFocus(K("frieren", 1))).toBeNull();
  });

  it("matches the filters too", () => {
    rememberSearchFocus("title", "frieren", 1, tv);
    expect(takeSearchFocus(K("frieren", 1))).toBeNull();
    rememberSearchFocus("title", "frieren", 1, tv);
    expect(takeSearchFocus(K("frieren", 1, tv))).toBe("title");
    rememberSearchFocus("title", "frieren", 1, tv);
    expect(holdSearchFocus(K("frieren", 1))).toBe(false);
    rememberSearchFocus("title", "frieren", 1, tv);
    expect(holdSearchFocus(K("frieren", 1, tv))).toBe(true);
    // The key API and the query API leave the same token.
    rememberSearchKey("title", K("frieren", 1, tv));
    expect(takeSearchFocus("/search?q=frieren&format=tv")).toBe("title");
  });
});

describe("arriveAtSearch", () => {
  beforeEach(() => {
    takeSearchFocus("");
    clearSearchStatus();
  });

  it("speaks for a reader-started search and keeps it through an effect replay", () => {
    rememberSearchFocus("list", "gundam", 2);
    expect(arriveAtSearch(K("gundam", 2), "Page 2: results 31 to 54 of 54.")).toBe("list");
    expect(status()).toBe("Page 2: results 31 to 54 of 54.");
    // React StrictMode runs the effect again: no token now, but the same page.
    expect(arriveAtSearch(K("gundam", 2), "Page 2: results 31 to 54 of 54.")).toBeNull();
    expect(status()).toBe("Page 2: results 31 to 54 of 54.");
  });

  it("empties the status line on an arrival nobody started (Back/Forward, a full load)", () => {
    rememberSearchFocus("list", "gundam", 2);
    arriveAtSearch(K("gundam", 2), "Page 2.");
    expect(arriveAtSearch(K("gundam", 1), "Page 1.")).toBeNull();
    expect(status()).toBe("");
  });
});

describe("the search on screen", () => {
  const stubPage = (pathname: string, search: string) => {
    vi.stubGlobal("window", { location: { pathname, search } });
    vi.stubGlobal("document", { activeElement: null, getElementById: () => null, body: {} });
  };
  beforeEach(() => {
    takeSearchFocus("");
    clearSearchStatus();
  });
  afterEach(() => vi.unstubAllGlobals());

  it("repeats the outcome for the same search, filters included", () => {
    stubPage("/search", "?q=frieren&format=tv");
    arriveAtSearch(K("frieren", 1, tv), "2 TV results, excluding adult titles. All on this page.");
    const before = searchStatusSnapshot().count;
    expect(rememberSearchFocus("title", "frieren", 1, tv)).toBe(false);
    expect(takeSearchFocus(K("frieren", 1, tv))).toBeNull();
    repeatSearchArrival();
    expect(searchStatusSnapshot().count).toBe(before + 1);
    expect(status()).toBe("2 TV results, excluding adult titles. All on this page.");
    expect(rememberSearchFocus("title", "frieren", 1)).toBe(true);
  });

  it("uses the server's key, not the URL (a param the server dropped)", () => {
    stubPage("/search", "?q=frieren&year=2099");
    arriveAtSearch(K("frieren", 1), "6 results, excluding adult titles. All on this page.");
    const before = searchStatusSnapshot().count;
    expect(rememberSearchKey("title", K("frieren", 1))).toBe(false);
    repeatSearchArrival();
    expect(searchStatusSnapshot().count).toBe(before + 1);
  });

  it("keeps a token for a search still loading (searched again before it arrived)", () => {
    stubPage("/search", "?q=gundam");
    expect(holdSearchFocus(K("gundam", 1))).toBe(false);
    expect(rememberSearchFocus("title", "gundam", 1)).toBe(true);
    expect(arriveAtSearch(K("gundam", 1), "More than 30 results.")).toBe("title");
    expect(status()).toBe("More than 30 results.");
    // Arrived: now the same search again repeats the outcome.
    expect(rememberSearchFocus("title", "gundam", 1)).toBe(false);
  });

  it("ignores the last search off /search", () => {
    stubPage("/anime", "");
    arriveAtSearch(K("frieren", 1), "6 results.");
    expect(rememberSearchFocus("title", "frieren", 1)).toBe(true);
  });
});
