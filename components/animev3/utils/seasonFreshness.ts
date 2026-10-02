import type { AnimeMedia } from "@/lib/anime/types";

/**
 * Season pages are ISR-cached, and the first visit after a quiet spell is
 * served the last render (possibly days old) while Next rebuilds it in the
 * background. The page then refreshes page 1 from the browser if its data is
 * older than this.
 */
export const SEASON_STALE_AFTER_MS = 10 * 60 * 1000;

export const isStale = (fetchedAt: number, now: number) => now - fetchedAt > SEASON_STALE_AFTER_MS;

/**
 * Replaces shows that `fresh` has newer data for and appends ones not seen
 * yet. Shows from later pages (not in `fresh`) are kept as they are.
 */
export function mergeFresh(current: AnimeMedia[], fresh: AnimeMedia[]): AnimeMedia[] {
  const freshById = new Map(fresh.map((media) => [media.id, media]));
  const merged = current.map((media) => freshById.get(media.id) ?? media);
  const seen = new Set(current.map((media) => media.id));
  for (const media of fresh) {
    if (!seen.has(media.id)) merged.push(media);
  }
  return merged;
}

export interface RefreshedSeason {
  /** Browser time of the refresh (epoch ms). */
  at: number;
  media: AnimeMedia[];
  /** A refresh always fetches continuing series (no season-only fallback). */
  carryOver: AnimeMedia[];
  /** A carry-over list hit AniList's 50-item page (counts say "21+"). */
  carryOverCapped: boolean;
  hasNextPage: boolean;
}

/**
 * Refreshed page-1 data, per season, for the rest of the browser session.
 * Back/forward and in-app navigation replay the page's original (stale) data
 * from the router cache; seeding from this avoids refreshing again each time.
 * Empty during SSR and on a full page load, so hydration always matches.
 */
const refreshedSeasons = new Map<string, RefreshedSeason>();

export const rememberRefresh = (key: string, data: RefreshedSeason) => {
  refreshedSeasons.set(key, data);
};

/** The remembered refresh for `key` if it is newer than `fetchedAt`. */
export const recallRefresh = (key: string, fetchedAt: number): RefreshedSeason | null => {
  const cached = refreshedSeasons.get(key);
  return cached && cached.at > fetchedAt ? cached : null;
};
