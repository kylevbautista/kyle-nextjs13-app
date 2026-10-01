import {
  dedupeByMalId,
  type TopAnimeItem,
  type TopAnimePage,
} from "@/components/animev3/utils/jinkanData/getTopAnimeJinkan";

/**
 * The ranking pages loaded in this tab, kept in module memory so going Back
 * from a "Track" search restores them (the router cache only replays page 1).
 *
 * Keyed by page 1's ids in order: when ISR regenerates the page with a
 * different top 25, the old snapshot no longer applies. Page 1 always comes
 * from the server render (its scores and member counts may be newer); only
 * the pages after it are restored. Written only from "Show more" (an event
 * handler) and read only in a useState initializer, so the server and the
 * first hydration never see it.
 */
export interface RankingSnapshot {
  key: string;
  items: TopAnimeItem[];
  lastPage: number;
  hasNextPage: boolean;
}

let snapshot: RankingSnapshot | null = null;

export const rankingKey = (page: TopAnimePage) => page.items.map((item) => item.malId).join(",");

export function readRankingSnapshot(key: string): RankingSnapshot | null {
  return typeof window !== "undefined" && snapshot?.key === key ? snapshot : null;
}

export function saveRankingSnapshot(next: RankingSnapshot): void {
  if (typeof window !== "undefined") snapshot = next;
}

/** The list's starting state: the server's page 1, plus any pages this tab loaded after it. */
export function initialRankingState(page: TopAnimePage): RankingSnapshot {
  const key = rankingKey(page);
  const saved = readRankingSnapshot(key);
  if (!saved) return { key, items: page.items, lastPage: page.currentPage, hasNextPage: page.hasNextPage };
  // A matching key means the first page.items.length ids are identical.
  return { ...saved, items: dedupeByMalId(page.items, saved.items.slice(page.items.length)) };
}
