import { describe, expect, it } from "vitest";
import { normalizeMedia } from "./normalize";
import {
  LINEUP_EXCLUDING,
  MAGIC_SENSE_LINE,
  STATUS,
  continuingHiddenCopy,
  continuingLabel,
  countLabel,
  dividerText,
  emptyCopy,
  endCardNote,
  endCardText,
  headingSr,
  loadErrorText,
  nextUpResting,
  nextUpRows,
  onlyContinuingCopy,
  seasonDescription,
  seasonPhase,
  seasonSageLine,
  seasonSubScope,
  sortHint,
  spokenContinuing,
  spokenCount,
} from "./seasonCopy";
import { seasonWindow } from "./seasonOrder";
import type { AnimeMedia } from "./types";

const FALL_START = Date.UTC(2026, 9, 1);
const NOW = Date.UTC(2026, 9, 2, 12); // Fall 2026, day 2
const show = (id: number, airingAt: number | null = null, popularity = 100): AnimeMedia => {
  const item = normalizeMedia({
    id,
    title: { romaji: `Show ${id}`, english: null, native: null },
    popularity,
    upComingAirDate: { episode: airingAt ? [{ airingAt, episode: 2 }] : [] },
  });
  if (!item) throw new Error("bad fixture");
  return item;
};

describe("seasonPhase", () => {
  it("flips at the season's first and last instant", () => {
    expect(seasonPhase(2026, "fall", FALL_START - 1)).toBe("upcoming");
    expect(seasonPhase(2026, "fall", FALL_START)).toBe("current");
    expect(seasonPhase(2026, "fall", Date.UTC(2027, 0, 1))).toBe("past");
  });
});

describe("seasonSageLine", () => {
  const base = { year: 2026, season: "fall" as const, nowMs: NOW, empty: false };

  it("current season: the landing's line while an episode is incoming (30 min grace)", () => {
    expect(seasonSageLine({ ...base, loaded: [show(1, NOW / 1000 - 29 * 60)] })).toEqual({
      kind: "Notice",
      text: MAGIC_SENSE_LINE,
    });
    expect(seasonSageLine({ ...base, loaded: [show(1, NOW / 1000 - 31 * 60), show(2)] }).text).toBe(
      "Magic Sense active. Air dates appear as AniList schedules them."
    );
  });

  it("upcoming, past and empty seasons", () => {
    const upcoming = { ...base, year: 2027, season: "winter" as const };
    expect(seasonSageLine({ ...upcoming, loaded: [show(1, NOW / 1000 + 3600)] }).text).toBe(
      "Winter 2027 starts January 1. Incoming episodes detected."
    );
    expect(seasonSageLine({ ...upcoming, loaded: [show(1)] }).text).toBe(
      "Winter 2027 starts January 1. Countdowns appear once AniList schedules episodes."
    );
    expect(seasonSageLine({ ...base, season: "summer", loaded: [show(1)] })).toEqual({
      kind: "Report",
      text: "Summer 2026 has ended. Magic Sense is reading the archive.",
    });
    expect(seasonSageLine({ ...upcoming, loaded: [], empty: true }).text).toBe(
      "No Winter 2027 shows here yet. This page skips ONAs, TV shorts and adult titles."
    );
    expect(seasonSageLine({ ...base, season: "summer", loaded: [], empty: true }).text).toBe(
      "No Summer 2026 shows here. This page skips ONAs, TV shorts and adult titles."
    );
  });
});

describe("seasonSubScope", () => {
  it("names the lineup's scope, and drops continuing series when they didn't load", () => {
    expect(seasonSubScope("current", "Fall 2026", true)).toBe(
      "AniList's Fall 2026 lineup minus ONAs, TV shorts and adult titles, plus series continuing from earlier seasons."
    );
    expect(seasonSubScope("upcoming", "Winter 2027", true)).toMatch(/expected to continue into it\.$/);
    expect(seasonSubScope("past", "Summer 2026", true)).toMatch(/that continued into it\.$/);
    expect(seasonSubScope("current", "Fall 2026", false)).toBe(
      "AniList's Fall 2026 lineup minus ONAs, TV shorts and adult titles."
    );
  });
});

