import { calendarDayMs } from "@/lib/anime/normalize";
import {
  DISPLAY_TIME_ZONE,
  MONTHS,
  WEEKDAYS,
  airingWeekday,
  compareByNextAiring,
  nextAiring,
  type AiringFields,
  type Weekday,
} from "@/lib/anime/airing";
import { LIST_STATUSES, displayTitle, type ListEntry, type ListStatus } from "@/lib/anime/types";

/** Weekly schedule order (the airing helpers' WEEKDAYS starts on Sunday). */
export const SCHEDULE_DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const satisfies readonly Weekday[];

export const DAY_LABELS: Record<Weekday, { short: string; long: string }> = {
  monday: { short: "Mon", long: "Monday" },
  tuesday: { short: "Tue", long: "Tuesday" },
  wednesday: { short: "Wed", long: "Wednesday" },
  thursday: { short: "Thu", long: "Thursday" },
  friday: { short: "Fri", long: "Friday" },
  saturday: { short: "Sat", long: "Saturday" },
  sunday: { short: "Sun", long: "Sunday" },
};

/** Statuses that never appear on the weekly schedule, even while the show airs. */
const OFF_SCHEDULE: ReadonlySet<ListStatus> = new Set(["dropped", "completed"]);

export interface AiringScheduleData {
  /** Airing entries per weekday (Pacific Time), soonest next episode first. */
  days: Record<Weekday, ListEntry[]>;
  airingCount: number;
  /** Every other non-dropped entry: finished, not yet aired, TBA, completed. */
  notAiring: ListEntry[];
}

// A fixed locale: the default one differs between Node (SSR) and the browser,
// which would reorder the list during hydration.
const titleCollator = new Intl.Collator("en", { sensitivity: "base", numeric: true });

const compareNotAiring = (a: ListEntry, b: ListEntry) =>
  LIST_STATUSES.indexOf(a.userData.listType) - LIST_STATUSES.indexOf(b.userData.listType) ||
  titleCollator.compare(displayTitle(a), displayTitle(b));

export function buildSchedule(entries: readonly ListEntry[]): AiringScheduleData {
  const days = Object.fromEntries(SCHEDULE_DAYS.map((day) => [day, [] as ListEntry[]])) as Record<
    Weekday,
    ListEntry[]
  >;
  const notAiring: ListEntry[] = [];
  let airingCount = 0;

  for (const entry of entries) {
    const status = entry.userData?.listType;
    if (status === "dropped") continue;
    const day = !OFF_SCHEDULE.has(status) && nextAiring(entry) ? airingWeekday(entry) : null;
    if (day) {
      days[day].push(entry);
      airingCount++;
    } else {
      notAiring.push(entry);
    }
  }

  for (const day of SCHEDULE_DAYS) days[day].sort(compareByNextAiring);
  notAiring.sort(compareNotAiring);
  return { days, airingCount, notAiring };
}

const weekdayFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: DISPLAY_TIME_ZONE,
  weekday: "long",
});

/** The weekday of `nowMs` in the display time zone (Pacific Time). */
export const weekdayAt = (nowMs: number) =>
  weekdayFormat.format(new Date(nowMs)).toLowerCase() as Weekday;

// ---------------------------------------------------------------------------
// The banner's day-aware Great Sage line
// ---------------------------------------------------------------------------

/** Matches CountdownText's "Airing now" window (lib/landing.ts AIRED_GRACE_SECONDS). */
const ON_AIR_SECONDS = 30 * 60;
const DAY_MS = 24 * 60 * 60 * 1000;

const timeFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: DISPLAY_TIME_ZONE,
  hour: "numeric",
  minute: "2-digit",
});
/** "7:30 AM" in Pacific Time (plain spaces, so server and browser match). */
export const formatTime = (unixSeconds: number) =>
  timeFormat.format(new Date(unixSeconds * 1000)).replace(/[\u202F\u00A0]/g, " ");

const clip = (text: string, max = 40) =>
  Array.from(text).length > max ? `${Array.from(text).slice(0, max - 1).join("").trimEnd()}…` : text;

const episodes = (n: number) => `${n} ${n === 1 ? "episode" : "episodes"}`;

export interface ScheduleLine {
  kind: "Notice" | "Report";
  text: string;
}

