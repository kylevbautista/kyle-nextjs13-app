import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  arriveAtSearch,
  clearSearchStatus,
  holdSearchFocus,
  rememberSearchFocus,
  searchStatusSnapshot,
  takeSearchFocus,
} from "./searchArrival";

const status = () => searchStatusSnapshot().text;

describe("the arrival token", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(Date.UTC(2026, 9, 2, 12));
    takeSearchFocus("", 1);
    clearSearchStatus();
  });
  afterEach(() => vi.useRealTimers());

  it("is taken once, for the same query and page only", () => {
    rememberSearchFocus("title", "frieren", 1);
    expect(takeSearchFocus("frieren", 1)).toBe("title");
    expect(takeSearchFocus("frieren", 1)).toBeNull();

    rememberSearchFocus("list", "gundam", 2);
    // A mismatch clears it: a stale token never fires on a later arrival.
    expect(takeSearchFocus("gundam", 3)).toBeNull();
    expect(takeSearchFocus("gundam", 2)).toBeNull();
  });

  it("expires after 30 s, and loading.tsx restarts the clock without consuming it", () => {
    rememberSearchFocus("title", "slow", 1);
    vi.advanceTimersByTime(20_000);
    expect(holdSearchFocus("slow", 1)).toBe(true);
    vi.advanceTimersByTime(25_000); // 45 s since the submit, 25 s since loading began
    expect(takeSearchFocus("slow", 1)).toBe("title");

    rememberSearchFocus("title", "slow", 1);
    vi.advanceTimersByTime(30_001);
    expect(holdSearchFocus("slow", 1)).toBe(false);
    expect(takeSearchFocus("slow", 1)).toBeNull();
  });

  it("an empty query leaves no token (the /search home)", () => {
    rememberSearchFocus("title", "frieren", 1);
    rememberSearchFocus("title", "", 1);
    expect(takeSearchFocus("frieren", 1)).toBeNull();
  });
});

describe("arriveAtSearch", () => {
  beforeEach(() => {
    takeSearchFocus("", 1);
    clearSearchStatus();
  });

  it("speaks for a reader-started search and keeps it through an effect replay", () => {
    rememberSearchFocus("list", "gundam", 2);
    expect(arriveAtSearch("gundam", 2, "Page 2: results 31 to 54 of 54.")).toBe("list");
    expect(status()).toBe("Page 2: results 31 to 54 of 54.");
    // React StrictMode runs the effect again: no token now, but the same page.
    expect(arriveAtSearch("gundam", 2, "Page 2: results 31 to 54 of 54.")).toBeNull();
    expect(status()).toBe("Page 2: results 31 to 54 of 54.");
  });

  it("empties the status line on an arrival nobody started (Back/Forward, a full load)", () => {
    rememberSearchFocus("list", "gundam", 2);
    arriveAtSearch("gundam", 2, "Page 2.");
    expect(arriveAtSearch("gundam", 1, "Page 1.")).toBeNull();
    expect(status()).toBe("");
  });
});
