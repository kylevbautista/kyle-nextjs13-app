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
 * When the show premiered / premieres: the first aired episode's exact time
 * when known, otherwise AniList's (possibly partial) start date.
 */
export function premiereLabel(media: Partial<AiringFields> | null | undefined) {
  const first = media?.firstEpisode?.episode?.[0]?.airingAt;
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
 * Aired episodes not logged yet ("2 new") for a show being watched (Watching
 * or Paused): the next scheduled episode's number minus one, plus that episode
 * once its air time has passed (when `nowMs` is given), minus progress; for a
 * finished show, its episode count minus progress (so the count doesn't vanish
 * the moment the finale airs). 0 when caught up. Null when it can't be known
 * or doesn't apply: another status, no numbered next episode on a show that
 * hasn't finished, or more "aired" than the known episode count (AniList
 * sometimes numbers a split cour continuously).
 *
 * Pass `nowMs = null` for a clock-free count (sorting, banner text) so server
 * and client agree; the live chip passes useNow().
 */
export function unloggedAired(
  media: Partial<AiringFields> & { userData: Pick<UserAnimeData, "listType" | "episodeProgressNumber"> },
  nowMs: number | null
): number | null {
  const { listType, episodeProgressNumber } = media.userData;
  if (listType !== "watching" && listType !== "paused") return null;
  const next = nextAiring(media);
  const total = media.episodes && media.episodes > 0 ? media.episodes : null;
  let aired: number;
  if (next?.episode) aired = next.episode - 1 + (nowMs !== null && nowMs >= next.airingAt * 1000 ? 1 : 0);
  else if (!next && media.status === "FINISHED" && total !== null) aired = total;
  else return null;
  if (total !== null && aired > total) return null;
  return Math.max(0, aired - episodeProgressNumber);
}