/**
 * The Airing Schedule's banner line for this moment (Pacific Time days):
 * - something on air (within 30 min of its air time): "Now airing: X, EP 12."
 * - more later today: "Today: 2 episodes left, the next at 7:30 AM PT."
 * - none left today: "Nothing more airs today. Tomorrow: 3 episodes."
 * - otherwise the standing line, `fallback`.
 * `entries` are the schedule's shows (each with a next episode).
 */
export function scheduleLine(
  entries: readonly ListEntry[],
  nowMs: number,
  fallback: string
): ScheduleLine {
  const nowSeconds = Math.floor(nowMs / 1000);
  const today = calendarDayMs(nowMs);
  const upcoming = entries
    .map((entry) => ({ entry, next: nextAiring(entry) }))
    .filter((item): item is { entry: ListEntry; next: NonNullable<ReturnType<typeof nextAiring>> } => item.next !== null)
    .sort((a, b) => a.next.airingAt - b.next.airingAt);

  const onAir = upcoming.find(
    ({ next }) => nowSeconds >= next.airingAt && nowSeconds < next.airingAt + ON_AIR_SECONDS
  );
  if (onAir) {
    const episode = onAir.next.episode ? `, EP ${onAir.next.episode}` : "";
    return { kind: "Notice", text: `Now airing: ${clip(displayTitle(onAir.entry))}${episode}.` };
  }

  const later = upcoming.filter(({ next }) => next.airingAt > nowSeconds && calendarDayMs(next.airingAt * 1000) === today);
  if (later.length) {
    return {
      kind: "Report",
      text: `Today: ${episodes(later.length)} left, the next at ${formatTime(later[0].next.airingAt)} PT.`,
    };
  }

  const tomorrow = upcoming.filter(({ next }) => calendarDayMs(next.airingAt * 1000) === today + DAY_MS);
  if (tomorrow.length) {
    return { kind: "Report", text: `Nothing more airs today. Tomorrow: ${episodes(tomorrow.length)}.` };
  }
  return { kind: "Notice", text: fallback };
}

// ---------------------------------------------------------------------------
// Which rows really air on their day this week
// ---------------------------------------------------------------------------

/**
 * A weekday's rows from this many Pacific Time calendar days out are "later":
 * past this coming occurrence of their weekday (7 = next week's, even at a
 * 6d 23h countdown).
 */
export const LATER_FROM_DAYS = 7;

// Whole days between two calendarDayMs values (UTC midnights, so DST can't skew them).
const daysBetween = (fromDayMs: number, toDayMs: number) => Math.round((toDayMs - fromDayMs) / DAY_MS);

/** Pacific Time calendar days from `nowMs`'s day to the episode's (negative: a day already past). */
export const scheduleDayOffset = (airingAt: number, nowMs: number) =>
  daysBetween(calendarDayMs(nowMs), calendarDayMs(airingAt * 1000));

