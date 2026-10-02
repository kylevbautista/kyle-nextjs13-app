/**
 * The season page's ordering rules (components/animev3/PageBase.tsx), pure so
 * they can be tested: popularity and countdown order, continuing series, and
 * pinning (cards on screen keep their place when later pages arrive; the
 * pinned prefix and the "air sooner than some above" divider after it).
 */
import { nextAiring } from "./airing";
import type { AnimeMedia } from "./types";
import { seasonStartMs, shiftSeason, type SeasonName } from "@/lib/season";

export type SortMode = "countdown" | "popularity";

export interface SeasonWindow {
  /** First instant of the season (UTC, epoch ms). */
  start: number;
  /** First instant of the next season (exclusive). */
  end: number;
}

export function seasonWindow(year: number, season: SeasonName): SeasonWindow {
  const following = shiftSeason(year, season, 1);
  return { start: seasonStartMs(year, season), end: seasonStartMs(following.year, following.season) };
}

/** The next episode's air time (ms) if it falls in the season, else +∞. */
export function inSeasonAiringAt(media: AnimeMedia, win: SeasonWindow): number {
  const next = nextAiring(media);
  const at = next ? next.airingAt * 1000 : Number.POSITIVE_INFINITY;
  return at >= win.start && at < win.end ? at : Number.POSITIVE_INFINITY;
}

/** Most AniList list entries first; unknown popularity last. Stable. */
export const compareByPopularity = (a: AnimeMedia, b: AnimeMedia) =>
  (b.popularity ?? -1) - (a.popularity ?? -1);

/**
 * Countdown order for one season: soonest episode *airing during that season*
 * first, then by popularity. Episodes outside the season don't count, so a
 * past or upcoming season doesn't open with today's long runners.
 */
export function countdownComparator(win: SeasonWindow) {
  return (a: AnimeMedia, b: AnimeMedia) => {
    const ta = inSeasonAiringAt(a, win);
    const tb = inSeasonAiringAt(b, win);
    return ta === tb ? compareByPopularity(a, b) : ta < tb ? -1 : 1;
  };
}

/** Appends shows not seen yet, keeping AniList's popularity order. */
export function appendUnique(current: AnimeMedia[], incoming: AnimeMedia[]) {
  const seen = new Set(current.map((item) => item.id));
  const added: AnimeMedia[] = [];
  for (const item of incoming) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    added.push(item);
  }
  return added.length ? [...current, ...added] : current;
}

/**
 * Continuing series, minus any that turn up in the season's own pages
 * (AniList files e.g. late-June premieres under summer). In popularity mode,
 * ones less popular than everything loaded so far wait for the season's
 * later pages, so they don't jump ahead of more popular new shows.
 */
export function selectContinuing({
  carryOver,
  media,
  showContinuing,
  sort,
  hasNextPage,
}: {
  carryOver: readonly AnimeMedia[];
  media: readonly AnimeMedia[];
  showContinuing: boolean;
  sort: SortMode;
  hasNextPage: boolean;
}): AnimeMedia[] {
  if (!showContinuing) return [];
  const seasonIds = new Set(media.map((item) => item.id));
  const floor =
    sort === "popularity" && hasNextPage && media.length
      ? Math.min(...media.map((item) => item.popularity ?? 0))
      : Number.NEGATIVE_INFINITY;
  return carryOver.filter((item) => !seasonIds.has(item.id) && (item.popularity ?? 0) >= floor);
}

/**
 * Pinned cards first, in pin order (ids that are gone are skipped), then
 * everything else in the sort's order. `pinnedCount` is how many pinned
 * cards are actually in `list`: a stale refresh can replace page 1 and drop
 * a pinned show, so it can be smaller than `pinnedIds.length`. The seam (the
 * divider) is always after `pinnedCount` cards.
 */
export function orderSeason({
  media,
  continuing,
  sort,
  pinnedIds,
  compareCountdown,
}: {
  media: readonly AnimeMedia[];
  continuing: readonly AnimeMedia[];
  sort: SortMode;
  pinnedIds: readonly number[];
  compareCountdown: (a: AnimeMedia, b: AnimeMedia) => number;
}): { list: AnimeMedia[]; pinnedCount: number } {
  const all = [...media, ...continuing];
  const byId = new Map(all.map((item) => [item.id, item]));
  const pinned = pinnedIds.flatMap((id) => byId.get(id) ?? []);
  const pinnedSet = new Set(pinned.map((item) => item.id));
  const rest = all
    .filter((item) => !pinnedSet.has(item.id))
    .sort(sort === "countdown" ? compareCountdown : compareByPopularity);
  return { list: [...pinned, ...rest], pinnedCount: pinned.length };
}

/**
 * How many shows after the pinned prefix air (in the season) sooner than the
 * latest pinned one, i.e. would move above some pinned card in a re-sort.
 */
export function soonerBelow(sorted: readonly AnimeMedia[], pinnedCount: number, win: SeasonWindow): number {
  if (pinnedCount <= 0) return 0;
  let latest = Number.NEGATIVE_INFINITY;
  for (const item of sorted.slice(0, pinnedCount)) latest = Math.max(latest, inSeasonAiringAt(item, win));
  let count = 0;
  for (const item of sorted.slice(pinnedCount)) {
    const at = inSeasonAiringAt(item, win);
    if (at !== Number.POSITIVE_INFINITY && at < latest) count++;
  }
  return count;
}

/**
 * How many leading cards to pin: every card whose top is above the bottom of
 * the viewport (on screen or scrolled past), or through the focused card if
 * that reaches further. `tops` are the cards' getBoundingClientRect().top, in
 * display order.
 */
export function pinnedPrefixLength(
  tops: readonly number[],
  viewportHeight: number,
  focusedIndex: number | null
): number {
  let count = 0;
  tops.forEach((top, index) => {
    if (top < viewportHeight) count = index + 1;
  });
  if (focusedIndex !== null && focusedIndex + 1 > count) count = focusedIndex + 1;
  return count;
}
