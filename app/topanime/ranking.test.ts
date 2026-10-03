import { afterEach, describe, expect, it, vi } from "vitest";
import type { TopAnimeItem, TopAnimePage } from "@/lib/topAnime";
import {
  altTitle,
  compactNumber,
  consoleLine,
  countLabel,
  crownLead,
  crownLeadText,
  crownOf,
  exactNumber,
  fetchedLine,
  glanceStats,
  loadedAnnouncement,
  octagramBlurb,
  rangeSpoken,
  rangeText,
  rankLabel,
  rankRange,
  rankSizeClass,
  splitOctagram,
} from "./ranking";

// Fixtures only: the page computes every number from live data.
const item = (malId: number, overrides: Partial<TopAnimeItem> = {}): TopAnimeItem => ({
  malId,
  rank: malId,
  title: `Show ${malId}`,
  titleEnglish: null,
  score: 9 - malId / 100,
  imageUrl: null,
  type: "TV",
  episodes: 12,
  year: 2020,
  members: 1000 * malId,
  ...overrides,
});

const ranks = (list: TopAnimeItem[]) => list.map((entry) => entry.rank);

describe("splitOctagram", () => {
  it("puts ranks 1–8 in the Octagram and keeps order", () => {
    const items = Array.from({ length: 10 }, (_, i) => item(i + 1));
    const { octagram, rest } = splitOctagram(items);
    expect(ranks(octagram)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(ranks(rest)).toEqual([9, 10]);
  });

  it("keeps both shows loaded at #8 in the Octagram", () => {
    const items = [...Array.from({ length: 8 }, (_, i) => item(i + 1)), item(99, { rank: 8 }), item(10)];
    expect(splitOctagram(items).octagram).toHaveLength(9);
  });

  it("never puts an unranked show in the Octagram", () => {
    const { octagram, rest } = splitOctagram([item(1), item(2, { rank: null })]);
    expect(ranks(octagram)).toEqual([1]);
    expect(ranks(rest)).toEqual([null]);
  });

  it("handles fewer than eight shows", () => {
    expect(splitOctagram([item(1), item(2)]).octagram).toHaveLength(2);
  });
});

describe("rankRange, rangeText, rangeSpoken", () => {
  it("ignores unranked shows and repeated ranks", () => {
    const items = [item(19), item(21), item(22, { rank: 21 }), item(30, { rank: null }), item(25)];
    expect(rankRange(items)).toEqual({ min: 19, max: 25 });
  });

  it("returns null when nothing is ranked", () => {
    expect(rankRange([item(1, { rank: null })])).toBeNull();
    expect(rankRange([])).toBeNull();
  });

  it("formats single ranks and spans", () => {
    expect(rangeText({ min: 9, max: 25 })).toBe("#9–#25");
    expect(rangeText({ min: 9, max: 9 })).toBe("#9");
    expect(rangeSpoken({ min: 9, max: 25 })).toBe("ranks 9 to 25");
    expect(rangeSpoken({ min: 9, max: 9 })).toBe("rank 9");
  });
});

describe("rankLabel", () => {
  it("labels ranked and unranked rows, and never claims a tie", () => {
    expect(rankLabel(item(1))).toBe("Rank 1");
    // Separately cached pages can briefly put two shows at one rank; MyAnimeList itself has one per rank.
    expect(rankLabel(item(22, { rank: 21 }))).toBe("Rank 21");
    expect(rankLabel(item(3, { rank: null }))).toBe("Unranked");
  });
});

describe("crownOf, crownLead and crownLeadText", () => {
  it("measures #1's lead over the next rank", () => {
    const items = [item(1, { score: 9.26 }), item(2, { score: 9.17 }), item(3, { score: 9.11 })];
    expect(crownOf(items)?.malId).toBe(1);
    const lead = crownLead(items);
    expect(lead).toEqual({ runnerUpRank: 2, diff: 0.09, score: 9.26 });
    expect(crownLeadText(lead!)).toBe("Leads rank 2 by 0.09 points.");
  });

  it("says 'point' for exactly one", () => {
    expect(crownLeadText({ runnerUpRank: 2, diff: 1, score: 9.5 })).toBe("Leads rank 2 by 1.00 point.");
  });

  it("reports a tie in displayed scores", () => {
    const lead = crownLead([item(1, { score: 9.26 }), item(2, { score: 9.26 })]);
    expect(lead?.diff).toBe(0);
    expect(crownLeadText(lead!)).toBe("Same displayed score as rank 2: 9.26.");
  });

  it("uses the lowest rank after #1 even out of order", () => {
    const lead = crownLead([item(3, { score: 9.0 }), item(1, { score: 9.2 }), item(2, { score: 9.1 })]);
    expect(lead?.runnerUpRank).toBe(2);
  });

  it("gives up when the data can't support the claim", () => {
    expect(crownLead([item(1, { score: null }), item(2)])).toBeNull();
    expect(crownLead([item(1), item(2, { score: null })])).toBeNull();
    expect(crownLead([item(1), item(9, { rank: 1 }), item(2)])).toBeNull();
    expect(crownLead([item(1, { score: 9.0 }), item(2, { score: 9.1 })])).toBeNull();
    expect(crownLead([item(1)])).toBeNull();
    expect(crownOf([item(2)])).toBeNull();
  });
});

describe("glanceStats", () => {
  it("names the show behind each fact", () => {
    const items = [
      item(1, { titleEnglish: "Frieren", members: 1_479_110, year: 2023 }),
      item(3, { titleEnglish: "Brotherhood", members: 3_710_715, year: 2009 }),
      item(11, { title: "Ginga Eiyuu Densetsu", members: 300_000, year: 1988 }),
      item(2, { members: 290_000, year: 2026 }),
    ];
    expect(glanceStats(items)).toEqual([
      { label: "Most members", value: "3.7M", spoken: "3,710,715 members", note: "#3 · Brotherhood" },
      { label: "Oldest", value: "1988", spoken: null, note: "#11 · Ginga Eiyuu Densetsu" },
      { label: "Newest", value: "2026", spoken: null, note: "#2 · Show 2" },
    ]);
  });

  it("breaks ties by the better rank", () => {
    const facts = glanceStats([item(5, { members: 10, year: 2000 }), item(2, { members: 10, year: 2000 })]);
    expect(facts.map((fact) => fact.note)).toEqual(["#2 · Show 2", "#2 · Show 2"]);
  });

  it("skips Newest when it's the same show as Oldest, and missing facts entirely", () => {
    expect(glanceStats([item(1, { members: null, year: 2001 })]).map((fact) => fact.label)).toEqual(["Oldest"]);
    expect(glanceStats([item(1, { members: null, year: null })])).toEqual([]);
  });

  it("drops the rank prefix for unranked shows", () => {
    expect(glanceStats([item(1, { rank: null, year: null })])[0].note).toBe("Show 1");
  });
});

describe("numbers and labels", () => {
  it("compacts and spells out counts", () => {
    expect(compactNumber(999)).toBe("999");
    expect(compactNumber(1_500)).toBe("1.5K");
    expect(compactNumber(999_950)).toBe("1M");
    expect(compactNumber(3_710_715)).toBe("3.7M");
    expect(exactNumber(1_479_110)).toBe("1,479,110");
    expect(exactNumber(999)).toBe("999");
    expect(countLabel(1)).toBe("1 show");
    expect(countLabel(30_375)).toBe("30,375 shows");
  });

  it("shows the default title only when it differs from the English one", () => {
    expect(altTitle(item(1, { titleEnglish: "Frieren", title: "Sousou no Frieren" }))).toBe("Sousou no Frieren");
    expect(altTitle(item(1, { titleEnglish: "Same", title: "Same" }))).toBeNull();
    expect(altTitle(item(1, { titleEnglish: null }))).toBeNull();
  });

  it("shrinks the rail numeral as ranks get longer", () => {
    expect(rankSizeClass(9)).toContain("text-[1.75rem]");
    expect(rankSizeClass(100)).toContain("text-[1.375rem]");
    expect(rankSizeClass(1000)).toContain("text-base");
    expect(rankSizeClass(10000)).toContain("text-sm");
  });
});

describe("octagramBlurb", () => {
  it("says 'top eight' only for exactly eight shows", () => {
    expect(octagramBlurb(Array.from({ length: 8 }, (_, i) => item(i + 1)))).toBe(
      "In Tensura, the Octagram are the eight Demon Lords. Here, they're MyAnimeList's top eight."
    );
    expect(octagramBlurb(Array.from({ length: 9 }, (_, i) => item(i + 1)))).toBe(
      "In Tensura, the Octagram are the eight Demon Lords. Here, they're the 9 shows loaded at MyAnimeList's ranks 1–8."
    );
    expect(octagramBlurb(Array.from({ length: 7 }, (_, i) => item(i + 1)))).toContain("the 7 shows loaded at MyAnimeList's ranks 1–8");
    expect(octagramBlurb([item(1)])).toContain("the 1 show loaded at MyAnimeList's ranks 1–8");
  });
});

describe("consoleLine and loadedAnnouncement", () => {
  const page = Array.from({ length: 25 }, (_, i) => item(i + 1));

  it("describes what's loaded, the next request and the end", () => {
    expect(consoleLine({ items: page, loading: false, lastPage: 1, hasNextPage: true })).toBe(
      "25 shows loaded: ranks 1 to 25."
    );
    expect(consoleLine({ items: page, loading: true, lastPage: 1, hasNextPage: true })).toBe(
      "Asking MyAnimeList for the ranks after #25…"
    );
    expect(consoleLine({ items: [item(1, { rank: null })], loading: true, lastPage: 1, hasNextPage: true })).toBe(
      "Asking MyAnimeList for the next page of the ranking…"
    );
    // The joke needs at least one "Show more".
    expect(consoleLine({ items: page, loading: false, lastPage: 1, hasNextPage: false })).toBe(
      "That's the whole ranking: 25 shows loaded."
    );
    expect(consoleLine({ items: page, loading: false, lastPage: 3, hasNextPage: false })).toBe(
      "That's the whole ranking: 25 shows loaded. Impressive scrolling."
    );
    expect(consoleLine({ items: [item(1, { rank: null })], loading: false, lastPage: 1, hasNextPage: true })).toBe(
      "1 show loaded."
    );
  });

  it("announces added ranks, empty pages and the end", () => {
    const added = Array.from({ length: 25 }, (_, i) => item(i + 26));
    expect(loadedAnnouncement(added, 50, false)).toBe("Loaded 25 more, ranks 26 to 50. 50 shows loaded.");
    expect(loadedAnnouncement([], 50, false)).toBe("That page had no new shows. 50 shows loaded.");
    expect(loadedAnnouncement([item(51)], 51, true)).toBe(
      "Loaded 1 more, rank 51. 51 shows loaded. That's the whole ranking."
    );
  });
});

describe("fetchedLine", () => {
  it("states the fetch time in Pacific Time", () => {
    // 2026-10-01 22:05 UTC = 3:05 PM PDT
    expect(fetchedLine(Date.UTC(2026, 9, 1, 22, 5))).toBe("Ranking fetched from MyAnimeList, Oct 1, 2026, 3:05 PM PDT.");
  });
});

describe("rankingStore", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  const pageOf = (ids: number[]): TopAnimePage => ({
    items: ids.map((id) => item(id)),
    hasNextPage: true,
    currentPage: 1,
  });

  it("restores loaded pages only for the same page 1, and only in a browser", async () => {
    vi.stubGlobal("window", {});
    const store = await import("./rankingStore");
    const key = store.rankingKey(pageOf([1, 2, 3]));
    expect(key).toBe("1,2,3");
    expect(store.readRankingSnapshot(key)).toBeNull();
    const snapshot = { key, items: [item(1), item(2), item(3), item(4)], lastPage: 2, hasNextPage: false };
    store.saveRankingSnapshot(snapshot);
    expect(store.readRankingSnapshot(key)).toBe(snapshot);
    expect(store.readRankingSnapshot(store.rankingKey(pageOf([1, 3, 2])))).toBeNull();
  });

  it("restores later pages but always takes page 1 from the server", async () => {
    vi.stubGlobal("window", {});
    const store = await import("./rankingStore");
    const fresh = pageOf([1, 2]);
    expect(store.initialRankingState(fresh)).toEqual({ key: "1,2", items: fresh.items, lastPage: 1, hasNextPage: true });
    // Saved after a Show more, with page 1's old numbers.
    const stale = [item(1, { score: 1 }), item(2, { score: 1 }), item(3), item(4)];
    store.saveRankingSnapshot({ key: "1,2", items: stale, lastPage: 2, hasNextPage: false });
    const restored = store.initialRankingState(fresh);
    expect(restored.items.map((entry) => entry.malId)).toEqual([1, 2, 3, 4]);
    expect(restored.items[0]).toBe(fresh.items[0]);
    expect(restored.lastPage).toBe(2);
    expect(restored.hasNextPage).toBe(false);
    // A different top 25 starts fresh.
    expect(store.initialRankingState(pageOf([2, 1])).items).toHaveLength(2);
  });

  it("never stores anything on the server", async () => {
    const store = await import("./rankingStore");
    const key = store.rankingKey(pageOf([1]));
    store.saveRankingSnapshot({ key, items: [item(1)], lastPage: 1, hasNextPage: true });
    expect(store.readRankingSnapshot(key)).toBeNull();
  });
});
