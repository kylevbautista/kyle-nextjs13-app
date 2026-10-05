/**
 * Airing-time helpers shared by every card and list view.
 *
 * All dates are shown in one fixed time zone so server and client render the
 * same text (no hydration mismatches). Countdowns are always computed from the
 * absolute `airingAt` timestamp, never from the stored relative
 * `timeUntilAiring` (which is stale as soon as it is saved).
 */
import type { AnimeMedia, UserAnimeData } from "./types";

export const DISPLAY_TIME_ZONE = "America/Los_Angeles";

export const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export type AiringFields = Pick<
  AnimeMedia,
  "upComingAirDate" | "upcomingEpisode" | "firstEpisode" | "status" | "episodes" | "startDate"
>;

/** The next scheduled episode, if AniList has one. `airingAt` is unix seconds. */
export function nextAiring(media: Partial<AiringFields> | null | undefined) {
  const node = media?.upComingAirDate?.episode?.[0];
  if (!node?.airingAt) return null;
  return {
    airingAt: node.airingAt,
    episode: node.episode ?? media?.upcomingEpisode?.episode ?? null,
  };
}

export const secondsUntil = (airingAt: number, nowMs: number) =>
  Math.max(0, Math.floor(airingAt - nowMs / 1000));

export function splitDuration(totalSeconds: number) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  return {
    d: Math.floor(seconds / 86_400),
    h: Math.floor((seconds % 86_400) / 3_600),
    m: Math.floor((seconds % 3_600) / 60),
    s: seconds % 60,
  };
}

/** "2d 3h 10m 4s" (days omitted when zero). */
export function formatCountdown(totalSeconds: number) {
  const { d, h, m, s } = splitDuration(totalSeconds);
  return `${d ? `${d}d ` : ""}${h}h ${m}m ${s}s`;
}

/** Short label for shows without an upcoming episode. */
export function airingStatusLabel(media: Partial<AiringFields> | null | undefined) {
  switch (media?.status) {
    case "FINISHED":
      return media.episodes ? `Finished · ${media.episodes} eps` : "Finished";
    case "NOT_YET_RELEASED":
      return "Not yet aired";
    case "RELEASING":
      return "Airing · next episode TBA";
    case "HIATUS":
      return "On hiatus";
    case "CANCELLED":
      return "Cancelled";
    default:
      return "Schedule unknown";
  }
}

const dateTimeFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: DISPLAY_TIME_ZONE,
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZoneName: "short",
});

/**
 * "Oct 3, 2026, 9:30 AM PDT". ICU versions differ on whether a narrow
 * no-break space (U+202F) precedes AM/PM, so normalize to plain spaces to keep
 * server- and browser-rendered text identical.
 */
export const formatAirDate = (unixSeconds: number) =>
  dateTimeFormat.format(new Date(unixSeconds * 1000)).replace(/[\u202F\u00A0]/g, " ");

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * The show's first-episode airing, when AniList's earliest schedule node is
 * it. `firstEpisode` is the earliest node AniList holds, not necessarily
 * episode 1 (Detective Conan's is EP 1067, from 2022), so it only counts when
 * it is episode 1, or for a show that hasn't aired yet (a second cour can be
 * numbered from 13).
 */
export function premiereAiring(media: Partial<AiringFields> | null | undefined) {
  const node = media?.firstEpisode?.episode?.[0];
  if (!node?.airingAt) return null;
  if (node.episode !== 1 && media?.status !== "NOT_YET_RELEASED") return null;
  return { airingAt: node.airingAt, episode: node.episode ?? null };
}

/** The next scheduled episode is the show's premiere (the "Premiere" badge). */
export function isPremiereNext(media: Partial<AiringFields> | null | undefined) {
  const next = nextAiring(media);
  if (!next) return false;
  if (next.episode === 1) return true;
  return media?.status === "NOT_YET_RELEASED" && premiereAiring(media)?.airingAt === next.airingAt;
}

/**
 * When the show premiered / premieres: the first episode's exact time when
 * AniList has it (premiereAiring), otherwise AniList's (possibly partial)
 * start date.
 */
