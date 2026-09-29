import { describe, expect, it } from "vitest";
import { DEFAULT_USER_DATA, type ListEntry, type ListStatus } from "@/lib/anime/types";
import { buildSchedule, weekdayAt } from "./schedule";

// Mon Sep 28 2026 19:00 PDT (Tue 02:00 UTC) — a Monday in PT, Tuesday in UTC.
const MON_EVENING_PT = Date.UTC(2026, 8, 29, 2, 0) / 1000;
const TUE_MORNING_PT = Date.UTC(2026, 8, 29, 16, 0) / 1000;
const NEXT_MON_PT = MON_EVENING_PT + 7 * 86_400;

let nextId = 1;
const entry = (
  title: string,
  {
    airingAt = null,
    firstAiredAt = null,
    status = "watching",
    mediaStatus = "RELEASING",
  }: {
    airingAt?: number | null;
    firstAiredAt?: number | null;
    status?: ListStatus;
    mediaStatus?: string;
  } = {}
): ListEntry =>
  ({
    id: nextId++,
    title: { romaji: title, english: null, native: null },
    status: mediaStatus,
    episodes: 12,
    upcomingEpisode: null,
    upComingAirDate: { episode: airingAt ? [{ airingAt, episode: 3 }] : [] },
    firstEpisode: { episode: firstAiredAt ? [{ airingAt: firstAiredAt, episode: 1 }] : [] },
    userData: { ...DEFAULT_USER_DATA, listType: status },
  }) as unknown as ListEntry;

describe("buildSchedule", () => {
  it("groups airing shows by their Pacific Time weekday, soonest first", () => {
    const later = entry("Later Monday", { airingAt: NEXT_MON_PT });
    const sooner = entry("Sooner Monday", { airingAt: MON_EVENING_PT });
    const tuesday = entry("Tuesday", { airingAt: TUE_MORNING_PT, status: "planning" });

    const schedule = buildSchedule([later, sooner, tuesday]);

    expect(schedule.days.monday.map((e) => e.id)).toEqual([sooner.id, later.id]);
    expect(schedule.days.tuesday.map((e) => e.id)).toEqual([tuesday.id]);
    expect(schedule.airingCount).toBe(3);
    expect(schedule.notAiring).toEqual([]);
  });

  it("keeps carry-over shows that premiered in an earlier season", () => {
    const longRunner = entry("Long runner", {
      airingAt: TUE_MORNING_PT,
      firstAiredAt: Date.UTC(2020, 0, 5) / 1000,
    });
    expect(buildSchedule([longRunner]).days.tuesday).toHaveLength(1);
  });

  it("drops dropped shows and moves completed / unscheduled ones to notAiring", () => {
    const dropped = entry("Dropped", { airingAt: TUE_MORNING_PT, status: "dropped" });
    const completed = entry("Completed", { airingAt: TUE_MORNING_PT, status: "completed" });
    const finished = entry("Finished", { mediaStatus: "FINISHED" });
    const upcoming = entry("Upcoming", { status: "planning", mediaStatus: "NOT_YET_RELEASED" });

    const schedule = buildSchedule([dropped, completed, finished, upcoming]);

    expect(schedule.airingCount).toBe(0);
    // Sorted by list status (watching, planning, …, completed), then title.
    expect(schedule.notAiring.map((e) => e.id)).toEqual([finished.id, upcoming.id, completed.id]);
  });
});

describe("weekdayAt", () => {
  it("uses Pacific Time, not UTC", () => {
    expect(weekdayAt(MON_EVENING_PT * 1000)).toBe("monday");
    expect(weekdayAt(TUE_MORNING_PT * 1000)).toBe("tuesday");
  });
});
