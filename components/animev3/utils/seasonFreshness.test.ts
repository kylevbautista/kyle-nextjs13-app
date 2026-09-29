import { describe, expect, it } from "vitest";
import { SEASON_STALE_AFTER_MS, isStale, mergeFresh, recallRefresh, rememberRefresh } from "./seasonFreshness";
import { normalizeMedia } from "@/lib/anime/normalize";
import type { AnimeMedia } from "@/lib/anime/types";

const media = (id: number, episode: number | null = null): AnimeMedia =>
  normalizeMedia({
    id,
    title: { romaji: `Show ${id}` },
    upComingAirDate: { episode: episode ? [{ airingAt: 1_800_000_000 + episode, episode }] : [] },
  })!;

describe("isStale", () => {
  it("is stale only past the threshold", () => {
    const fetchedAt = 1_000_000;
    expect(isStale(fetchedAt, fetchedAt + SEASON_STALE_AFTER_MS)).toBe(false);
    expect(isStale(fetchedAt, fetchedAt + SEASON_STALE_AFTER_MS + 1)).toBe(true);
    expect(isStale(fetchedAt, fetchedAt - 5_000)).toBe(false); // client clock behind
  });
});

describe("mergeFresh", () => {
  it("replaces updated shows in place, keeps later pages, appends new ones", () => {
    const current = [media(1, 5), media(2, 3), media(90, 7)]; // 90 came from page 2
    const fresh = [media(2, 4), media(1, 6), media(3, 1)];
    const merged = mergeFresh(current, fresh);
    expect(merged.map((m) => m.id)).toEqual([1, 2, 90, 3]);
    expect(merged.map((m) => m.upComingAirDate.episode[0]?.episode)).toEqual([6, 4, 7, 1]);
  });

  it("keeps a show that dropped off the fresh page 1", () => {
    expect(mergeFresh([media(1), media(2)], [media(2)]).map((m) => m.id)).toEqual([1, 2]);
  });
});

describe("remembered refreshes", () => {
  it("returns a refresh only when it is newer than the page's own data", () => {
    const data = { at: 5_000, media: [media(1)], carryOver: [], hasNextPage: false };
    rememberRefresh("2026-fall", data);
    expect(recallRefresh("2026-fall", 4_000)).toBe(data);
    expect(recallRefresh("2026-fall", 6_000)).toBeNull(); // the page is newer (ISR rebuilt it)
    expect(recallRefresh("2026-summer", 0)).toBeNull();
  });
});