export function premiereLabel(media: Partial<AiringFields> | null | undefined) {
  const first = premiereAiring(media)?.airingAt;
  if (first) return formatAirDate(first);
  const { year, month, day } = media?.startDate ?? {};
  if (!year) return "Premiere TBA";
  if (!month) return `${year}`;
  return day ? `${MONTHS[month - 1]} ${day}, ${year}` : `${MONTHS[month - 1]} ${year}`;
}

const weekdayFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: DISPLAY_TIME_ZONE,
  weekday: "long",
});

/** Weekday (in DISPLAY_TIME_ZONE) a show airs on: next episode, else its first. */
export function airingWeekday(media: Partial<AiringFields> | null | undefined): Weekday | null {
  const unix = nextAiring(media)?.airingAt ?? media?.firstEpisode?.episode?.[0]?.airingAt;
  if (!unix) return null;
  return weekdayFormat.format(new Date(unix * 1000)).toLowerCase() as Weekday;
}

/** Sort comparator: soonest next episode first; shows with no schedule last (stable). */
export function compareByNextAiring(
  a: Partial<AiringFields> | null | undefined,
  b: Partial<AiringFields> | null | undefined
) {
  const ta = nextAiring(a)?.airingAt ?? Number.POSITIVE_INFINITY;
  const tb = nextAiring(b)?.airingAt ?? Number.POSITIVE_INFINITY;
  return ta === tb ? 0 : ta < tb ? -1 : 1;
}

/**
 * Episodes aired so far, from the show's stored schedule: the next scheduled
 * episode's number minus one, plus that episode once its air time has passed
 * (when `nowMs` is given); for a finished show, its episode count (so the
 * count doesn't vanish the moment the finale airs); 0 for a show that hasn't
 * premiered while its next airing is still ahead and its own schedule holds no
 * earlier airing, whatever that episode's number (a second cour can be
 * numbered from 13; AniList's status can lag a premiere that has aired).
 * Null when it can't be known:
 * no numbered next episode on a show that hasn't finished, or a next episode
 * numbered past the known episode count (AniList sometimes numbers a split
 * cour continuously).
 *
 * `exact`: the count is also an upper bound, because the stored next episode
 * is still ahead (or the show has finished). Once that episode's air time has
 * passed, the stored schedule knows of no later one, so later episodes may
 * have aired since: the count is then only a lower bound until the snapshot
 * is refreshed (server/lib/userList.ts#refreshEntriesIfStale).
 *
 * Pass `nowMs = null` for a clock-free count (sorting, banner text) so server
 * and client agree; the live chip passes useNow().
 */
export function airedCount(
  media: Partial<AiringFields> | null | undefined,
  nowMs: number | null
): { aired: number; exact: boolean } | null {
  const next = nextAiring(media);
  const total = media?.episodes && media.episodes > 0 ? media.episodes : null;
  if (next?.episode) {
    if (total !== null && next.episode > total) return null;
    const ahead = nowMs === null || nowMs < next.airingAt * 1000;
    if (ahead) {
      // Unreleased and nothing earlier in its own schedule (AniList's status can lag a premiere).
      const first = media?.firstEpisode?.episode?.[0];
      const unaired = media?.status === "NOT_YET_RELEASED" && (!first?.airingAt || first.airingAt >= next.airingAt);
      return { aired: unaired ? 0 : next.episode - 1, exact: true };
    }
    return { aired: next.episode, exact: false };
  }
  if (!next && media?.status === "FINISHED" && total !== null) return { aired: total, exact: true };
  return null;
}

/** airedCount's number alone: the "N new" chip, the +1 cap and catch-ups count from it. */
export const airedEpisodes = (media: Partial<AiringFields> | null | undefined, nowMs: number | null) =>
  airedCount(media, nowMs)?.aired ?? null;

/**
 * Aired episodes not logged yet ("2 new") for a show being watched (Watching
 * or Paused): airedEpisodes minus progress. 0 when caught up (or logged ahead).
 * Null when it can't be known (airedEpisodes is null) or doesn't apply
 * (another status).
 */
export function unloggedAired(
  media: Partial<AiringFields> & { userData: Pick<UserAnimeData, "listType" | "episodeProgressNumber"> },
  nowMs: number | null
): number | null {
  const { listType, episodeProgressNumber } = media.userData;
  if (listType !== "watching" && listType !== "paused") return null;
  const aired = airedEpisodes(media, nowMs);
  return aired === null ? null : Math.max(0, aired - episodeProgressNumber);
}