/** "Oct 22" for a calendarDayMs value (UTC midnight of the Pacific Time date). */
function monthDay(dayMs: number) {
  const date = new Date(dayMs);
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}`;
}

export interface ScheduleWhen {
  kind: "today" | "tomorrow" | "yesterday" | "weekday" | "date";
  /** "Today", "Tomorrow", "Yesterday", "Sat" (this coming one), "Oct 22", "Jan 7, 2027". */
  day: string;
  /** "9:30 AM" (Pacific Time). */
  time: string;
}

/**
 * The day a schedule row's next episode airs, relative to today (Pacific Time
 * calendar days): Today, Tomorrow, Yesterday (an air time AniList hasn't
 * rolled yet), the weekday 2–6 days out, else the date. The date leaves out
 * the weekday because every row sits under its own weekday's tab or heading
 * (add it back before reusing this elsewhere). Names come from tables, never
 * Intl text, so the server and every browser print the same ASCII.
 *
 * `relative: false` (a page with no live clock yet, such as the landing's
 * cached HTML, which can be served after PT midnight) uses absolute labels
 * only: the weekday 0–6 days out, else the date.
 */
export function scheduleWhen(airingAt: number, nowMs: number, relative = true): ScheduleWhen {
  const time = formatTime(airingAt);
  const dayMs = calendarDayMs(airingAt * 1000);
  const todayMs = calendarDayMs(nowMs);
  const offset = daysBetween(todayMs, dayMs);
  if (relative && offset === 0) return { kind: "today", day: "Today", time };
  if (relative && offset === 1) return { kind: "tomorrow", day: "Tomorrow", time };
  if (relative && offset === -1) return { kind: "yesterday", day: "Yesterday", time };
  if (offset >= 0 && offset < LATER_FROM_DAYS) {
    return { kind: "weekday", day: DAY_LABELS[WEEKDAYS[new Date(dayMs).getUTCDay()]].short, time };
  }
  const year = new Date(dayMs).getUTCFullYear();
  const day = year === new Date(todayMs).getUTCFullYear() ? monthDay(dayMs) : `${monthDay(dayMs)}, ${year}`;
  return { kind: "date", day, time };
}

/** A row's episode: "Premiere", "EP 9", or "Next EP" when AniList gives no number. */
export const episodeLabel = (episode: number | null) =>
  episode === 1 ? "Premiere" : episode ? `EP ${episode}` : "Next EP";

/**
 * A schedule row's time line as the units it wraps by: ["EP 9 ·", "Oct 22,",
 * "9:30 AM PT"], ["Premiere ·", "Today", "9:45 AM PT"].
 */
export const scheduleTimeLine = (episode: number | null, { kind, day, time }: ScheduleWhen) =>
  [`${episodeLabel(episode)} ·`, kind === "date" ? `${day},` : day, `${time} PT`] as const;

/**
 * One weekday's rows (soonest first) split at this coming occurrence of the
 * day: `later` are the rows LATER_FROM_DAYS or more days out, so a suffix of
 * a day sorted by next airing. Past air times and rows without one stay in
 * `coming`.
 */
export function splitLaterWeeks<T extends Partial<AiringFields>>(
  rows: readonly T[],
  nowMs: number
): { coming: T[]; later: T[] } {
  const coming: T[] = [];
  const later: T[] = [];
  for (const row of rows) {
    const next = nextAiring(row);
    (next && scheduleDayOffset(next.airingAt, nowMs) >= LATER_FROM_DAYS ? later : coming).push(row);
  }
  return { coming, later };
}

/**
 * The divider above a weekday's later rows: "Thursdays after today" on
 * today's weekday, else "Fridays after Oct 16" (this coming Friday). True of
 * every row below it, and it dates the rows above it. Without a live clock
 * (`relative: false`) today is dated too ("Thursdays after Oct 15").
 */
export function laterHeading(day: Weekday, nowMs: number, relative = true) {
  const plural = `${DAY_LABELS[day].long}s`;
  const todayMs = calendarDayMs(nowMs);
  const ahead = (WEEKDAYS.indexOf(day) - new Date(todayMs).getUTCDay() + 7) % 7;
  return `${plural} after ${ahead === 0 && relative ? "today" : monthDay(todayMs + ahead * DAY_MS)}`;
}

/**
 * Today's tab when nothing on it airs today (its rows are all later). It
 * speaks of the schedule, not the list: a completed show that still airs is
 * on the list but off the schedule.
 */
export const nothingMoreTodayLine = (scope: "on this schedule" | "in this preview") =>
  `Nothing more ${scope} airs today.`;

/**
 * Whether a day opens with nothingMoreTodayLine: today's weekday, nothing
 * coming, something later. Never without a live clock (`relative: false`):
 * a cached page can't know what "today" is when it is read.
 */
export const showsNothingMoreToday = (
  day: Weekday,
  { coming, later }: { coming: readonly unknown[]; later: readonly unknown[] },
  nowMs: number,
  relative = true
) => relative && coming.length === 0 && later.length > 0 && day === weekdayAt(nowMs);

/** The week panel's tab from ?day= ("all", "mon"…"sun"), or null for the default day. */
export function parseDayParam(value: string | null): Weekday | "all" | null {
  if (value === "all") return "all";
  const day = SCHEDULE_DAYS.find((d) => DAY_LABELS[d].short.toLowerCase() === value);
  return day ?? null;
}

/** ?day= for a tab ("" for the default day). */
export const dayParam = (tab: Weekday | "all" | null) =>
  tab === null ? "" : `?day=${tab === "all" ? "all" : DAY_LABELS[tab].short.toLowerCase()}`;
