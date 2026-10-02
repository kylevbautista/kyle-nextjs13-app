import { describe, expect, it } from "vitest";
import { normalizeMedia } from "./normalize";
import {
  appendUnique,
  compareByPopularity,
  countdownComparator,
  inSeasonAiringAt,
  orderSeason,
  pinnedPrefixLength,
  seasonWindow,
  selectContinuing,
  soonerBelow,
} from "./seasonOrder";
import type { AnimeMedia } from "./types";

const FALL = seasonWindow(2026, "fall");
const at = (h: number, m = 0) => Date.UTC(2026, 9, 2, h, m) / 1000;

const show = (id: number, { airingAt = null as number | null, popularity = 1000 as number | null } = {}): AnimeMedia => {
  const item = normalizeMedia({
    id,
    title: { romaji: `Show ${id}`, english: null, native: null },
    popularity,
    upComingAirDate: { episode: airingAt ? [{ airingAt, episode: 2 }] : [] },
  });
  if (!item) throw new Error("bad fixture");
  return item;
};
const ids = (list: readonly AnimeMedia[]) => list.map((item) => item.id);

describe("seasonWindow / inSeasonAiringAt", () => {
  it("spans the season, end exclusive", () => {
    expect(FALL).toEqual({ start: Date.UTC(2026, 9, 1), end: Date.UTC(2027, 0, 1) });
    expect(inSeasonAiringAt(show(1, { airingAt: at(10) }), FALL)).toBe(at(10) * 1000);
    expect(inSeasonAiringAt(show(1, { airingAt: Date.UTC(2026, 8, 30) / 1000 }), FALL)).toBe(Infinity);
    expect(inSeasonAiringAt(show(1, { airingAt: FALL.end / 1000 }), FALL)).toBe(Infinity);
    expect(inSeasonAiringAt(show(1), FALL)).toBe(Infinity);
  });
});

describe("compareByPopularity / countdownComparator", () => {
  it("orders by popularity, unknown last", () => {
    const list = [show(1, { popularity: 5 }), show(2, { popularity: null }), show(3, { popularity: 50 })];
    expect(ids([...list].sort(compareByPopularity))).toEqual([3, 1, 2]);
  });

  it("soonest in-season episode first, ties and the rest by popularity", () => {
    const list = [
      show(1, { airingAt: at(14), popularity: 10 }),
      show(2, { airingAt: at(10), popularity: 1 }),
      show(3, { airingAt: at(14), popularity: 99 }),
      show(4, { airingAt: Date.UTC(2027, 0, 5) / 1000, popularity: 500 }), // after the season
      show(5, { popularity: 400 }),
    ];
    expect(ids([...list].sort(countdownComparator(FALL)))).toEqual([2, 3, 1, 4, 5]);
  });
});

describe("appendUnique", () => {
  it("dedupes and keeps the same array when nothing is new", () => {
    const a = [show(1), show(2)];
    expect(ids(appendUnique(a, [show(2), show(3), show(3)]))).toEqual([1, 2, 3]);
    expect(appendUnique(a, [show(1)])).toBe(a);
  });
});

describe("selectContinuing", () => {
  const media = [show(1, { popularity: 100 }), show(2, { popularity: 50 })];
  const carryOver = [show(2), show(3, { popularity: 80 }), show(4, { popularity: 10 })];

  it("is empty when hidden, and drops the season's own shows", () => {
    expect(selectContinuing({ carryOver, media, showContinuing: false, sort: "countdown", hasNextPage: false })).toEqual([]);
    expect(ids(selectContinuing({ carryOver, media, showContinuing: true, sort: "countdown", hasNextPage: true }))).toEqual([3, 4]);
  });

  it("holds back less popular ones in popularity mode until the season has loaded", () => {
    expect(ids(selectContinuing({ carryOver, media, showContinuing: true, sort: "popularity", hasNextPage: true }))).toEqual([3]);
    expect(ids(selectContinuing({ carryOver, media, showContinuing: true, sort: "popularity", hasNextPage: false }))).toEqual([3, 4]);
  });
});

describe("orderSeason", () => {
  const compareCountdown = countdownComparator(FALL);
  const a = show(1, { airingAt: at(10), popularity: 10 });
  const b = show(2, { airingAt: at(14), popularity: 20 });
  const c = show(3, { airingAt: at(9), popularity: 30 });
  const d = show(4, { airingAt: at(12), popularity: 40 });

  it("sorts everything when nothing is pinned", () => {
    expect(ids(orderSeason({ media: [a, b, c], continuing: [d], sort: "countdown", pinnedIds: [], compareCountdown }).list)).toEqual([3, 1, 4, 2]);
    expect(ids(orderSeason({ media: [a, b, c], continuing: [d], sort: "popularity", pinnedIds: [], compareCountdown }).list)).toEqual([4, 3, 2, 1]);
  });

  it("keeps pinned cards first, in pin order", () => {
    const { list, pinnedCount } = orderSeason({ media: [a, b, c, d], continuing: [], sort: "countdown", pinnedIds: [1, 2], compareCountdown });
    expect(ids(list)).toEqual([1, 2, 3, 4]);
    expect(pinnedCount).toBe(2);
  });

  it("counts only pinned ids that are still present", () => {
    // 99 left page 1 in a stale refresh.
    const { list, pinnedCount } = orderSeason({ media: [a, b, c, d], continuing: [], sort: "countdown", pinnedIds: [1, 99, 2], compareCountdown });
    expect(ids(list)).toEqual([1, 2, 3, 4]);
    expect(pinnedCount).toBe(2);
    expect(orderSeason({ media: [a], continuing: [], sort: "countdown", pinnedIds: [98, 99], compareCountdown }).pinnedCount).toBe(0);
  });
});

describe("soonerBelow", () => {
  // Fall 2026: Beyblade 10:00Z and Apothecary 14:00Z pinned; page 2 brings Pan Dorobou 09:40Z and Welsh 12:26Z.
  const beyblade = show(1, { airingAt: at(10) });
  const apothecary = show(2, { airingAt: at(14) });
  const pan = show(3, { airingAt: at(9, 40) });
  const welsh = show(4, { airingAt: at(12, 26) });
  const elusive = show(5, { airingAt: at(14, 30) });
  const longRunner = show(6);

  it("counts unpinned shows sooner than the latest pinned one", () => {
    expect(soonerBelow([beyblade, apothecary, pan, welsh, elusive, longRunner], 2, FALL)).toBe(2);
    expect(soonerBelow([beyblade, apothecary, pan, welsh, elusive], 0, FALL)).toBe(0);
  });

  it("ties don't count; a pinned show without an in-season episode makes any scheduled one count", () => {
    expect(soonerBelow([apothecary, show(7, { airingAt: at(14) })], 1, FALL)).toBe(0);
    expect(soonerBelow([longRunner, pan, show(8)], 1, FALL)).toBe(1);
  });
});

describe("pinnedPrefixLength", () => {
  it("pins cards on screen or above it, or through the focused card", () => {
    expect(pinnedPrefixLength([600, 600, 1100, 1100], 844, null)).toBe(2);
    expect(pinnedPrefixLength([-900, -400, -10], 844, null)).toBe(3);
    expect(pinnedPrefixLength([900, 1300], 844, null)).toBe(0);
    expect(pinnedPrefixLength([600, 600, 1100, 1100], 844, 3)).toBe(4);
    expect(pinnedPrefixLength([600, 600, 1100, 1100], 844, 0)).toBe(2);
  });
});
