import { describe, expect, it } from "vitest";
import { DEFAULT_USER_DATA } from "@/lib/anime/types";
import type { UserAnimeData } from "@/lib/anime/types";
import {
  EMPTY_FILTERS,
  countByStatus,
  entryYear,
  groupByStatus,
  hasActiveFilters,
  matchesFilters,
  sortEntries,
  yearOptions,
} from "./listFilters";
import type { MyListEntry } from "./listFilters";

// Thu Oct 1 2026 16:30 UTC = Thursday 9:30 AM PDT
const THU = Date.UTC(2026, 9, 1, 16, 30) / 1000;
const SAT = Date.UTC(2026, 9, 3, 16, 30) / 1000;

let nextId = 1;
function entry(
  overrides: Partial<Omit<MyListEntry, "userData">> & { userData?: Partial<UserAnimeData> } = {}
): MyListEntry {
  const { userData, ...media } = overrides;
  return {
    id: nextId++,
    title: { romaji: "Untitled", english: null, native: null },
    coverImage: { extraLarge: null, large: null, medium: null, color: null },
    season: null,
    seasonYear: null,
    format: "TV",
    status: "FINISHED",
    episodes: 12,
    startDate: { year: null, month: null, day: null },
    upcomingEpisode: null,
    upComingAirDate: { episode: [] },
    firstEpisode: { episode: [] },
    ...media,
    userData: { ...DEFAULT_USER_DATA, ...userData },
  };
}

const airingAt = (unix: number) => ({ episode: [{ airingAt: unix, episode: 3 }] });

describe("matchesFilters", () => {
  const frieren = entry({
    title: {
      romaji: "Sousou no Frieren",
      english: "Frieren: Beyond Journey's End",
      native: "葬送のフリーレン",
    },
    season: "FALL",
    seasonYear: 2023,
    status: "RELEASING",
    upComingAirDate: airingAt(THU),
  });

  it("matches every title language, case- and accent-insensitively", () => {
    expect(matchesFilters(frieren, { ...EMPTY_FILTERS, query: "SOUSOU" })).toBe(true);
    expect(matchesFilters(frieren, { ...EMPTY_FILTERS, query: "journey" })).toBe(true);
    expect(matchesFilters(frieren, { ...EMPTY_FILTERS, query: "フリーレン" })).toBe(true);
    expect(
      matchesFilters(entry({ title: { romaji: "Pokémon", english: null, native: null } }), {
        ...EMPTY_FILTERS,
        query: "pokemon",
      })
    ).toBe(true);
    expect(matchesFilters(frieren, { ...EMPTY_FILTERS, query: "naruto" })).toBe(false);
  });

  it("filters by year, season, PT weekday and release status", () => {
    expect(matchesFilters(frieren, { ...EMPTY_FILTERS, year: 2023, season: "fall" })).toBe(true);
    expect(matchesFilters(frieren, { ...EMPTY_FILTERS, year: 2024 })).toBe(false);
    expect(matchesFilters(frieren, { ...EMPTY_FILTERS, season: "winter" })).toBe(false);
    expect(matchesFilters(frieren, { ...EMPTY_FILTERS, weekday: "thursday" })).toBe(true);
    expect(matchesFilters(frieren, { ...EMPTY_FILTERS, weekday: "friday" })).toBe(false);
    expect(matchesFilters(frieren, { ...EMPTY_FILTERS, release: "RELEASING" })).toBe(true);
    expect(matchesFilters(frieren, { ...EMPTY_FILTERS, release: "FINISHED" })).toBe(false);
  });

  it("knows when filters are active", () => {
    expect(hasActiveFilters(EMPTY_FILTERS)).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, query: "   " })).toBe(false);
    expect(hasActiveFilters({ ...EMPTY_FILTERS, weekday: "monday" })).toBe(true);
  });
});

describe("yearOptions / entryYear", () => {
  it("prefers seasonYear, falls back to the start year, newest first, no duplicates", () => {
    const entries = [
      entry({ seasonYear: 2021 }),
      entry({ startDate: { year: 2025, month: 1, day: 1 } }),
      entry({ seasonYear: 2026, startDate: { year: 2025, month: 12, day: 30 } }),
      entry({ seasonYear: 2021 }),
      entry(),
    ];
    expect(entryYear(entries[2])).toBe(2026);
    expect(yearOptions(entries)).toEqual([2026, 2025, 2021]);
  });
});

describe("sortEntries", () => {
  const a = entry({
    title: { romaji: "Alpha", english: null, native: null },
    episodes: 10,
    userData: { episodeProgressNumber: 5, score: 7 },
  });
  const b = entry({
    title: { romaji: "bravo", english: null, native: null },
    episodes: null,
    upComingAirDate: airingAt(SAT),
    userData: { episodeProgressNumber: 3, score: null },
  });
  const c = entry({
    title: { romaji: "Charlie", english: null, native: null },
    episodes: 4,
    upComingAirDate: airingAt(THU),
    userData: { episodeProgressNumber: 4, score: 9.5 },
  });
  const stored = [a, b, c];
  const titles = (list: MyListEntry[]) => list.map((item) => item.title.romaji);

  it("sorts by next episode, unscheduled last, then title", () => {
    expect(titles(sortEntries(stored, "next"))).toEqual(["Charlie", "bravo", "Alpha"]);
  });

  it("sorts titles A–Z ignoring case", () => {
    expect(titles(sortEntries(stored, "title"))).toEqual(["Alpha", "bravo", "Charlie"]);
  });

  it("sorts by my score, unscored last", () => {
    expect(titles(sortEntries(stored, "score"))).toEqual(["Charlie", "Alpha", "bravo"]);
  });

  it("sorts by progress share of known episodes, unknown counts last", () => {
    expect(titles(sortEntries(stored, "progress"))).toEqual(["Charlie", "Alpha", "bravo"]);
  });

  it("reverses stored order for recently added, without mutating the input", () => {
    expect(titles(sortEntries(stored, "added"))).toEqual(["Charlie", "bravo", "Alpha"]);
    expect(titles(stored)).toEqual(["Alpha", "bravo", "Charlie"]);
  });
});

describe("countByStatus / groupByStatus", () => {
  it("counts every status and groups in LIST_STATUSES order without empty sections", () => {
    const entries = [
      entry({ userData: { listType: "dropped" } }),
      entry({ userData: { listType: "watching" } }),
      entry({ userData: { listType: "planning" } }),
      entry({ userData: { listType: "watching" } }),
    ];
    expect(countByStatus(entries)).toEqual({
      all: 4,
      watching: 2,
      planning: 1,
      completed: 0,
      paused: 0,
      dropped: 1,
    });
    expect(
      groupByStatus(entries).map((section) => [section.status, section.entries.length])
    ).toEqual([
      ["watching", 2],
      ["planning", 1],
      ["dropped", 1],
    ]);
  });
});
