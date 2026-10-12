import { describe, expect, it } from "vitest";
import { DEFAULT_USER_DATA, type ListEntry, type ListStatus } from "@/lib/anime/types";
import {
  buildSchedule,
  dayParam,
  episodeLabel,
  laterHeading,
  nothingMoreTodayLine,
  parseDayParam,
  scheduleDayOffset,
  scheduleLine,
  scheduleTimeLine,
  scheduleWhen,
  showsNothingMoreToday,
  splitLaterWeeks,
  weekdayAt,
} from "./schedule";

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

describe("scheduleLine", () => {
  // Thu Oct 1 2026, 9:00 AM PDT = 16:00 UTC.
  const NOW = Date.UTC(2026, 9, 1, 16, 0);
  const at = (hoursFromNow: number) => NOW / 1000 + hoursFromNow * 3600;
  const fallback = "Thought Acceleration: your week, computed in Pacific Time.";

  it("names the show on air, for the 30 minutes CountdownText calls it airing", () => {
    const line = scheduleLine([entry("Frieren", { airingAt: at(-0.2) }), entry("Later", { airingAt: at(2) })], NOW, fallback);
    expect(line).toEqual({ kind: "Notice", text: "Now airing: Frieren, EP 3." });
    expect(scheduleLine([entry("Old", { airingAt: at(-0.6) })], NOW, fallback).text).toBe(fallback);
  });

  it("counts what's left today in Pacific Time, with the next time", () => {
    // 9:30 AM and 11 PM PDT are both still Thursday in PT (11 PM is Friday in UTC).
    const line = scheduleLine([entry("A", { airingAt: at(14) }), entry("B", { airingAt: at(0.5) })], NOW, fallback);
    expect(line).toEqual({ kind: "Report", text: "Today: 2 episodes left, the next at 9:30 AM PT." });
  });

  it("points to tomorrow when today is done", () => {
    const line = scheduleLine([entry("A", { airingAt: at(20) }), entry("B", { airingAt: at(40) })], NOW, fallback);
    // 5 AM PDT Friday (tomorrow) and 1 AM PDT Saturday.
    expect(line).toEqual({ kind: "Report", text: "Nothing more airs today. Tomorrow: 1 episode." });
  });

  it("falls back to the standing line, and clips long titles", () => {
    expect(scheduleLine([entry("A", { airingAt: at(60) })], NOW, fallback)).toEqual({ kind: "Notice", text: fallback });
    const long = "As a Reincarnated Aristocrat, I'll Use My Appraisal Skill to Rise in the World";
    const text = scheduleLine([entry(long, { airingAt: at(-0.1) })], NOW, fallback).text;
    expect(text).toBe("Now airing: As a Reincarnated Aristocrat, I'll Use…, EP 3.");
  });
});

describe("?day= for the week panel", () => {
  it("round-trips the tabs and ignores anything else", () => {
    expect(parseDayParam("all")).toBe("all");
    expect(parseDayParam("thu")).toBe("thursday");
    expect(parseDayParam("Thursday")).toBeNull();
    expect(parseDayParam(null)).toBeNull();
    expect(dayParam("thursday")).toBe("?day=thu");
    expect(dayParam("all")).toBe("?day=all");
    expect(dayParam(null)).toBe("");
  });
});

// Pacific wall-clock times as unix seconds: PDT (UTC−7) until Nov 1 2026, PST (UTC−8) after.
const pdt = (month: number, day: number, hour: number, minute = 0) => Date.UTC(2026, month - 1, day, hour + 7, minute) / 1000;
const pst = (year: number, month: number, day: number, hour: number, minute = 0) =>
  Date.UTC(year, month - 1, day, hour + 8, minute) / 1000;
// Thu Oct 15 2026, 10:00 AM PDT (the rig's "now").
const THU = pdt(10, 15, 10) * 1000;

