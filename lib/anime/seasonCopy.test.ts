import { describe, expect, it } from "vitest";
import { normalizeMedia } from "./normalize";
import {
  CONTINUING_TV_HIDDEN_TITLE,
  FORMAT_TITLES,
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
  formatChipLabel,
  formatList,
  formatsHiddenCopy,
  formatsHiddenNote,
  headingSr,
  hiddenLabel,
  landingSeasonStat,
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
import { FORMAT_KEYS, type FormatKey } from "./seasonFormats";
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
      "No Winter 2027 shows here yet. Adult titles are skipped; continuing series are TV only."
    );
    expect(seasonSageLine({ ...base, season: "summer", loaded: [], empty: true }).text).toBe(
      "No Summer 2026 shows here. Adult titles are skipped; continuing series are TV only."
    );
  });
});

describe("seasonSubScope", () => {
  it("names the lineup's scope, and drops continuing series when they didn't load", () => {
    expect(seasonSubScope("current", "Fall 2026", true)).toBe(
      "AniList's Fall 2026 lineup minus adult titles, plus TV series continuing from earlier seasons."
    );
    expect(seasonSubScope("upcoming", "Winter 2027", true)).toBe(
      "AniList's Winter 2027 lineup minus adult titles, plus TV series expected to continue into it."
    );
    expect(seasonSubScope("past", "Summer 2026", true)).toBe(
      "AniList's Summer 2026 lineup minus adult titles, plus TV series that continued into it."
    );
    expect(seasonSubScope("current", "Fall 2026", false)).toBe("AniList's Fall 2026 lineup minus adult titles.");
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

  it("counts shows in hidden formats apart, with the same lower-bound rule", () => {
    const base = { n: 70, exact: true, c: 21, capped: false, showContinuing: true };
    expect(headingSr({ ...base, hidden: 26 })).toBe(": 70, plus 21 continuing series; 26 more in hidden formats");
    expect(headingSr({ ...base, n: 40, exact: false, c: 0, hidden: 10 })).toBe(": at least 40; at least 10 more in hidden formats");
    expect(headingSr({ ...base, hidden: 0 })).toBe(": 70, plus 21 continuing series");
    expect(hiddenLabel(26, true)).toBe(" · 26 hidden");
    expect(hiddenLabel(10, false)).toBe(" · 10+ hidden");
    expect(hiddenLabel(0, true)).toBe("");
  });
});

describe("formats", () => {
  it("labels chips like the cards' pill, in AniList's order", () => {
    expect(FORMAT_KEYS.map(formatChipLabel)).toEqual(["TV", "TV Short", "Movie", "Special", "OVA", "ONA", "Music", "Other"]);
    expect(formatList(["ONA"])).toBe("ONA");
    expect(formatList(["TV_SHORT", "ONA"])).toBe("TV Short and ONA");
    expect(formatList(["TV", "MOVIE", "ONA"])).toBe("TV, Movie and ONA");
    for (const key of FORMAT_KEYS) expect(FORMAT_TITLES[key]).toMatch(/\.$/);
  });

  it("says why nothing is listed, about this page's data only", () => {
    const base = { label: "Fall 2026", n: 96, exact: true, formats: ["TV", "TV_SHORT", "MOVIE", "SPECIAL", "ONA"] as FormatKey[], cHidden: 0, capped: false };
    expect(formatsHiddenCopy(base)).toEqual({
      title: "No shows listed in these formats",
      text: "All 96 Fall 2026 shows here are in hidden formats: TV, TV Short, Movie, Special and ONA.",
    });
    expect(formatsHiddenCopy({ ...base, n: 50, exact: false, formats: ["TV", "MOVIE"] }).text).toBe(
      "The 50 Fall 2026 shows loaded are in hidden formats: TV and Movie."
    );
    expect(formatsHiddenCopy({ ...base, n: 1, formats: ["MOVIE"] }).text).toBe("The only Fall 2026 show here is in a hidden format: Movie.");
    expect(formatsHiddenCopy({ ...base, cHidden: 21 }).text).toMatch(/ 21 continuing TV series are hidden too\.$/);
    expect(formatsHiddenCopy({ ...base, n: 0, formats: [], cHidden: 21 }).text).toBe("21 continuing TV series are hidden with TV.");
    expect(formatsHiddenCopy({ ...base, n: 0, formats: [], cHidden: 50, capped: true }).text).toBe(
      "At least 50 continuing TV series are hidden with TV."
    );
    expect(formatsHiddenNote("Fall 2026", true)).toBe("Every Fall 2026 show here is in a hidden format. Continuing series are still listed.");
    expect(formatsHiddenNote("Fall 2026", false)).toMatch(/^Every Fall 2026 show loaded is/);
  });

  it("speaks what each chip leaves listed", () => {
    const base = { label: "Fall 2026", complete: true };
    expect(STATUS.formats({ ...base, key: "ONA", shown: false, n: 83, c: 21 })).toBe(
      "ONA hidden. 83 Fall 2026 shows listed, plus 21 continuing series."
    );
    expect(STATUS.formats({ ...base, key: "ONA", shown: true, n: 62, c: 0, complete: false })).toBe(
      "ONA shown. 62 Fall 2026 shows listed so far."
    );
    expect(STATUS.formats({ ...base, key: "TV", shown: false, n: 26, c: 0, tvContinuing: 21 })).toBe(
      "TV hidden, and the 21 continuing series with it. 26 Fall 2026 shows listed."
    );
    expect(STATUS.formats({ ...base, key: "TV", shown: true, n: 96, c: 21, tvContinuing: 21 })).toBe(
      "TV shown, with the 21 continuing series. 96 Fall 2026 shows listed."
    );
    expect(STATUS.formats({ ...base, key: "SPECIAL", shown: false, n: 0, c: 0 })).toBe(
      "Special hidden. None of the Fall 2026 shows loaded is in the chosen formats."
    );
    expect(STATUS.formats({ ...base, key: "MOVIE", shown: false, n: 0, c: 21 })).toBe(
      "Movie hidden. None of the Fall 2026 shows loaded is in the chosen formats; 21 continuing series listed."
    );
    expect(STATUS.formats({ ...base, key: "TV", shown: false, n: 1, c: 0 })).toBe("TV hidden. 1 Fall 2026 show listed.");
    expect(STATUS.formats({ ...base, key: null, shown: true, n: 96, c: 21 })).toBe(
      "Every format shown. 96 Fall 2026 shows listed, plus 21 continuing series."
    );
    expect(STATUS.continuingNeedsTv(true)).toBe("Continuing series are TV series. Show TV to list them.");
    // Their toggle is off too: showing TV alone wouldn't list them.
    expect(STATUS.continuingNeedsTv(false)).toBe("Continuing series are TV series. Show TV, then turn them on.");
    expect(CONTINUING_TV_HIDDEN_TITLE(false)).toBe("Continuing series are TV series: show TV, then turn them on");
    // "Show every format" on a season with no season shows says only what's listed.
    expect(STATUS.formats({ ...base, key: null, shown: true, n: 0, c: 30 })).toBe("Every format shown. 30 continuing series listed.");
    expect(STATUS.formats({ ...base, key: null, shown: true, n: 0, c: 0 })).toBe("Every format shown.");
  });

  it("gives the landing the season page's scope", () => {
    const base = { label: "Fall 2026", showCount: "96", continuingCount: 21, continuingCapped: false, preview: false };
    expect(landingSeasonStat(base)).toBe(
      "AniList lists 96 Fall 2026 shows, excluding adult titles, plus 21 TV series continuing from earlier seasons."
    );
    expect(landingSeasonStat({ ...base, continuingCapped: true })).toMatch(/plus at least 21 TV series continuing/);
    expect(landingSeasonStat({ ...base, label: "Winter 2027", showCount: "49", continuingCount: 15, preview: true })).toBe(
      "AniList lists 49 Winter 2027 shows, excluding adult titles, plus 15 TV series expected to continue from earlier seasons."
    );
    expect(landingSeasonStat({ ...base, continuingCount: null })).toBe("AniList lists 96 Fall 2026 shows, excluding adult titles.");
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
      report: "All 72 of AniList's Fall 2026 shows sensed, excluding adult titles.",
      hidden: null,
      continuing: "Plus 21 continuing TV series.",
    });
    expect(endCardText({ ...base, n: 1 }).report).toBe("AniList's only Fall 2026 show sensed, excluding adult titles.");
    expect(endCardText({ ...base, capped: true }).continuing).toBe("Plus at least 21 continuing TV series.");
    expect(endCardText({ ...base, showContinuing: false }).continuing).toBe("21 continuing TV series are hidden.");
    expect(endCardText({ ...base, showContinuing: false, c: 1 }).continuing).toBe("1 continuing TV series is hidden.");
    expect(endCardText({ ...base, c: 0 }).continuing).toBeNull();
    expect(endCardText({ ...base, carryOverIncluded: false }).continuing).toBe(
      "Continuing series didn't load from AniList."
    );
    expect(endCardText({ ...base, orderShifted: true }).report).toBe(
      "72 Fall 2026 shows loaded. AniList's order shifted, so some may be missing."
    );
    expect(endCardText({ ...base, n: 0 })).toEqual({
      report: "All 21 continuing TV series sensed, excluding adult titles.",
      hidden: null,
      continuing: null,
    });
    expect(endCardText({ ...base, n: 0, capped: true }).report).toBe("21+ continuing TV series sensed. AniList may list more.");
    // Formats hidden: the report still counts every season show; a line says how many are hidden.
    const hiding = { ...base, n: 96 };
    expect(endCardText({ ...hiding, hidden: 26, hiddenFormats: ["TV_SHORT", "ONA"] }).hidden).toBe(
      "26 of them are in hidden formats: TV Short and ONA."
    );
    expect(endCardText({ ...hiding, hidden: 13, hiddenFormats: ["ONA"] }).hidden).toBe("13 of them are in a hidden format: ONA.");
    expect(endCardText({ ...hiding, hidden: 1, hiddenFormats: ["SPECIAL"] }).hidden).toBe("1 of them is in a hidden format: Special.");
    expect(endCardText({ ...hiding, hidden: 96, hiddenFormats: ["TV", "ONA"] }).hidden).toBe("All 96 are in hidden formats: TV and ONA.");
    expect(endCardText({ ...base, n: 1, hidden: 1, hiddenFormats: ["MOVIE"] }).hidden).toBe("It's in a hidden format: Movie.");
    expect(endCardText({ ...hiding, hidden: 70, hiddenFormats: ["TV"], continuingHiddenWithTv: true }).continuing).toBe(
      "21 continuing TV series are hidden with TV."
    );
    expect(endCardText({ ...base, n: 0, continuingHiddenWithTv: true }).continuing).toBe("21 of them are hidden with TV.");
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
      text: "Shows appear here as AniList lists them. Adult titles are skipped; continuing series are TV only.",
    });
    expect(emptyCopy("past", false).text).toBe(
      "Adult titles are skipped; continuing series are TV only. Continuing series didn't load from AniList."
    );
    expect(continuingHiddenCopy("current", 3, false)).toEqual({
      title: "No new shows here yet",
      text: "3 continuing TV series are hidden. This page skips adult titles.",
    });
    expect(continuingHiddenCopy("past", 50, true).text).toMatch(/^At least 50 continuing TV series are hidden\./);
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
        for (const [hidden, hiddenFormats] of [[0, []], [1, ["SPECIAL"]], [26, ["TV_SHORT", "ONA"]], [n, ["TV"]]] as [number, FormatKey[]][]) {
          if (hidden > n) continue;
          for (const showContinuing of [true, false]) {
            for (const continuingHiddenWithTv of [false, true]) {
              const card = endCardText({ label: "Fall 2026", n, c: 21, capped, orderShifted: false, showContinuing, carryOverIncluded: true, hidden, hiddenFormats, continuingHiddenWithTv });
              outputs.push(card.report, card.hidden ?? "", card.continuing ?? "");
              // A hidden line names only formats holding hidden shows, and only when some are hidden.
              expect(card.hidden === null).toBe(hidden === 0 || n === 0);
            }
          }
        }
      }
    }
    for (const n of [0, 1, 50, 96]) {
      for (const exact of [true, false]) {
        for (const cHidden of [0, 1, 21]) {
          if (n === 0 && cHidden === 0) continue;
          const panel = formatsHiddenCopy({ label: "Fall 2026", n, exact, formats: n ? ["TV", "ONA"] : [], cHidden, capped: false });
          outputs.push(panel.title, panel.text);
          // Not a total unless every page loaded: "loaded" qualifies it.
          if (!exact && n > 0) expect(panel.text).toMatch(/ loaded /);
        }
      }
    }
    outputs.push(seasonDescription(2026, "fall"));
    for (const preview of [true, false]) {
      for (const continuingCount of [null, 21]) {
        outputs.push(landingSeasonStat({ label: "Fall 2026", showCount: "96", continuingCount, continuingCapped: false, preview }));
      }
    }
    for (const text of outputs) {
      expect(text).not.toMatch(/AniList lists no/);
      expect(text).not.toMatch(/TBA/);
      // The old scope is gone everywhere.
      expect(text).not.toMatch(/ONAs, TV shorts/);
      if (/^All \d+ .*sensed/.test(text) || /^AniList's only/.test(text)) expect(text).toContain(LINEUP_EXCLUDING);
      // Season totals are AniList's filing (it files some ONAs under no season).
      if (/^All \d+ .*shows sensed/.test(text)) expect(text).toContain("of AniList's");
      // Continuing series are fetched as TV only: every count of them says so.
      if (/\d+\+? continuing/.test(text) || /continuing series sensed/.test(text)) expect(text).toMatch(/continuing TV series|TV series continuing|TV series expected/);
    }
  });

  it("status messages", () => {
    expect(STATUS.continuing(true, 14, "Fall 2026")).toBe("Showing 14 continuing series.");
    expect(STATUS.continuing(true, 0, "Fall 2026")).toBe("Continuing series appear as more of Fall 2026 loads.");
    expect(STATUS.continuing(false, 14, "Fall 2026")).toBe("Continuing series hidden.");
    expect(STATUS.sorted("countdown")).toBe("Sorted by countdown.");
  });
});