describe("nextUpRows / nextUpResting", () => {
  const win = seasonWindow(2026, "fall");
  it("keeps in-season episodes within the grace, soonest first then popularity", () => {
    const rows = nextUpRows(
      [
        show(1, NOW / 1000 + 7200, 10),
        show(2, NOW / 1000 - 31 * 60), // aired over 30 min ago
        show(3, NOW / 1000 + 3600, 5),
        show(4, NOW / 1000 + 3600, 50),
        show(5, Date.UTC(2027, 0, 3) / 1000), // after the season
        show(6),
      ],
      win,
      NOW
    );
    expect(rows.map((m) => m.id)).toEqual([4, 3, 1]);
    expect(nextUpResting("current", "Fall 2026")).toBe(
      "None of the shows below has an episode coming up before Fall 2026 ends."
    );
  });
});

describe("counts and heading", () => {
  it("marks lower bounds", () => {
    expect(countLabel(50, false)).toBe("50+");
    expect(countLabel(72, true)).toBe("72");
    expect(spokenCount(50, false)).toBe("at least 50");
    expect(continuingLabel(21, true)).toBe("21+");
    expect(spokenContinuing(21, false)).toBe("21");
  });

  it("speaks continuing series only when they're shown and known", () => {
    const base = { n: 72, exact: true, c: 21, capped: false, showContinuing: true };
    expect(headingSr(base)).toBe(": 72, plus 21 continuing series");
    expect(headingSr({ ...base, capped: true })).toBe(": 72, plus at least 21 continuing series");
    expect(headingSr({ ...base, showContinuing: false })).toBe(": 72");
    expect(headingSr({ ...base, c: 0, exact: false, n: 50 })).toBe(": at least 50");
  });
});

describe("sortHint", () => {
  const base = { sort: "countdown" as const, anyInSeason: true, phase: "current" as const, label: "Fall 2026" };
  it("explains each order", () => {
    expect(sortHint(base)).toBe("Soonest Fall 2026 episode first, the rest by popularity.");
    expect(sortHint({ ...base, sort: "popularity" })).toMatch(/^Most popular on AniList first/);
    expect(sortHint({ ...base, anyInSeason: false, phase: "past", label: "Summer 2026" })).toBe(
      "Summer 2026 has ended, so countdown order matches popularity."
    );
    expect(sortHint({ ...base, anyInSeason: false })).toBe(
      "None of these shows has its next episode in Fall 2026, so this matches popularity order."
    );
    expect(sortHint({ ...base, anyInSeason: false, phase: "upcoming" })).toMatch(/in Fall 2026 yet, so/);
  });
});

