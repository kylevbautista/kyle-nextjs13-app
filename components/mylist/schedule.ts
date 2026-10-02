import { calendarDayMs } from "@/lib/anime/normalize";
import {
  DISPLAY_TIME_ZONE,
  airingWeekday,
  compareByNextAiring,
  nextAiring,
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
const formatTime = (unixSeconds: number) =>
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

/** The week panel's tab from ?day= ("all", "mon"…"sun"), or null for the default day. */
export function parseDayParam(value: string | null): Weekday | "all" | null {
  if (value === "all") return "all";
  const day = SCHEDULE_DAYS.find((d) => DAY_LABELS[d].short.toLowerCase() === value);
  return day ?? null;
}

/** ?day= for a tab ("" for the default day). */
export const dayParam = (tab: Weekday | "all" | null) =>
  tab === null ? "" : `?day=${tab === "all" ? "all" : DAY_LABELS[tab].short.toLowerCase()}`;
