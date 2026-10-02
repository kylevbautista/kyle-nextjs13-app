import { describe, expect, it } from "vitest";
import {
  airingStatusLabel,
  airingWeekday,
  compareByNextAiring,
  formatAirDate,
  formatCountdown,
  isPremiereNext,
  nextAiring,
  premiereAiring,
  premiereLabel,
  secondsUntil,
  unloggedAired,
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

describe("premiereAiring / isPremiereNext", () => {
  const conan = {
    status: "RELEASING",
    startDate: { year: 1996, month: 1, day: 8 },
    // AniList's earliest schedule node is EP 1067 (Dec 24, 2022), not the premiere.
    firstEpisode: { episode: [{ airingAt: Date.UTC(2022, 11, 24, 9) / 1000, episode: 1067 }] },
    upComingAirDate: { episode: [{ airingAt: THU_MORNING, episode: 1180 }] },
  };

  it("ignores an earliest node that isn't the first episode", () => {
    expect(premiereAiring(conan)).toBeNull();
    expect(premiereLabel(conan)).toBe("Jan 8, 1996");
    expect(isPremiereNext(conan)).toBe(false);
  });

  it("trusts episode 1, and any node of a show that hasn't aired", () => {
    const fresh = {
      status: "RELEASING",
      startDate: { year: 2026, month: 10, day: 1 },
      firstEpisode: { episode: [{ airingAt: THU_MORNING, episode: 1 }] },
    };
    expect(premiereLabel(fresh)).toBe("Oct 1, 2026, 9:30 AM PDT");
    // A second cour numbered from 13, not aired yet.
    const cour2 = {
      status: "NOT_YET_RELEASED",
      startDate: { year: 2026, month: 10, day: 1 },
      firstEpisode: { episode: [{ airingAt: THU_EVENING_PT, episode: 13 }] },
      upComingAirDate: { episode: [{ airingAt: THU_EVENING_PT, episode: 13 }] },
    };
    expect(premiereAiring(cour2)).toEqual({ airingAt: THU_EVENING_PT, episode: 13 });
    expect(premiereLabel(cour2)).toBe("Oct 1, 2026, 5:30 PM PDT");
    expect(isPremiereNext(cour2)).toBe(true);
  });

  it("is a premiere when the next episode is episode 1", () => {
    expect(isPremiereNext({ upComingAirDate: { episode: [{ airingAt: THU_MORNING, episode: 1 }] } })).toBe(true);
    expect(isPremiereNext({ upComingAirDate: { episode: [{ airingAt: THU_MORNING, episode: 2 }] } })).toBe(false);
    expect(isPremiereNext({ upComingAirDate: { episode: [] } })).toBe(false);
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

describe("unloggedAired", () => {
  const show = (next: { episode: number; airingAt: number } | null, progress: number, extra = {}) => ({
    status: "RELEASING" as const,
    episodes: null as number | null,
    upComingAirDate: { episode: next ? [{ ...next, timeUntilAiring: 0 }] : [] },
    userData: { listType: "watching" as const, episodeProgressNumber: progress },
    ...extra,
  });

  it("counts aired episodes the viewer hasn't logged", () => {
    // EP 1215 is next, so 1214 have aired; 1212 logged.
    expect(unloggedAired(show({ episode: 1215, airingAt: THU_MORNING }, 1212), null)).toBe(2);
    expect(unloggedAired(show({ episode: 13, airingAt: THU_MORNING }, 12), null)).toBe(0);
    // Logged ahead of the schedule: caught up, never negative.
    expect(unloggedAired(show({ episode: 3, airingAt: THU_MORNING }, 9), null)).toBe(0);
  });

  it("adds the next episode once its air time passes (live clock only)", () => {
    const media = show({ episode: 5, airingAt: THU_MORNING }, 4);
    expect(unloggedAired(media, null)).toBe(0);
    expect(unloggedAired(media, (THU_MORNING - 60) * 1000)).toBe(0);
    expect(unloggedAired(media, THU_MORNING * 1000)).toBe(1);
  });

  it("only applies to shows being watched, with a numbered next episode", () => {
    const next = { episode: 5, airingAt: THU_MORNING };
    expect(unloggedAired({ ...show(next, 0), userData: { listType: "paused", episodeProgressNumber: 2 } }, null)).toBe(2);
    expect(unloggedAired({ ...show(next, 0), userData: { listType: "planning", episodeProgressNumber: 0 } }, null)).toBeNull();
    expect(unloggedAired({ ...show(next, 0), userData: { listType: "completed", episodeProgressNumber: 12 } }, null)).toBeNull();
    expect(unloggedAired(show(null, 3), null)).toBeNull();
  });

  it("keeps counting once the finale has aired (finished shows)", () => {
    const finished = { ...show(null, 9, { status: "FINISHED", episodes: 12 }) };
    expect(unloggedAired(finished, null)).toBe(3);
    expect(unloggedAired({ ...finished, episodes: null }, null)).toBeNull();
  });

  it("refuses counts the episode total contradicts", () => {
    // A split cour numbered continuously: "EP 14" of a 12-episode entry.
    expect(unloggedAired(show({ episode: 14, airingAt: THU_MORNING }, 0, { episodes: 12 }), null)).toBeNull();
    expect(unloggedAired(show({ episode: 12, airingAt: THU_MORNING }, 5, { episodes: 12 }), null)).toBe(6);
  });
});