describe("scheduleDayOffset", () => {
  it("counts Pacific Time calendar days, not 24-hour spans", () => {
    expect(scheduleDayOffset(TUE_MORNING_PT, MON_EVENING_PT * 1000)).toBe(1);
    // Next Thursday at a 6d 23h 30m countdown is still a week out.
    expect(scheduleDayOffset(pdt(10, 22, 9, 30), THU)).toBe(7);
    expect(scheduleDayOffset(pdt(10, 14, 18), THU)).toBe(-1);
  });

  it("is DST-safe", () => {
    // Sat Oct 31 10 AM PDT → Sat Nov 7 9 AM PST: a week, though 168 hours.
    expect(scheduleDayOffset(pst(2026, 11, 7, 9), pdt(10, 31, 10) * 1000)).toBe(7);
    // Sun Nov 1 is 25 hours long: 12:30 AM PDT and 11:30 PM PST are the same day.
    expect(scheduleDayOffset(pst(2026, 11, 1, 23, 30), pdt(11, 1, 0, 30) * 1000)).toBe(0);
    // Sun Mar 7 2027 11:30 PM PST → Sun Mar 14 11 PM PDT (06:00 UTC on the 15th).
    expect(scheduleDayOffset(Date.UTC(2027, 2, 15, 6) / 1000, pst(2027, 3, 7, 23, 30) * 1000)).toBe(7);
  });
});

describe("scheduleWhen", () => {
  // The rendered line minus its episode unit ("EP 9 ·").
  const text = (airingAt: number, nowMs = THU, relative = true) =>
    scheduleTimeLine(9, scheduleWhen(airingAt, nowMs, relative)).slice(1).join(" ");

  it("names the day relative to today", () => {
    expect(scheduleWhen(pdt(10, 15, 12, 30), THU)).toEqual({ kind: "today", day: "Today", time: "12:30 PM" });
    expect(text(pdt(10, 15, 9, 45))).toBe("Today 9:45 AM PT"); // aired, not rolled yet
    expect(text(pdt(10, 16, 1))).toBe("Tomorrow 1:00 AM PT");
    expect(text(pdt(10, 14, 18))).toBe("Yesterday 6:00 PM PT");
    expect(text(pdt(10, 17, 8))).toBe("Sat 8:00 AM PT");
    // Wed 10 PM PDT is Thursday in UTC; 6 days out is still this coming Wednesday.
    expect(scheduleWhen(pdt(10, 21, 22), THU)).toEqual({ kind: "weekday", day: "Wed", time: "10:00 PM" });
  });

  it("dates rows a week or more away, and past ones before yesterday", () => {
    expect(scheduleWhen(pdt(10, 22, 9, 30), THU)).toEqual({ kind: "date", day: "Oct 22", time: "9:30 AM" });
    expect(text(pdt(10, 22, 9, 30))).toBe("Oct 22, 9:30 AM PT");
    expect(text(pst(2026, 11, 5, 9))).toBe("Nov 5, 9:00 AM PT");
    expect(text(pdt(10, 12, 18))).toBe("Oct 12, 6:00 PM PT");
    // 11:30 PM PST on Jan 7 is Jan 8 in UTC; the year shows because it isn't this one.
    expect(text(pst(2027, 1, 7, 23, 30))).toBe("Jan 7, 2027, 11:30 PM PT");
  });

  it("flips at Pacific midnight", () => {
    const friEarly = pdt(10, 16, 0, 10);
    expect(text(friEarly, pdt(10, 15, 23, 50) * 1000)).toBe("Tomorrow 12:10 AM PT");
    expect(text(friEarly, pdt(10, 16, 0) * 1000)).toBe("Today 12:10 AM PT");
  });

  it("adds the year by the Pacific Time year, not UTC's", () => {
    const monDec28 = pst(2026, 12, 28, 10) * 1000;
    expect(text(pst(2027, 1, 2, 9), monDec28)).toBe("Sat 9:00 AM PT");
    expect(text(pst(2027, 1, 4, 9), monDec28)).toBe("Jan 4, 2027, 9:00 AM PT");
    // Thu Dec 31 2026, 5 PM PST is already 2027 in UTC.
    expect(text(pst(2026, 12, 24, 9), pst(2026, 12, 31, 17) * 1000)).toBe("Dec 24, 9:00 AM PT");
  });

  it("uses absolute labels without a live clock (the landing's cached HTML)", () => {
    expect(text(pdt(10, 15, 12, 30), THU, false)).toBe("Thu 12:30 PM PT");
    expect(text(pdt(10, 16, 1), THU, false)).toBe("Fri 1:00 AM PT");
    expect(text(pdt(10, 21, 22), THU, false)).toBe("Wed 10:00 PM PT");
    // A past day never gets a bare weekday: it would read as the coming one.
    expect(text(pdt(10, 14, 18), THU, false)).toBe("Oct 14, 6:00 PM PT");
    expect(text(pdt(10, 22, 9, 30), THU, false)).toBe("Oct 22, 9:30 AM PT");
  });

  it("prints plain ASCII, so server and browser text match", () => {
    const times = [pdt(10, 15, 9, 45), pdt(10, 16, 1), pdt(10, 14, 18), pdt(10, 17, 8), pdt(10, 22, 9, 30), pst(2027, 1, 7, 23, 30)];
    for (const airingAt of times) expect(text(airingAt)).toMatch(/^[\x20-\x7E]+$/);
  });
});

