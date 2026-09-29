import { describe, expect, it } from "vitest";
import {
  allSeasonParams,
  currentSeasonPath,
  getCurrentSeason,
  landingSeason,
  seasonForMonth,
  seasonRouteRedirect,
  shiftSeason,
  validYearRange,
} from "./season";

const at = (iso: string) => new Date(iso);

describe("seasonForMonth", () => {
  it("uses the premiere convention: Jan–Mar winter … Oct–Dec fall", () => {
    expect([0, 1, 2].map(seasonForMonth)).toEqual(["winter", "winter", "winter"]);
    expect([3, 4, 5].map(seasonForMonth)).toEqual(["spring", "spring", "spring"]);
    expect([6, 7, 8].map(seasonForMonth)).toEqual(["summer", "summer", "summer"]);
    expect([9, 10, 11].map(seasonForMonth)).toEqual(["fall", "fall", "fall"]);
  });
});

describe("getCurrentSeason / currentSeasonPath", () => {
  it("is computed from the given time (UTC), not frozen", () => {
    expect(getCurrentSeason(at("2026-09-27T12:00:00Z"))).toEqual({ year: 2026, season: "summer" });
    expect(currentSeasonPath(at("2026-10-01T00:00:00Z"))).toBe("/anime/2026/fall");
    expect(currentSeasonPath(at("2026-12-31T23:59:59Z"))).toBe("/anime/2026/fall");
    expect(currentSeasonPath(at("2027-01-01T00:00:00Z"))).toBe("/anime/2027/winter");
  });
});

describe("shiftSeason", () => {
  it("wraps across years in both directions", () => {
    expect(shiftSeason(2026, "fall", 1)).toEqual({ year: 2027, season: "winter" });
    expect(shiftSeason(2026, "winter", -1)).toEqual({ year: 2025, season: "fall" });
    expect(shiftSeason(2026, "spring", 2)).toEqual({ year: 2026, season: "fall" });
    expect(shiftSeason(2026, "spring", -6)).toEqual({ year: 2024, season: "fall" });
  });
});

describe("valid year window", () => {
  const now = at("2026-05-01T00:00:00Z");
  it("spans 5 years back to 1 year ahead", () => {
    expect(validYearRange(now)).toEqual({ min: 2021, max: 2027 });
  });
  it("produces 28 static season params", () => {
    const params = allSeasonParams(now);
    expect(params).toHaveLength(28);
    expect(params[0]).toEqual({ year: 2021, season: "winter" });
    expect(params.at(-1)).toEqual({ year: 2027, season: "fall" });
  });
});

describe("seasonRouteRedirect", () => {
  const now = at("2026-05-01T00:00:00Z");
  it("accepts valid year/season", () => {
    expect(seasonRouteRedirect(["2026", "spring"], now)).toBeNull();
    expect(seasonRouteRedirect(["2021", "winter"], now)).toBeNull();
  });
  it("sends invalid or out-of-range values to the current season", () => {
    expect(seasonRouteRedirect([], now)).toBe("/anime/2026/spring");
    expect(seasonRouteRedirect(["2026"], now)).toBe("/anime/2026/spring");
    expect(seasonRouteRedirect(["abcd", "fall"], now)).toBe("/anime/2026/spring");
    expect(seasonRouteRedirect(["2019", "fall"], now)).toBe("/anime/2026/spring");
    expect(seasonRouteRedirect(["2026", "autumn"], now)).toBe("/anime/2026/spring");
  });
  it("normalizes case and drops extra segments", () => {
    expect(seasonRouteRedirect(["2026", "Fall"], now)).toBe("/anime/2026/fall");
    expect(seasonRouteRedirect(["2026", "fall", "extra"], now)).toBe("/anime/2026/fall");
  });
});

describe("landingSeason", () => {
  it("stays on the current season until the next one is 14 days out", () => {
    expect(landingSeason(at("2026-09-16T23:59:59Z"))).toEqual({
      year: 2026,
      season: "summer",
      preview: false,
      startsAtMs: Date.UTC(2026, 6, 1),
    });
  });

  it("previews the next season from exactly 14 days before it starts", () => {
    expect(landingSeason(at("2026-09-17T00:00:00Z"))).toEqual({
      year: 2026,
      season: "fall",
      preview: true,
      startsAtMs: Date.UTC(2026, 9, 1),
    });
    expect(landingSeason(at("2026-09-29T12:00:00Z"))).toMatchObject({
      year: 2026,
      season: "fall",
      preview: true,
    });
  });

  it("drops preview mode once the season has started", () => {
    expect(landingSeason(at("2026-10-01T00:00:00Z"))).toEqual({
      year: 2026,
      season: "fall",
      preview: false,
      startsAtMs: Date.UTC(2026, 9, 1),
    });
  });

  it("previews across the year boundary", () => {
    expect(landingSeason(at("2026-12-17T23:59:00Z"))).toMatchObject({
      year: 2026,
      season: "fall",
      preview: false,
    });
    expect(landingSeason(at("2026-12-18T00:00:00Z"))).toEqual({
      year: 2027,
      season: "winter",
      preview: true,
      startsAtMs: Date.UTC(2027, 0, 1),
    });
  });
});
