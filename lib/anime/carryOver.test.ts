import { describe, expect, it } from "vitest";
import { airsDuring, estimatedEndMs, selectCarryOver } from "./carryOver";
import { normalizeMedia } from "./normalize";
import { seasonStartMs, toFuzzyDateInt } from "../season";
import type { AnimeMedia } from "./types";

const DAY = 24 * 60 * 60 * 1000;
const WEEK = 7 * DAY;
const FALL_2026 = seasonStartMs(2026, "fall"); // 2026-10-01
const WINTER_2027 = seasonStartMs(2027, "winter"); // 2027-01-01 (end of fall)
const SPRING_2027 = seasonStartMs(2027, "spring");
const FALL = { season: "FALL", year: 2026 };
const WINTER = { season: "WINTER", year: 2027 };

const show = (
  id: number,
  {
    start = [2026, 7, 5] as [number, number, number],
    episodes = 12 as number | null,
    status = "RELEASING",
    popularity = 1000,
    nextAt = null as number | null,
    nextEpisode = null as number | null,
    season = null as string | null,
    seasonYear = null as number | null,
  } = {}
): AnimeMedia =>
  normalizeMedia({
    id,
    title: { romaji: `Show ${id}` },
    status,
    episodes,
    popularity,
    season,
    seasonYear,
    startDate: { year: start[0], month: start[1], day: start[2] },
    upComingAirDate: {
      episode: nextAt ? [{ airingAt: Math.floor(nextAt / 1000), episode: nextEpisode }] : [],
    },
  })!;

describe("season date helpers", () => {
  it("encodes season starts and AniList fuzzy dates", () => {
    expect(new Date(FALL_2026).toISOString()).toBe("2026-10-01T00:00:00.000Z");
    expect(new Date(WINTER_2027).toISOString()).toBe("2027-01-01T00:00:00.000Z");
    expect(toFuzzyDateInt(FALL_2026)).toBe(20261001);
    expect(toFuzzyDateInt(FALL_2026 - DAY)).toBe(20260930);
  });
});

describe("estimatedEndMs / airsDuring (seasons that haven't started)", () => {
  it("treats a show far into its run or airing for 6+ months as a long runner", () => {
    const onePiece = show(21, { start: [1999, 10, 20], episodes: null, nextAt: FALL_2026 - WEEK, nextEpisode: 1181 });
    expect(estimatedEndMs(onePiece, WINTER_2027)).toBe(Number.POSITIVE_INFINITY);
    const kidsShow = show(30, { start: [2025, 4, 1], episodes: null, nextAt: FALL_2026 - WEEK, nextEpisode: 20 });
    expect(airsDuring(kidsShow, WINTER_2027, SPRING_2027)).toBe(true);
  });

  it("assumes one cour for a brand-new show with no announced episode count", () => {
    // Premiered a week before fall; with 13 episodes it ends in December, before winter.
    const premiere = show(185756, {
      start: [2026, 9, 27],
      episodes: null,
      nextAt: FALL_2026 + 3 * DAY,
      nextEpisode: 2,
    });
    expect(airsDuring(premiere, WINTER_2027, SPRING_2027)).toBe(false);
    // …but it does air into fall.
    expect(airsDuring(premiere, FALL_2026, WINTER_2027)).toBe(true);
  });

  it("estimates the last episode one week at a time", () => {
    const nextAt = FALL_2026 - 14 * DAY; // episode 10 airs two weeks before the season
    expect(airsDuring(show(1, { episodes: 12, nextAt, nextEpisode: 10 }), FALL_2026, WINTER_2027)).toBe(true);
    expect(airsDuring(show(2, { episodes: 11, nextAt, nextEpisode: 10 }), FALL_2026, WINTER_2027)).toBe(false);
  });

  it("drops shows whose next episode only comes after the whole season (a break)", () => {
    const onBreak = show(21, { start: [1999, 10, 20], episodes: null, nextAt: WINTER_2027 + WEEK, nextEpisode: 1200 });
    expect(airsDuring(onBreak, FALL_2026, WINTER_2027)).toBe(false);
  });

  it("drops shows with a known episode count but nothing to estimate from", () => {
    const noDates = normalizeMedia({ id: 3, title: { romaji: "x" }, episodes: 12, status: "RELEASING" })!;
    expect(airsDuring(noDates, FALL_2026, WINTER_2027)).toBe(false);
  });
});

describe("selectCarryOver", () => {
  const onePiece = show(21, { start: [1999, 10, 20], episodes: null, popularity: 900_000, nextAt: FALL_2026 + 2 * DAY, nextEpisode: 1181 });
  const twoCour = show(100, { start: [2026, 7, 5], episodes: 24, popularity: 50_000 });
  const endsEarly = show(101, {
    start: [2026, 7, 5],
    episodes: 12,
    popularity: 70_000,
    nextAt: FALL_2026 - 20 * DAY,
    nextEpisode: 12,
  });
  const filedUnderFall = show(102, { start: [2026, 9, 28], popularity: 10_000, season: "FALL", seasonYear: 2026 });
  const premiere = show(200, { start: [2026, 10, 3] });

  it("for a started season keeps every still-airing series, most popular first, deduped", () => {
    const picked = selectCarryOver({
      ended: [twoCour],
      airing: [twoCour, onePiece, endsEarly],
      seasonMedia: [],
      season: FALL,
      seasonStart: FALL_2026,
      seasonEnd: WINTER_2027,
      now: FALL_2026 + 10 * DAY,
    });
    expect(picked.map((m) => m.id)).toEqual([21, 101, 100]);
  });

  it("never lists the season's own shows (page 1 or filed under it) or later premieres", () => {
    const picked = selectCarryOver({
      ended: [filedUnderFall, premiere],
      airing: [filedUnderFall, premiere, onePiece, twoCour],
      seasonMedia: [twoCour],
      season: FALL,
      seasonStart: FALL_2026,
      seasonEnd: WINTER_2027,
      now: FALL_2026 + DAY,
    });
    expect(picked.map((m) => m.id)).toEqual([21]);
  });

  it("before the season starts, keeps only series expected to reach it", () => {
    const freshNoCount = show(185756, { start: [2026, 9, 27], episodes: null, nextAt: FALL_2026 + 3 * DAY, nextEpisode: 2 });
    const picked = selectCarryOver({
      ended: [twoCour], // announced end date after winter starts
      airing: [onePiece, endsEarly, freshNoCount],
      seasonMedia: [],
      season: WINTER,
      seasonStart: WINTER_2027,
      seasonEnd: SPRING_2027,
      now: FALL_2026 + 5 * DAY,
    });
    expect(picked.map((m) => m.id)).toEqual([21, 100]);
  });
});