describe("grid notices", () => {
  it("divider and load error", () => {
    expect(dividerText(1)).toBe("1 show below airs sooner than some above. Re-sort to put them in order.");
    expect(dividerText(2)).toBe("2 shows below air sooner than some above. Re-sort to put them in order.");
    expect(loadErrorText("Fall 2026", 71)).toBe(
      "Couldn't load the rest of Fall 2026 from AniList. Showing 71 shows so far."
    );
    expect(loadErrorText("Fall 2026", 1)).toMatch(/Showing 1 show so far\.$/);
  });

  const base = {
    label: "Fall 2026",
    n: 72,
    c: 21,
    capped: false,
    orderShifted: false,
    showContinuing: true,
    carryOverIncluded: true,
  };
  it("end card", () => {
    expect(endCardText(base)).toEqual({
      report: "All 72 Fall 2026 shows sensed, excluding ONAs, TV shorts and adult titles.",
      continuing: "Plus 21 continuing series.",
    });
    expect(endCardText({ ...base, n: 1 }).report).toBe(
      "The only Fall 2026 show sensed, excluding ONAs, TV shorts and adult titles."
    );
    expect(endCardText({ ...base, capped: true }).continuing).toBe("Plus at least 21 continuing series.");
    expect(endCardText({ ...base, showContinuing: false }).continuing).toBe("21 continuing series are hidden.");
    expect(endCardText({ ...base, showContinuing: false, c: 1 }).continuing).toBe("1 continuing series is hidden.");
    expect(endCardText({ ...base, c: 0 }).continuing).toBeNull();
    expect(endCardText({ ...base, carryOverIncluded: false }).continuing).toBe(
      "Continuing series didn't load from AniList."
    );
    expect(endCardText({ ...base, orderShifted: true }).report).toBe(
      "72 Fall 2026 shows loaded. AniList's order shifted, so some may be missing."
    );
    expect(endCardText({ ...base, n: 0 })).toEqual({
      report: "All 21 continuing series sensed, excluding ONAs, TV shorts and adult titles.",
      continuing: null,
    });
    expect(endCardText({ ...base, n: 0, capped: true }).report).toBe(
      "21+ continuing series sensed. AniList may list more."
    );
    expect(endCardNote(Date.UTC(2026, 9, 1, 16, 30), false)).toBe(
      "AniList data from Oct 1, 2026, 9:30 AM PDT or later."
    );
    expect(endCardNote(Date.UTC(2026, 9, 1, 16, 30), true)).toMatch(/^Reload to recount\. /);
  });
});

describe("empty states", () => {
  it("are claims about this page, with the lineup's scope", () => {
    expect(emptyCopy("upcoming", true)).toEqual({
      title: "No shows here yet",
      text: "Shows appear here as AniList lists them. This page skips ONAs, TV shorts and adult titles.",
    });
    expect(emptyCopy("past", false).text).toBe(
      "This page skips ONAs, TV shorts and adult titles. Continuing series didn't load from AniList."
    );
    expect(continuingHiddenCopy("current", 3, false)).toEqual({
      title: "No new shows here yet",
      text: "3 continuing series are hidden. This page skips ONAs, TV shorts and adult titles.",
    });
    expect(continuingHiddenCopy("past", 50, true).text).toMatch(/^At least 50 continuing series are hidden\./);
    expect(onlyContinuingCopy("upcoming", "Winter 2027")).toBe(
      "No new Winter 2027 shows here yet. These series are expected to continue into it."
    );
  });
});

describe("truth sweep", () => {
  it("no total without the lineup's scope, no 'AniList lists no', no TBA", () => {
    const outputs: string[] = [];
    for (const phase of ["upcoming", "current", "past"] as const) {
      for (const included of [true, false]) {
        const empty = emptyCopy(phase, included);
        outputs.push(empty.title, empty.text, seasonSubScope(phase, "Fall 2026", included));
      }
      outputs.push(onlyContinuingCopy(phase, "Fall 2026"));
      for (const capped of [true, false]) outputs.push(continuingHiddenCopy(phase, 4, capped).text);
    }
    for (const n of [0, 1, 72]) {
      for (const capped of [true, false]) {
        const card = endCardText({ label: "Fall 2026", n, c: 21, capped, orderShifted: false, showContinuing: true, carryOverIncluded: true });
        outputs.push(card.report, card.continuing ?? "");
      }
    }
    outputs.push(seasonDescription(2026, "fall"));
    for (const text of outputs) {
      expect(text).not.toMatch(/AniList lists no/);
      expect(text).not.toMatch(/TBA/);
      if (/^All \d+ .*sensed/.test(text) || /^The only/.test(text)) expect(text).toContain(LINEUP_EXCLUDING);
    }
  });

  it("status messages", () => {
    expect(STATUS.continuing(true, 14, "Fall 2026")).toBe("Showing 14 continuing series.");
    expect(STATUS.continuing(true, 0, "Fall 2026")).toBe("Continuing series appear as more of Fall 2026 loads.");
    expect(STATUS.continuing(false, 14, "Fall 2026")).toBe("Continuing series hidden.");
    expect(STATUS.sorted("countdown")).toBe("Sorted by countdown.");
  });
});
