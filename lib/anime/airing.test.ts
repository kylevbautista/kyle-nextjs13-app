import { describe, expect, it } from "vitest";
import {
  airingStatusLabel,
  airingWeekday,
  compareByNextAiring,
  formatAirDate,
  formatCountdown,
  nextAiring,
  premiereLabel,
  secondsUntil,
} from "./airing";

// Thu Oct 1 2026 16:30 UTC = 9:30 AM PDT, and Fri Oct 2 00:30 UTC = Thu 5:30 PM PDT
const THU_MORNING = Date.UTC(2026, 9, 1, 16, 30) / 1000;
const THU_EVENING_PT = Date.UTC(2026, 9, 2, 0, 30) / 1000;

describe("nextAiring / secondsUntil / formatCountdown", () => {
  it("uses the absolute airingAt timestamp", () => {
    const media = {
      upComingAirDate: { episode: [{ airingAt: THU_MORNING, episode: 5, timeUntilAiring: 999 }] },
    };
    expect(nextAiring(media)).toEqual({ airingAt: THU_MORNING, episode: 5 });
    expect(secondsUntil(THU_MORNING, (THU_MORNING - 93_784) * 1000)).toBe(93_784);
    expect(formatCountdown(93_784)).toBe("1d 2h 3m 4s");
    expect(formatCountdown(59)).toBe("0h 0m 59s");
    expect(secondsUntil(THU_MORNING, (THU_MORNING + 10) * 1000)).toBe(0);
  });

  it("returns null without a schedule", () => {
    expect(nextAiring({ upComingAirDate: { episode: [] } })).toBeNull();
    expect(nextAiring(null)).toBeNull();
  });
});

describe("formatAirDate / premiereLabel", () => {
  it("formats in Pacific time with a consistent calendar date", () => {
    expect(formatAirDate(THU_MORNING)).toBe("Oct 1, 2026, 9:30 AM PDT");
    // 00:30 UTC on Oct 2 is still Oct 1 in Los Angeles (the old code said Oct 2).
    expect(formatAirDate(THU_EVENING_PT)).toBe("Oct 1, 2026, 5:30 PM PDT");
  });

  it("falls back to the start date, never 'Invalid Date'", () => {
    expect(premiereLabel({ firstEpisode: { episode: [] }, startDate: { year: 2027, month: 1, day: 8 } })).toBe(
      "Jan 8, 2027"
    );
    expect(premiereLabel({ firstEpisode: { episode: [] }, startDate: { year: 2027, month: 4, day: null } })).toBe(
      "Apr 2027"
    );
    expect(premiereLabel({ firstEpisode: { episode: [] }, startDate: { year: null, month: null, day: null } })).toBe(
      "Premiere TBA"
    );
  });
});

describe("airingWeekday", () => {
  it("uses the Pacific weekday of the next episode, else the first", () => {
    expect(airingWeekday({ upComingAirDate: { episode: [{ airingAt: THU_EVENING_PT, episode: 2 }] } })).toBe(
      "thursday"
    );
    expect(
      airingWeekday({
        upComingAirDate: { episode: [] },
        firstEpisode: { episode: [{ airingAt: THU_MORNING, episode: 1 }] },
      })
    ).toBe("thursday");
    expect(airingWeekday({})).toBeNull();
  });
});

describe("airingStatusLabel", () => {
  it("describes shows without a countdown", () => {
    expect(airingStatusLabel({ status: "FINISHED", episodes: 12 })).toBe("Finished · 12 eps");
    expect(airingStatusLabel({ status: "NOT_YET_RELEASED" })).toBe("Not yet aired");
    expect(airingStatusLabel({ status: "HIATUS" })).toBe("On hiatus");
  });
});

describe("compareByNextAiring", () => {
  it("sorts soonest first and unscheduled last", () => {
    const later = { upComingAirDate: { episode: [{ airingAt: THU_EVENING_PT, episode: 1 }] } };
    const sooner = { upComingAirDate: { episode: [{ airingAt: THU_MORNING, episode: 1 }] } };
    const none = { upComingAirDate: { episode: [] } };
    expect([none, later, sooner].sort(compareByNextAiring)).toEqual([sooner, later, none]);
  });
});
