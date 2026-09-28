/**
 * "Continuing" shows: series that premiered in an earlier season and are still
 * airing during the one being browsed (2-cour shows, long runners like One Piece).
 *
 * AniList can't express "aired during this season" directly, so the season
 * query asks for two candidate lists (see allCurrAnimeTag.ts):
 * - ended:  started before the season, end date after it started (finished or announced)
 * - airing: started before the season, still RELEASING today (no end date yet)
 * selectCarryOver() merges and filters them.
 *
 * Known limit: for a past season, a series that was on a break for that whole
 * season but is airing again today still counts (AniList has no cheap way to
 * ask "did an episode air between these dates").
 */
import { nextAiring } from "./airing";
import type { AnimeMedia } from "./types";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
/** Past this episode number a show with no announced total is a long runner. */
const LONG_RUNNER_MIN_EPISODE = 26;
/** …or when it had been airing this long before the season starts. */
const LONG_RUNNER_HEAD_START_MS = 26 * WEEK_MS;
/** A new show with no announced total is assumed to run one cour. */
const ONE_COUR_EPISODES = 13;

const startMs = (media: AnimeMedia): number | null => {
  const { year, month, day } = media.startDate;
  return year ? Date.UTC(year, (month ?? 1) - 1, day ?? 1) : null;
};

/**
 * Best guess at when a still-airing show's last episode airs (epoch ms).
 * Infinity for long runners; null when there is nothing to go on.
 */
export function estimatedEndMs(media: AnimeMedia, seasonStart: number): number | null {
  const next = nextAiring(media);
  const started = startMs(media);
  let episodes = media.episodes;
  if (!episodes) {
    const longRunner =
      (next?.episode ?? 0) > LONG_RUNNER_MIN_EPISODE ||
      (started !== null && started <= seasonStart - LONG_RUNNER_HEAD_START_MS);
    if (longRunner) return Number.POSITIVE_INFINITY;
    episodes = Math.max(ONE_COUR_EPISODES, next?.episode ?? 0);
  }
  if (next) {
    return next.airingAt * 1000 + Math.max(0, episodes - (next.episode ?? episodes)) * WEEK_MS;
  }
  const firstAiring = media.firstEpisode?.episode?.[0]?.airingAt;
  const base = firstAiring ? firstAiring * 1000 : started;
  return base === null ? null : base + (episodes - 1) * WEEK_MS;
}

/** The next episode only comes after the whole season: nothing airs in it. */
const skipsSeason = (media: AnimeMedia, seasonEnd: number) => {
  const next = nextAiring(media);
  return next !== null && next.airingAt * 1000 >= seasonEnd;
};

/** For a season that hasn't started: will this still-airing show air during it? */
export function airsDuring(media: AnimeMedia, seasonStart: number, seasonEnd: number): boolean {
  if (skipsSeason(media, seasonEnd)) return false;
  const end = estimatedEndMs(media, seasonStart);
  return end !== null && end >= seasonStart;
}

export function selectCarryOver({
  ended,
  airing,
  seasonMedia,
  season,
  seasonStart,
  seasonEnd,
  now,
}: {
  ended: AnimeMedia[];
  airing: AnimeMedia[];
  /** Shows already in the season list; they are never "continuing". */
  seasonMedia: AnimeMedia[];
  /** The browsed season in AniList terms, e.g. { season: "FALL", year: 2026 }. */
  season: { season: string; year: number };
  seasonStart: number;
  seasonEnd: number;
  now: number;
}): AnimeMedia[] {
  const seen = new Set(seasonMedia.map((media) => media.id));
  const started = now >= seasonStart;
  const picked: AnimeMedia[] = [];
  const add = (media: AnimeMedia) => {
    const start = startMs(media);
    if (seen.has(media.id) || start === null || start >= seasonStart) return;
    // AniList files it under this season (e.g. a late-September premiere under
    // FALL): it belongs to the season's own pages, not "continuing".
    if (media.season === season.season && media.seasonYear === season.year) return;
    seen.add(media.id);
    picked.push(media);
  };
  // `ended` entries end after the season starts (announced or actual).
  ended.filter((media) => started || !skipsSeason(media, seasonEnd)).forEach(add);
  // `airing` is "still releasing today": certain for current/past seasons, an
  // estimate for a season that hasn't started.
  airing.filter((media) => started || airsDuring(media, seasonStart, seasonEnd)).forEach(add);
  return picked.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
}
