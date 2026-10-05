import { describe, expect, it } from "vitest";
import {
  DEFAULT_SEASON_SORT,
  parseSeasonRoute,
  parseSeasonShape,
  renewsSortCookie,
  seasonProxyAction,
  sortCookieString,
  sortVariantSegment,
  storedSort,
} from "./seasonSort";

const NOW = new Date(Date.UTC(2026, 9, 5, 12)); // Fall 2026: valid years 2021–2027

describe("the stored value", () => {
  it("is exactly a sort name", () => {
    expect(storedSort("countdown")).toBe("countdown");
    expect(storedSort("popularity")).toBe("popularity");
    for (const value of ["Countdown", "", " countdown", "relevance", null, undefined]) expect(storedSort(value)).toBeNull();
  });

  it("has a variant only for the non-default sort", () => {
    expect(DEFAULT_SEASON_SORT).toBe("popularity");
    expect(sortVariantSegment("popularity")).toBeNull();
    expect(sortVariantSegment("countdown")).toBe("countdown");
  });

  it("is a first-party cookie on the season pages, kept for a year, both choices stored", () => {
    expect(sortCookieString("countdown", false)).toBe("kv-season-sort=countdown; Path=/anime; Max-Age=31536000; SameSite=Lax");
    expect(sortCookieString("popularity", true)).toBe("kv-season-sort=popularity; Path=/anime; Max-Age=31536000; SameSite=Lax; Secure");
  });

  it("is re-issued on full page loads only, never on a client navigation or prefetch", () => {
    const req = (headers: Record<string, string>) => new Headers(headers);
    // Chrome / Firefox / Safari 16.4+: Fetch Metadata.
    expect(renewsSortCookie(req({ "sec-fetch-dest": "document", accept: "text/html,application/xhtml+xml" }))).toBe(true);
    expect(renewsSortCookie(req({ "sec-fetch-dest": "empty", accept: "*/*" }))).toBe(false);
    expect(renewsSortCookie(req({ "sec-fetch-dest": "iframe", accept: "text/html" }))).toBe(false);
    // Older Safari: no Fetch Metadata, so the document's Accept header.
    expect(renewsSortCookie(req({ accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" }))).toBe(true);
    expect(renewsSortCookie(req({ accept: "*/*" }))).toBe(false);
    expect(renewsSortCookie(req({}))).toBe(false);
  });
});

describe("parseSeasonRoute (the page, after the proxy)", () => {
  it("reads the canonical path as the default sort, and the variant as its sort", () => {
    expect(parseSeasonRoute(["2026", "fall"], NOW)).toEqual({ year: 2026, season: "fall", sort: "popularity" });
    expect(parseSeasonRoute(["2026", "fall", "countdown"], NOW)).toEqual({ year: 2026, season: "fall", sort: "countdown" });
  });

  it("rejects anything the proxy wouldn't produce", () => {
    for (const segments of [
      ["2026", "fall", "popularity"], // the default has no variant path
      ["2026", "fall", "Countdown"],
      ["2026", "fall", "countdown", "x"],
      ["2026", "Fall"],
      ["2026", "fall", ""],
      ["2019", "fall"], // outside the year window
      ["2019", "fall", "countdown"],
      ["2026"],
      [],
    ]) {
      expect(parseSeasonRoute(segments, NOW), segments.join("/")).toBeNull();
    }
  });
});

describe("parseSeasonShape (the error page's params)", () => {
  it("accepts the canonical path and the variant", () => {
    expect(parseSeasonShape(["2026", "fall"])).toEqual({ year: 2026, season: "fall" });
    expect(parseSeasonShape(["2026", "fall", "countdown"])).toEqual({ year: 2026, season: "fall" });
    expect(parseSeasonShape(["2026", "fall", "popularity"])).toBeNull();
    expect(parseSeasonShape(["2026", "Fall"])).toBeNull();
    expect(parseSeasonShape("2026")).toBeNull();
    expect(parseSeasonShape(undefined)).toBeNull();
  });
});

describe("seasonProxyAction", () => {
  it("serves the remembered sort's variant for an exact season path", () => {
    expect(seasonProxyAction(["2026", "fall"], "countdown", NOW)).toEqual({ rewrite: "/anime/2026/fall/countdown" });
  });

  it("leaves the canonical page alone without a non-default choice", () => {
    for (const cookie of [null, undefined, "popularity", "garbage", ""]) {
      expect(seasonProxyAction(["2026", "fall"], cookie, NOW)).toBeNull();
    }
  });

  it("redirects first, with or without the cookie, so the variant is never addressable (no loop)", () => {
    for (const cookie of [null, "countdown"]) {
      expect(seasonProxyAction([], cookie, NOW)).toEqual({ redirect: "/anime/2026/fall" });
      expect(seasonProxyAction(["2026"], cookie, NOW)).toEqual({ redirect: "/anime/2026/fall" });
      expect(seasonProxyAction(["2026", "Fall"], cookie, NOW)).toEqual({ redirect: "/anime/2026/fall" });
      expect(seasonProxyAction(["2019", "fall"], cookie, NOW)).toEqual({ redirect: "/anime/2026/fall" });
      expect(seasonProxyAction(["2026", "fall", "countdown"], cookie, NOW)).toEqual({ redirect: "/anime/2026/fall" });
    }
    // The redirect target, requested again with the cookie, is rewritten, never redirected.
    expect(seasonProxyAction(["2026", "fall"], "countdown", NOW)).not.toHaveProperty("redirect");
  });
});