describe("scheduleTimeLine", () => {
  it("names the episode, then the day and time, as the units the line wraps by", () => {
    expect(episodeLabel(1)).toBe("Premiere");
    expect(episodeLabel(null)).toBe("Next EP");
    expect(scheduleTimeLine(9, scheduleWhen(pdt(10, 22, 9, 30), THU))).toEqual(["EP 9 ·", "Oct 22,", "9:30 AM PT"]);
    expect(scheduleTimeLine(1, scheduleWhen(pdt(10, 15, 9, 45), THU))).toEqual(["Premiere ·", "Today", "9:45 AM PT"]);
    expect(scheduleTimeLine(null, scheduleWhen(pst(2027, 1, 7, 23, 30), THU)).join(" ")).toBe(
      "Next EP · Jan 7, 2027, 11:30 PM PT"
    );
  });
});

describe("splitLaterWeeks", () => {
  it("moves rows a week or more out after the rest, keeping the order", () => {
    const rows = [
      entry("Past week", { airingAt: pdt(10, 8, 9) }),
      entry("Yesterday", { airingAt: pdt(10, 14, 18) }),
      entry("Today", { airingAt: pdt(10, 15, 9, 45) }),
      entry("Six days", { airingAt: pdt(10, 21, 22) }),
      entry("Seven days", { airingAt: pdt(10, 22, 9, 30) }),
      entry("Three weeks", { airingAt: pst(2026, 11, 5, 9) }),
      entry("No schedule"),
    ];
    const titles = (list: ListEntry[]) => list.map((e) => e.title.romaji);
    const { coming, later } = splitLaterWeeks(rows, THU);
    expect(titles(coming)).toEqual(["Past week", "Yesterday", "Today", "Six days", "No schedule"]);
    expect(titles(later)).toEqual(["Seven days", "Three weeks"]);
  });
});

describe("laterHeading", () => {
  it("is today's weekday after today, or another weekday after its coming date", () => {
    expect(laterHeading("thursday", THU)).toBe("Thursdays after today");
    expect(laterHeading("friday", THU)).toBe("Fridays after Oct 16");
    expect(laterHeading("sunday", THU)).toBe("Sundays after Oct 18");
    expect(laterHeading("wednesday", THU)).toBe("Wednesdays after Oct 21");
  });

  it("uses Pacific Time days, across DST and the new year (no year shown)", () => {
    expect(laterHeading("monday", MON_EVENING_PT * 1000)).toBe("Mondays after today");
    expect(laterHeading("tuesday", MON_EVENING_PT * 1000)).toBe("Tuesdays after Sep 29");
    expect(laterHeading("sunday", pdt(10, 29, 12) * 1000)).toBe("Sundays after Nov 1");
    expect(laterHeading("friday", pst(2026, 12, 30, 12) * 1000)).toBe("Fridays after Jan 1");
  });

  it("dates today too without a live clock", () => {
    expect(laterHeading("thursday", THU, false)).toBe("Thursdays after Oct 15");
    expect(laterHeading("friday", THU, false)).toBe("Fridays after Oct 16");
  });
});

describe("showsNothingMoreToday", () => {
  const later = [entry("Next Thursday", { airingAt: pdt(10, 22, 9, 30) })];
  const coming = [entry("Today", { airingAt: pdt(10, 15, 9, 45) })];

  it("is true only on today's weekday, with nothing coming and something later", () => {
    expect(showsNothingMoreToday("thursday", { coming: [], later }, THU)).toBe(true);
    expect(showsNothingMoreToday("friday", { coming: [], later }, THU)).toBe(false);
    expect(showsNothingMoreToday("thursday", { coming, later }, THU)).toBe(false);
    expect(showsNothingMoreToday("thursday", { coming: [], later: [] }, THU)).toBe(false);
  });

  it("never shows without a live clock", () => {
    expect(showsNothingMoreToday("thursday", { coming: [], later }, THU, false)).toBe(false);
  });
});

describe("nothingMoreTodayLine", () => {
  it("speaks of the schedule (or the landing's preview), not the list", () => {
    expect(nothingMoreTodayLine("on this schedule")).toBe("Nothing more on this schedule airs today.");
    expect(nothingMoreTodayLine("in this preview")).toBe("Nothing more in this preview airs today.");
  });
});
