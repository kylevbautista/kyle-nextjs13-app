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
